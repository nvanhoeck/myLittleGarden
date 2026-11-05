import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { hasAnythingToPlan, plantsToPlanIn } from '@/domain/planning';
import type { PlanningRunCounts } from '@/domain/planning';
import { useComponentStore } from '@/stores';
import { usePlantStore } from '@/stores/plantStore';
import { useUnplacedOfLastRun } from '@/stores/planningStore';
import type { ComponentData } from '@/types';
import { buildToPlanGroups, planningResultMessage } from './planningViewModel';
import type { PlanningResultView, ToPlanGroupView, Translate } from './planningViewModel';

/** How long the result snackbar stays */
const SNACKBAR_DURATION_MS = 4000;

export type PlanningRun = 'rearrange' | 'startOver';

export interface PlanningActions {
  readonly toPlanGroups: ToPlanGroupView[];
  readonly toPlanCount: number;
  readonly isToPlanExpanded: boolean;
  readonly toggleToPlan: () => void;
  readonly removeToPlan: (plantId: string) => void;
  readonly canPlan: boolean;
  /** The run in progress, for the spinner on its button */
  readonly running: PlanningRun | null;
  readonly rearrange: () => void;
  readonly startOver: () => void;
  readonly result: PlanningResultView | null;
  /** The snackbar's "Bekijk": opens the "to plan" list */
  readonly viewResult: () => void;
}

/**
 * The "to plan" list and the Rearrange / Start over actions for one
 * component, year and layer, with the snackbar that reports the result.
 */
export function usePlanningActions(
  component: ComponentData | undefined,
  year: number,
  layerIndex: number | undefined,
): PlanningActions {
  const { t } = useTranslation();
  const translate = useCallback<Translate>((key, options) => t(key, options), [t]);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  const { removePlantToPlan, rearrangePlanting, startPlantingOver } = useComponentStore(
    useShallow((state) => ({
      removePlantToPlan: state.removePlantToPlan,
      rearrangePlanting: state.rearrangePlanting,
      startPlantingOver: state.startPlantingOver,
    })),
  );
  const componentId = component?.id ?? '';
  const unplaced = useUnplacedOfLastRun({ componentId, year, layerIndex });

  const [isToPlanExpanded, setIsToPlanExpanded] = useState(false);
  const [running, setRunning] = useState<PlanningRun | null>(null);
  const [result, setResult] = useState<PlanningResultView | null>(null);

  // A run finishes after a frame; it must not update a screen that is gone
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const items = useMemo(
    () => (component ? plantsToPlanIn(component, year, layerIndex) : []),
    [component, year, layerIndex],
  );
  const toPlanGroups = useMemo(
    () => buildToPlanGroups(
      items,
      unplaced,
      (plantId) => getPlantById(plantId)?.nameNl ?? t('componentDetail.unknownPlant'),
      translate,
    ),
    [items, unplaced, getPlantById, t, translate],
  );

  // Hide the snackbar after a while
  useEffect(() => {
    if (result === null) return;
    const timer = setTimeout(() => setResult(null), SNACKBAR_DURATION_MS);
    return () => clearTimeout(timer);
  }, [result]);

  const toggleToPlan = useCallback(() => setIsToPlanExpanded((expanded) => !expanded), []);

  const removeToPlan = useCallback(
    (plantId: string) => {
      const group = toPlanGroups.find((g) => g.plantId === plantId);
      if (!group) return;
      Alert.alert(t('common.delete'), group.removeConfirmText, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => removePlantToPlan(componentId, group.removeId) },
      ]);
    },
    [toPlanGroups, componentId, removePlantToPlan, t],
  );

  // The store action reads the current component itself, so a confirmed
  // Start over never works on a component captured when the dialog opened
  const run = useCallback(
    (kind: PlanningRun) => {
      if (!componentId) return;
      setResult(null);
      setRunning(kind);
      // Let the spinner render before the (synchronous) placement blocks the JS thread
      requestAnimationFrame(() => setTimeout(() => {
        let counts: PlanningRunCounts | null = null;
        try {
          counts = kind === 'rearrange'
            ? rearrangePlanting(componentId, year, layerIndex)
            : startPlantingOver(componentId, year, layerIndex);
        } catch (error) {
          console.error('mylittlegarden: planning run failed', error);
        }
        if (!isMounted.current) return;
        setRunning(null);
        if (counts !== null) {
          setResult(planningResultMessage(counts, translate));
        }
      }, 0));
    },
    [componentId, year, layerIndex, rearrangePlanting, startPlantingOver, translate],
  );

  const rearrange = useCallback(() => run('rearrange'), [run]);

  const startOver = useCallback(() => {
    Alert.alert(t('planning.startOver.title'), t('planning.startOver.message', { year }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('planning.actions.startOver'), style: 'destructive', onPress: () => run('startOver') },
    ]);
  }, [run, t, year]);

  const viewResult = useCallback(() => {
    setIsToPlanExpanded(true);
    setResult(null);
  }, []);

  return {
    toPlanGroups,
    toPlanCount: items.length,
    isToPlanExpanded,
    toggleToPlan,
    removeToPlan,
    canPlan: component ? hasAnythingToPlan(component, year, layerIndex) : false,
    running,
    rearrange,
    startOver,
    result,
    viewResult,
  };
}
