/**
 * Persisted-state migrations for the component store.
 * Pure: no Zustand, no AsyncStorage, no "@/" runtime imports.
 */
import type { ComponentData } from '../../types/component.types';

/** Version 2: canvas position and rotation removed from components. */
export const COMPONENT_STORE_VERSION = 2;

export interface PersistedComponentState {
  components: ComponentData[];
}

const EMPTY_STATE: PersistedComponentState = { components: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripCanvasFields(component: unknown): unknown {
  if (!isRecord(component)) return component;
  const { positionX: _x, positionY: _y, rotation: _r, ...rest } = component;
  return rest;
}

export function migrateComponentState(
  persistedState: unknown,
  version: number,
): PersistedComponentState {
  if (!isRecord(persistedState) || !Array.isArray(persistedState.components)) {
    return EMPTY_STATE;
  }

  if (version < 2) {
    return {
      components: persistedState.components.map(stripCanvasFields) as ComponentData[],
    };
  }

  return { components: persistedState.components as ComponentData[] };
}
