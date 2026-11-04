import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAiOptimizeComponentStore } from '@/stores/ai/aiOptimizeComponentStore';
import { buildComponentOptimizeRequest } from '@/domain/ai/buildComponentOptimizeRequest';
import { optimizeComponentService } from '@/services/ai/optimizeComponentService';
import { withRetry } from '@/services/ai/aiRetry';
import {
  AiError,
  AiNetworkError,
  AiTimeoutError,
  AiServerDownError,
  AiInvalidResponseError,
} from '@/services/ai/AiError';
import type { ComponentData } from '@/types/component.types';
import type { PlantData, PlacedPlantData } from '@/types/plant.types';
import type { OptimizeComponentAlternative } from '@/schemas/ai/optimizeComponentResponseSchema';

type Objective = 'maximize-companions' | 'minimize-harm' | 'balanced';

interface UseOptimizeComponentResult {
  status: ReturnType<typeof useAiOptimizeComponentStore.getState>['status'];
  alternatives: OptimizeComponentAlternative[] | null;
  selectedIndex: number;
  error: string | null;
  setSelectedIndex: (index: number) => void;
  /**
   * Asks the AI to optimize the scope's plants only (the plants growing in the
   * displayed week). Its obstacles are sent as locked plants, so the AI does
   * not put plants on them; the other plants of the component are not sent.
   */
  requestOptimization: (
    component: ComponentData,
    scope: OptimizeScope,
    getPlantById: (id: string) => PlantData | undefined,
    gardenSunDirection: string | null,
    objective?: Objective,
  ) => Promise<void>;
  /** Moves the given plants to the selected alternative's positions; never their periods */
  applyAlternative: (
    component: ComponentData,
    componentId: string,
    updateComponent: (id: string, updates: { plants: PlacedPlantData[] }) => void,
    movablePlantIds: ReadonlySet<string>,
  ) => void;
  /** Forgets the result; a request still running is ignored when it returns */
  reset: () => void;
}

/** What an optimization works on */
export interface OptimizeScope {
  /** The plants the AI may move */
  readonly plants: readonly PlacedPlantData[];
  /** Plants in the ground during the same weeks, which the AI must keep clear of */
  readonly obstacles: readonly PlacedPlantData[];
}

/** The plants sent to the AI: the scope's plants plus its obstacles as locked plants */
export function plantsForOptimization(scope: OptimizeScope): PlacedPlantData[] {
  return [...scope.plants, ...scope.obstacles.map((plant) => ({ ...plant, locked: true }))];
}

export function useOptimizeComponent(): UseOptimizeComponentResult {
  const { t } = useTranslation();
  const status = useAiOptimizeComponentStore((s) => s.status);
  const alternatives = useAiOptimizeComponentStore((s) => s.alternatives);
  const selectedIndex = useAiOptimizeComponentStore((s) => s.selectedIndex);
  const error = useAiOptimizeComponentStore((s) => s.error);
  const setLoading = useAiOptimizeComponentStore((s) => s.setLoading);
  const setSuccess = useAiOptimizeComponentStore((s) => s.setSuccess);
  const setError = useAiOptimizeComponentStore((s) => s.setError);
  const setSelectedIndex = useAiOptimizeComponentStore((s) => s.setSelectedIndex);
  const resetStore = useAiOptimizeComponentStore((s) => s.reset);
  // Only the latest request may report back
  const requestId = useRef(0);

  const reset = useCallback(() => {
    requestId.current += 1;
    resetStore();
  }, [resetStore]);

  const translateError = useCallback(
    (e: unknown): string => {
      const detail = e instanceof AiError
        ? ' (' + e.code + ': ' + e.message + ')'
        : e instanceof Error ? ' (' + e.message + ')' : '';
      if (e instanceof AiNetworkError) return t('ai.shared.errors.network') + detail;
      if (e instanceof AiTimeoutError) return t('ai.shared.errors.timeout') + detail;
      if (e instanceof AiServerDownError) return t('ai.shared.errors.serverDown') + detail;
      if (e instanceof AiInvalidResponseError) return t('ai.shared.errors.invalidResponse') + detail;
      if (e instanceof AiError) return t('ai.shared.errors.unknown') + detail;
      return t('ai.shared.errors.unknown') + detail;
    },
    [t],
  );

  const requestOptimization = useCallback(
    async (
      component: ComponentData,
      scope: OptimizeScope,
      getPlantById: (id: string) => PlantData | undefined,
      gardenSunDirection: string | null,
      objective: Objective = 'balanced',
    ): Promise<void> => {
      const id = ++requestId.current;
      setLoading();
      try {
        const request = buildComponentOptimizeRequest(
          { ...component, plants: plantsForOptimization(scope) },
          getPlantById,
          gardenSunDirection,
          objective,
        );
        const response = await withRetry(() =>
          optimizeComponentService.requestOptimization(request),
        );
        if (id === requestId.current) setSuccess(response.alternatives);
      } catch (e) {
        console.error('mylittlegarden: requestOptimization failed', e);
        if (id === requestId.current) setError(translateError(e));
      }
    },
    [setLoading, setSuccess, setError, translateError],
  );

  const applyAlternative = useCallback(
    (
      component: ComponentData,
      componentId: string,
      updateComponent: (id: string, updates: { plants: PlacedPlantData[] }) => void,
      movablePlantIds: ReadonlySet<string>,
    ): void => {
      const current = useAiOptimizeComponentStore.getState();
      const selected = current.alternatives?.[current.selectedIndex];
      if (!selected) return;

      // Obstacles were sent as locked plants: they never move
      const positionMap = new Map(
        selected.positions
          .filter((pos) => movablePlantIds.has(pos.plantInstanceId))
          .map((pos) => [pos.plantInstanceId, pos]),
      );

      const updatedPlants: PlacedPlantData[] = component.plants.map((plant) => {
        const newPosition = positionMap.get(plant.id);
        if (!newPosition) return plant;
        return {
          ...plant,
          positionX: newPosition.positionXInCm,
          positionY: newPosition.positionYInCm,
        };
      });

      updateComponent(componentId, { plants: updatedPlants });
    },
    [],
  );

  return {
    status,
    alternatives,
    selectedIndex,
    error,
    setSelectedIndex,
    requestOptimization,
    applyAlternative,
    reset,
  };
}
