/**
 * Persisted-state migrations for the component store.
 * Pure: no Zustand, no AsyncStorage, no "@/" runtime imports.
 */
import type { ComponentData } from '../../types/component.types';
import type { PlacementData, PlanningData, PlantingData, Season, SeasonPlanData, SeasonStatus } from '../../types/planning.types';
import { placementDataSchema, plantingDataSchema } from '../../schemas/planningSchema.ts';

/**
 * Version 2: canvas position and rotation removed from components.
 * Version 3: week-based planning (placed plants with growing periods, plants to plan).
 * Version 4: plants live in plannings per year and season; plantings from
 * version 3 and before are not converted.
 * Version 5: plants have plantings (one per start season); ratios and placements belong to plantings. v4 plannings are converted.
 */
export const COMPONENT_STORE_VERSION = 5;

export interface PersistedComponentState {
  components: ComponentData[];
}

const EMPTY_STATE: PersistedComponentState = { components: [] };
const YEAR_KEY = /^\d{4}$/;
const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];
const STATUSES: readonly SeasonStatus[] = ['notPlanned', 'planned', 'outdated'];
const EMPTY_SEASON: SeasonPlanData = { ratios: {}, placements: [], status: 'notPlanned' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripCanvasFields(component: Record<string, unknown>): Record<string, unknown> {
  const { positionX: _x, positionY: _y, rotation: _r, ...rest } = component;
  return rest;
}

interface SalvagedSeason {
  readonly plan: SeasonPlanData;
  readonly droppedAny: boolean;
}

/** Valid ratios (whole, ≥ 1) of known plantings and valid placements of known plantings */
function salvageSeason(value: unknown, knownPlanting: (plantingId: string) => boolean): SalvagedSeason {
  if (!isRecord(value)) {
    return { plan: EMPTY_SEASON, droppedAny: false };
  }
  const ratioEntries = isRecord(value.ratios) ? Object.entries(value.ratios) : [];
  const ratios = Object.fromEntries(
    ratioEntries.filter(([id, ratio]) => knownPlanting(id) && Number.isInteger(ratio) && (ratio as number) >= 1),
  ) as Record<string, number>;
  const placementEntries = Array.isArray(value.placements) ? value.placements : [];
  const placements: PlacementData[] = placementEntries.flatMap((entry) => {
    const parsed = placementDataSchema.safeParse(entry);
    return parsed.success && knownPlanting(parsed.data.plantingId) ? [parsed.data] : [];
  });
  const status = STATUSES.find((candidate) => candidate === value.status) ?? 'notPlanned';
  const droppedAny = Object.keys(ratios).length < ratioEntries.length || placements.length < placementEntries.length;
  return { plan: { ratios, placements, status: droppedAny && status === 'planned' ? 'outdated' : status }, droppedAny };
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
function salvagePlanning(value: unknown): PlanningData | null {
  if (!isRecord(value) || !Array.isArray(value.plants) || !isRecord(value.seasons)) {
    return null;
  }
  const plants = value.plants.filter((plant): plant is string => typeof plant === 'string' && plant.length > 0);
  const droppedPlant = plants.length < value.plants.length;
  const current = Array.isArray(value.plantings) ? value : withPlantingsFromV4(value, plants);
  const plantingEntries = Array.isArray(current.plantings) ? current.plantings : [];
  const plantings: PlantingData[] = plantingEntries.flatMap((entry) => {
    const parsed = plantingDataSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
  const known = new Set(plantings.map((p) => p.id));
  const seasons = isRecord(current.seasons) ? current.seasons : {};
  const salvaged = SEASONS.map((season) => salvageSeason(seasons[season], (id) => known.has(id)).plan);
  const outdateAll = droppedPlant || plantings.length < plantingEntries.length;
  const [spring, summer, autumn, winter] = outdateAll
    ? salvaged.map((season) => (season.status === 'planned' ? { ...season, status: 'outdated' as const } : season))
    : salvaged;
  return { plants, plantings, seasons: { spring, summer, autumn, winter } };
}

/** The stored plannings that can be salvaged, entry by entry; others are dropped */
function validPlannings(value: unknown): Record<string, PlanningData> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([year, data]): [string, PlanningData][] => {
      const planning = YEAR_KEY.test(year) ? salvagePlanning(data) : null;
      return planning === null ? [] : [[year, planning]];
    }),
  );
}

/** Drops the week-planning fields and keeps only valid plannings */
function withPlannings(component: Record<string, unknown>): Record<string, unknown> {
  const { plants: _plants, plantsToPlan: _plantsToPlan, plannings, ...rest } = component;
  return { ...rest, plannings: validPlannings(plannings) };
}

export function migrateComponentState(persistedState: unknown, version: number): PersistedComponentState {
  if (!isRecord(persistedState) || !Array.isArray(persistedState.components)) {
    return EMPTY_STATE;
  }
  const components = persistedState.components.filter(isRecord);
  const withoutCanvas = version < 2 ? components.map(stripCanvasFields) : components;
  return { components: withoutCanvas.map(withPlannings) as unknown as ComponentData[] };
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
