/**
 * Persisted-state migrations for the component store.
 * Pure: no Zustand, no AsyncStorage, no "@/" runtime imports.
 */
import type { ComponentData } from '../../types/component.types';
import type { AreaData, AreaPiece, PlanningData, PlantingData, Season, SeasonPlanData, SeasonStatus } from '../../types/planning.types';
import { areaDataSchema, areaPieceSchema, plantingDataSchema } from '../../schemas/planningSchema.ts';
import { roadDataSchema } from '../../schemas/roadSchema.ts';

/**
 * Version 2: canvas position and rotation removed from components.
 * Version 3: week-based planning (placed plants with growing periods, plants to plan).
 * Version 4: plants live in plannings per year and season; plantings from
 * version 3 and before were dropped; version 4 plannings are converted in version 5.
 * Version 5: plants have plantings (one per start season); ratios and placements belong to plantings. v4 plannings are converted.
 * Version 6: plantings get areas instead of placements; placements are dropped and planned seasons become outdated.
 * Version 7: garden boxes have roads; invalid roads are dropped.
 */
export const COMPONENT_STORE_VERSION = 7;

export interface PersistedComponentState {
  components: ComponentData[];
}

const EMPTY_STATE: PersistedComponentState = { components: [] };
const YEAR_KEY = /^\d{4}$/;
const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];
const STATUSES: readonly SeasonStatus[] = ['notPlanned', 'planned', 'outdated'];
const EMPTY_SEASON: SeasonPlanData = { ratios: {}, areas: [], status: 'notPlanned' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripCanvasFields(component: Record<string, unknown>): Record<string, unknown> {
  const { positionX: _x, positionY: _y, rotation: _r, ...rest } = component;
  return rest;
}

/** The valid pieces of a stored area (at most three), or null when none is valid */
function salvagePieces(value: unknown): AreaPiece[] | null {
  const entries = Array.isArray(value) ? value : [];
  const pieces = entries.flatMap((entry) => {
    const parsed = areaPieceSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
  return pieces.length === 0 ? null : pieces.slice(0, 3);
}

/** Valid areas of known plantings of the same plant; at most one per planting; invalid pieces dropped */
function salvageAreas(value: unknown, plantOfPlanting: ReadonlyMap<string, string>): { areas: AreaData[]; droppedAny: boolean } {
  const entries = Array.isArray(value) ? value : [];
  const areas: AreaData[] = [];
  let droppedAny = false;
  for (const entry of entries) {
    const base = isRecord(entry) ? areaDataSchema.omit({ pieces: true }).safeParse(entry) : null;
    const pieces = isRecord(entry) ? salvagePieces(entry.pieces) : null;
    const usable =
      base !== null && base.success && pieces !== null && plantOfPlanting.get(base.data.plantingId) === base.data.plantId && !areas.some((area) => area.plantingId === base.data.plantingId);
    if (!usable) {
      droppedAny = true;
      continue;
    }
    if (pieces.length < (entry as { pieces: unknown[] }).pieces.length) droppedAny = true;
    areas.push({ ...base.data, pieces });
  }
  return { areas, droppedAny };
}

/** Valid ratios (whole, >= 1) of known plantings; areas are salvaged from v6 data and dropped from older data */
function salvageSeason(value: unknown, plantOfPlanting: ReadonlyMap<string, string>, legacy: boolean): SeasonPlanData {
  if (!isRecord(value)) {
    return EMPTY_SEASON;
  }
  const ratioEntries = isRecord(value.ratios) ? Object.entries(value.ratios) : [];
  const ratios = Object.fromEntries(
    ratioEntries.filter(([id, ratio]) => plantOfPlanting.has(id) && Number.isInteger(ratio) && (ratio as number) >= 1),
  ) as Record<string, number>;
  const { areas, droppedAny: droppedArea } = legacy ? { areas: [], droppedAny: true } : salvageAreas(value.areas, plantOfPlanting);
  const status = STATUSES.find((candidate) => candidate === value.status) ?? 'notPlanned';
  const droppedAny = Object.keys(ratios).length < ratioEntries.length || droppedArea;
  return { ratios, areas, status: droppedAny && status === 'planned' ? 'outdated' : status };
}

/**
 * A v4 planning keyed ratios and placements by plant id per season: each
 * plant with a ratio or placements in season S becomes planting "<plantId>-<S>".
 */
function withPlantingsFromV4(value: Record<string, unknown>, plants: string[]): Record<string, unknown> {
  const seasons = isRecord(value.seasons) ? value.seasons : {};
  const plantings: PlantingData[] = [];
  const converted: Record<string, unknown> = {};
  for (const season of SEASONS) {
    const plan = isRecord(seasons[season]) ? seasons[season] : {};
    const ratios = isRecord(plan.ratios) ? plan.ratios : {};
    const placements = Array.isArray(plan.placements) ? plan.placements.filter(isRecord) : [];
    const plantIds = [...new Set([...Object.keys(ratios), ...placements.map((p) => p.plantId).filter((id): id is string => typeof id === 'string')])];
    for (const plantId of plantIds) {
      plantings.push({ id: `${plantId}-${season}`, plantId, startSeason: season });
      if (!plants.includes(plantId)) plants.push(plantId);
    }
    converted[season] = {
      ...plan,
      ratios: Object.fromEntries(Object.entries(ratios).map(([plantId, ratio]) => [`${plantId}-${season}`, ratio])),
      placements: placements.map((p) => ({ ...p, plantingId: `${String(p.plantId)}-${season}` })),
    };
  }
  return { ...value, plantings, seasons: converted };
}

/** Salvages one year: null when it has no usable plants list or seasons */
function salvagePlanning(value: unknown, legacy: boolean): PlanningData | null {
  if (!isRecord(value) || !Array.isArray(value.plants) || !isRecord(value.seasons)) {
    return null;
  }
  const plants = value.plants.filter((plant): plant is string => typeof plant === 'string' && plant.length > 0);
  const droppedPlant = plants.length < value.plants.length;
  const current = Array.isArray(value.plantings) ? value : withPlantingsFromV4(value, plants);
  const plantingEntries = Array.isArray(current.plantings) ? current.plantings : [];
  const plantOfPlanting = new Map<string, string>();
  const plantings: PlantingData[] = plantingEntries.flatMap((entry) => {
    const parsed = plantingDataSchema.safeParse(entry);
    if (!parsed.success || plantOfPlanting.has(parsed.data.id)) return [];
    plantOfPlanting.set(parsed.data.id, parsed.data.plantId);
    return [parsed.data];
  });
  const seasons = isRecord(current.seasons) ? current.seasons : {};
  const salvaged = SEASONS.map((season) => salvageSeason(seasons[season], plantOfPlanting, legacy));
  const outdateAll = droppedPlant || plantings.length < plantingEntries.length;
  const [spring, summer, autumn, winter] = outdateAll
    ? salvaged.map((season) => (season.status === 'planned' ? { ...season, status: 'outdated' as const } : season))
    : salvaged;
  return { plants, plantings, seasons: { spring, summer, autumn, winter } };
}

/** The stored plannings that can be salvaged, entry by entry; others are dropped */
function validPlannings(value: unknown, legacy: boolean): Record<string, PlanningData> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([year, data]): [string, PlanningData][] => {
      const planning = YEAR_KEY.test(year) ? salvagePlanning(data, legacy) : null;
      return planning === null ? [] : [[year, planning]];
    }),
  );
}

/** Drops the week-planning fields and keeps only valid plannings */
function withPlannings(component: Record<string, unknown>, legacy: boolean): Record<string, unknown> {
  const { plants: _plants, plantsToPlan: _plantsToPlan, plannings, ...rest } = component;
  return { ...rest, plannings: validPlannings(plannings, legacy) };
}

/** The valid roads of a garden box, one entry at a time, without duplicate ids; other components have none */
function withRoads(component: Record<string, unknown>): Record<string, unknown> {
  const { roads, ...rest } = component;
  if (component.type !== 'gardenBox') {
    return rest;
  }
  const seen = new Set<string>();
  const salvaged = (Array.isArray(roads) ? roads : []).flatMap((entry) => {
    const parsed = roadDataSchema.safeParse(entry);
    if (!parsed.success || seen.has(parsed.data.id)) return [];
    seen.add(parsed.data.id);
    return [parsed.data];
  });
  return { ...rest, roads: salvaged };
}

export function migrateComponentState(persistedState: unknown, version: number): PersistedComponentState {
  if (!isRecord(persistedState) || !Array.isArray(persistedState.components)) {
    return EMPTY_STATE;
  }
  const components = persistedState.components.filter(isRecord);
  const withoutCanvas = version < 2 ? components.map(stripCanvasFields) : components;
  return { components: withoutCanvas.map((component) => withRoads(withPlannings(component, version < 6))) as unknown as ComponentData[] };
}

/**
 * Merge persisted state into the live store state. Zustand only runs
 * `migrate` on a version mismatch, so this guards a current-version blob
 * that is malformed as well. Actions on `currentState` are preserved.
 */
export function mergePersistedComponentState<T extends PersistedComponentState>(persistedState: unknown, currentState: T): T {
  return {
    ...currentState,
    ...migrateComponentState(persistedState, COMPONENT_STORE_VERSION),
  };
}
