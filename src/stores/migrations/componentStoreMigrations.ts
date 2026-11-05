/**
 * Persisted-state migrations for the component store.
 * Pure: no Zustand, no AsyncStorage, no "@/" runtime imports.
 */
import type { ComponentData } from '../../types/component.types';
import type { PlacementData, PlanningData, Season, SeasonPlanData, SeasonStatus } from '../../types/planning.types';
import { placementDataSchema } from '../../schemas/planningSchema.ts';

/**
 * Version 2: canvas position and rotation removed from components.
 * Version 3: week-based planning (placed plants with growing periods, plants to plan).
 * Version 4: plants live in plannings per year and season; plantings from
 * version 3 and before are not converted.
 */
export const COMPONENT_STORE_VERSION = 4;

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

/**
 * Salvages one season: valid ratios and placements stay, bad entries go. A
 * planned season that lost an entry is outdated, so the user sees it needs a
 * new run.
 */
function salvageSeason(value: unknown): SeasonPlanData {
  if (!isRecord(value)) {
    return EMPTY_SEASON;
  }
  const ratioEntries = isRecord(value.ratios) ? Object.entries(value.ratios) : [];
  const ratios = Object.fromEntries(ratioEntries.filter(([, ratio]) => Number.isInteger(ratio) && (ratio as number) >= 1)) as Record<string, number>;
  const placementEntries = Array.isArray(value.placements) ? value.placements : [];
  const placements: PlacementData[] = placementEntries.flatMap((entry) => {
    const parsed = placementDataSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
  const status = STATUSES.find((candidate) => candidate === value.status) ?? 'notPlanned';
  const droppedAny = Object.keys(ratios).length < ratioEntries.length || placements.length < placementEntries.length;
  return { ratios, placements, status: droppedAny && status === 'planned' ? 'outdated' : status };
}

/** Salvages one year: null when it has no usable plants list or seasons */
function salvagePlanning(value: unknown): PlanningData | null {
  if (!isRecord(value) || !Array.isArray(value.plants) || !isRecord(value.seasons)) {
    return null;
  }
  const seasons = value.seasons;
  const plants = value.plants.filter((plant): plant is string => typeof plant === 'string' && plant.length > 0);
  const salvaged = SEASONS.map((season) => salvageSeason(seasons[season]));
  const droppedPlant = plants.length < value.plants.length;
  const [spring, summer, autumn, winter] = droppedPlant
    ? salvaged.map((season) => (season.status === 'planned' ? { ...season, status: 'outdated' as const } : season))
    : salvaged;
  return { plants, seasons: { spring, summer, autumn, winter } };
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
