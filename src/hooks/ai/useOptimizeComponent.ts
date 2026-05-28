import { useCallback } from 'react';
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
  requestOptimization: (
    component: ComponentData,
    getPlantById: (id: string) => PlantData | undefined,
    gardenSunDirection: string | null,
    objective?: Objective,
  ) => Promise<void>;
  applyAlternative: (
    component: ComponentData,
    componentId: string,
    updateComponent: (id: string, updates: { plants: PlacedPlantData[] }) => void,
  ) => void;
  reset: () => void;
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
  const reset = useAiOptimizeComponentStore((s) => s.reset);

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
      getPlantById: (id: string) => PlantData | undefined,
      gardenSunDirection: string | null,
      objective: Objective = 'balanced',
    ): Promise<void> => {
      setLoading();
      try {
        const request = buildComponentOptimizeRequest(
          component,
          getPlantById,
          gardenSunDirection,
          objective,
        );
        const response = await withRetry(() =>
          optimizeComponentService.requestOptimization(request),
        );
        setSuccess(response.alternatives);
      } catch (e) {
        console.error('mylittlegarden: requestOptimization failed', e);
        setError(translateError(e));
      }
    },
    [setLoading, setSuccess, setError, translateError],
  );

  const applyAlternative = useCallback(
    (
      component: ComponentData,
      componentId: string,
      updateComponent: (id: string, updates: { plants: PlacedPlantData[] }) => void,
    ): void => {
      const current = useAiOptimizeComponentStore.getState();
      const selected = current.alternatives?.[current.selectedIndex];
      if (!selected) return;

      const positionMap = new Map(
        selected.positions.map((pos) => [pos.plantInstanceId, pos]),
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
