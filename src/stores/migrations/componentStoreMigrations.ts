/**
 * Persisted-state migrations for the component store.
 * Pure: no Zustand, no AsyncStorage, no "@/" runtime imports.
 */
import type { ComponentData } from '../../types/component.types';
import type { PlantData } from '../../types/plant.types';
import type { GrowingPeriodData } from '../../types/planning.types';
import { GrowingPeriod } from '../../domain/planning/GrowingPeriod.ts';
import { PlantingWeek } from '../../domain/planning/PlantingWeek.ts';

/**
 * Version 2: canvas position and rotation removed from components.
 * Version 3: placed plants get a growing period; components get plantsToPlan.
 */
export const COMPONENT_STORE_VERSION = 3;

export interface PersistedComponentState {
  components: ComponentData[];
}

/** Looks a plant up in the catalog; undefined when the plant is unknown */
export type PlantCatalogLookup = (plantId: string) => Pick<PlantData, 'daysToHarvest'> | undefined;

const EMPTY_STATE: PersistedComponentState = { components: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripCanvasFields(component: Record<string, unknown>): Record<string, unknown> {
  const { positionX: _x, positionY: _y, rotation: _r, ...rest } = component;
  return rest;
}

function readableDate(value: unknown): Date | null {
  const date = typeof value === 'string' ? new Date(value) : null;
  return date !== null && !Number.isNaN(date.getTime()) ? date : null;
}

/**
 * A plant placed before version 3 was transplanted in the (local) week of
 * placedAt and stays until harvest, or until the end of that year when the
 * catalog does not know it.
 */
function periodSincePlacement(
  plant: Record<string, unknown>,
  component: Record<string, unknown>,
  catalog: PlantCatalogLookup,
): GrowingPeriodData {
  const placedAt = readableDate(plant.placedAt) ?? readableDate(component.createdAt) ?? new Date();
  const harvestDays = catalog(String(plant.plantId))?.daysToHarvest.max;
  return GrowingPeriod.startingAt(PlantingWeek.containingLocal(placedAt), 'transplant', harvestDays).toData();
}

function recordsIn(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isComplete(component: Record<string, unknown>): boolean {
  const { plants, plantsToPlan } = component;
  return (
    Array.isArray(plants) &&
    Array.isArray(plantsToPlan) &&
    plants.every((plant) => isRecord(plant) && isRecord(plant.growingPeriod)) &&
    plantsToPlan.every(isRecord)
  );
}

/**
 * Fills the planning fields that are missing and drops entries that are not
 * objects; complete components stay as they are.
 */
function withPlanningFields(component: Record<string, unknown>, catalog: PlantCatalogLookup): Record<string, unknown> {
  if (isComplete(component)) {
    return component;
  }
  return {
    ...component,
    plants: recordsIn(component.plants).map((plant) =>
      isRecord(plant.growingPeriod) ? plant : { ...plant, growingPeriod: periodSincePlacement(plant, component, catalog) },
    ),
    plantsToPlan: recordsIn(component.plantsToPlan),
  };
}

export function migrateComponentState(
  persistedState: unknown,
  version: number,
  catalog: PlantCatalogLookup,
): PersistedComponentState {
  if (!isRecord(persistedState) || !Array.isArray(persistedState.components)) {
    return EMPTY_STATE;
  }

  const components = recordsIn(persistedState.components);
  const withoutCanvas = version < 2 ? components.map(stripCanvasFields) : components;

  // Unknown plants get a period until the year end; one warning per run makes
  // a catalog that failed to load visible without flooding the log
  let unknownPlants = 0;
  const countingCatalog: PlantCatalogLookup = (plantId) => {
    const plant = catalog(plantId);
    if (plant === undefined) unknownPlants++;
    return plant;
  };
  const migrated = withoutCanvas.map((component) => withPlanningFields(component, countingCatalog));
  if (unknownPlants > 0) {
    console.warn(
      `${unknownPlants} geplaatste planten staan niet in de catalogus; hun groeiperiode loopt tot het einde van het jaar.`,
    );
  }

  return { components: migrated as unknown as ComponentData[] };
}

/**
 * Merge persisted state into the live store state. Zustand only runs
 * `migrate` on a version mismatch, so this guards a current-version blob
 * that is malformed or misses planning fields as well. Actions on
 * `currentState` are preserved.
 */
export function mergePersistedComponentState<T extends PersistedComponentState>(
  persistedState: unknown,
  currentState: T,
  catalog: PlantCatalogLookup,
): T {
  return {
    ...currentState,
    ...migrateComponentState(persistedState, COMPONENT_STORE_VERSION, catalog),
  };
}
