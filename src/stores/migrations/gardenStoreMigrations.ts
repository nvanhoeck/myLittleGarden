/**
 * Persisted-state migrations for the garden store.
 * Pure: no Zustand, no AsyncStorage, no "@/" runtime imports.
 */
import type { SunDirection } from '../../types/environment.types';

/** Version 1: garden width and height removed (no more 2D canvas). */
export const GARDEN_STORE_VERSION = 1;

export interface PersistedGardenState {
  sunDirection: SunDirection | null;
  springFrostDate: string | null;
  fallFrostDate: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function migrateGardenState(
  persistedState: unknown,
  _version: number,
): PersistedGardenState {
  if (!isRecord(persistedState)) {
    return { sunDirection: null, springFrostDate: null, fallFrostDate: null };
  }
  return {
    sunDirection: stringOrNull(persistedState.sunDirection) as SunDirection | null,
    springFrostDate: stringOrNull(persistedState.springFrostDate),
    fallFrostDate: stringOrNull(persistedState.fallFrostDate),
  };
}
