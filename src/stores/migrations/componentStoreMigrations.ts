/**
 * Persisted-state migrations for the component store.
 * Pure: no Zustand, no AsyncStorage, no "@/" runtime imports.
 */
import type { ComponentData } from '../../types/component.types';
import type { PlanningData } from '../../types/planning.types';
import { planningDataSchema } from '../../schemas/planningSchema.ts';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripCanvasFields(component: Record<string, unknown>): Record<string, unknown> {
  const { positionX: _x, positionY: _y, rotation: _r, ...rest } = component;
  return rest;
}

/** The stored plannings that are valid; others are dropped */
function validPlannings(value: unknown): Record<string, PlanningData> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([year, data]): [string, PlanningData][] => {
      const parsed = planningDataSchema.safeParse(data);
      return YEAR_KEY.test(year) && parsed.success ? [[year, parsed.data]] : [];
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
