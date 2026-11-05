import { create } from 'zustand';
import type { UnplacedCandidate } from '@/domain/planning';

/**
 * Planning store (not persisted)
 * Keeps why plants could not be placed in the last Rearrange or Start over
 * run, per component, year and layer, so the "to plan" list can show the reason.
 */

/** What a planning run was about: one component, one year, one layer */
export interface PlanningScope {
  readonly componentId: string;
  readonly year: number;
  /** undefined for components without layers (same as layer 0) */
  readonly layerIndex?: number;
}

type UnplacedByScope = Readonly<Record<string, readonly UnplacedCandidate[]>>;

interface PlanningState {
  // State: per component, the reasons per year/layer
  lastRuns: Readonly<Record<string, UnplacedByScope>>;

  // Actions
  setLastRun: (scope: PlanningScope, unplaced: readonly UnplacedCandidate[]) => void;
  forgetPlantToPlan: (componentId: string, plantToPlanId: string) => void;
  forgetComponent: (componentId: string) => void;
}

const NO_UNPLACED: readonly UnplacedCandidate[] = [];

function yearAndLayerKey(scope: PlanningScope): string {
  return `${scope.year}|${scope.layerIndex ?? 0}`;
}

export const usePlanningStore = create<PlanningState>()((set) => ({
  lastRuns: {},

  setLastRun: (scope, unplaced) =>
    set((state) => ({
      lastRuns: {
        ...state.lastRuns,
        [scope.componentId]: { ...state.lastRuns[scope.componentId], [yearAndLayerKey(scope)]: unplaced },
      },
    })),

  forgetPlantToPlan: (componentId, plantToPlanId) =>
    set((state) => {
      const runs = state.lastRuns[componentId];
      if (runs === undefined) return state;
      const withoutItem = Object.fromEntries(
        Object.entries(runs).map(([key, unplaced]) => [key, unplaced.filter((u) => u.id !== plantToPlanId)]),
      );
      return { lastRuns: { ...state.lastRuns, [componentId]: withoutItem } };
    }),

  forgetComponent: (componentId) =>
    set((state) => {
      const { [componentId]: _forgotten, ...rest } = state.lastRuns;
      return { lastRuns: rest };
    }),
}));

/**
 * The unplaced reasons of the last run in a scope (a stable empty list when none)
 */
export function unplacedOf(state: Pick<PlanningState, 'lastRuns'>, scope: PlanningScope): readonly UnplacedCandidate[] {
  return state.lastRuns[scope.componentId]?.[yearAndLayerKey(scope)] ?? NO_UNPLACED;
}

/**
 * Select the unplaced reasons of the last run in a scope
 */
export function useUnplacedOfLastRun(scope: PlanningScope): readonly UnplacedCandidate[] {
  return usePlanningStore((state) => unplacedOf(state, scope));
}
