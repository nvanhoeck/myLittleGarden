import { create } from 'zustand';
import type { Season } from '../types/planning.types.ts';
import type { PlantingShare } from '../domain/planning/SeasonOptimization.ts';

/** One season of one component's planning */
export interface SeasonKey {
  readonly componentId: string;
  readonly year: number;
  readonly season: Season;
}

interface PlanningState {
  /** The shares of the last optimization per season; not persisted */
  lastShares: Readonly<Record<string, readonly PlantingShare[]>>;
  setLastShares: (key: SeasonKey, shares: readonly PlantingShare[]) => void;
  sharesOf: (key: SeasonKey) => readonly PlantingShare[] | undefined;
  forgetComponent: (componentId: string) => void;
}

const keyOf = ({ componentId, year, season }: SeasonKey): string => `${componentId}|${year}|${season}`;

/**
 * What the last optimization of each season gave, for the result rows on the
 * Planning screen. Lost when the app restarts.
 */
export const usePlanningStore = create<PlanningState>()((set, get) => ({
  lastShares: {},
  setLastShares: (key, shares) => set((state) => ({ lastShares: { ...state.lastShares, [keyOf(key)]: shares } })),
  sharesOf: (key) => get().lastShares[keyOf(key)],
  forgetComponent: (componentId) =>
    set((state) => ({
      lastShares: Object.fromEntries(Object.entries(state.lastShares).filter(([key]) => !key.startsWith(`${componentId}|`))),
    })),
}));
