import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  PlantingWeek,
  calculateTimeZones,
  conflictingPlantIds,
  footprintOf,
  plannedYearsOf,
  plantingAreaOf,
  plantsGrowingIn,
  plantsOutsideArea,
  timeZonesOf,
} from '@/domain/planning';
import type { PlantFootprint } from '@/domain/planning';
import { usePlantStore } from '@/stores/plantStore';
import type { ComponentData, PlacedPlantData } from '@/types';
import {
  buildWeekTimeline,
  defaultSelection,
  displayedWeekOf,
  planningYearRange,
  resolveSelection,
} from './planningViewModel';
import type { PlanningSelection, Translate, WeekTimelineView } from './planningViewModel';

export interface PlanningTimeline {
  readonly year: number;
  /** The week the canvas shows: the selected week or the first week of the selected zone */
  readonly displayedWeek: number;
  readonly canGoToPreviousYear: boolean;
  readonly canGoToNextYear: boolean;
  readonly goToPreviousYear: () => void;
  readonly goToNextYear: () => void;
  readonly timeline: WeekTimelineView;
  readonly selectWeek: (week: number) => void;
  readonly selectZone: (startWeek: number) => void;
  /** Placed plants on the layer that grow in the displayed week */
  readonly visiblePlants: PlacedPlantData[];
  /** Footprint of every visible plant */
  readonly footprints: Map<string, PlantFootprint>;
  /** Visible plants overlapping another plant in a shared week */
  readonly conflictIds: Set<string>;
  /** Visible plants whose footprint does not lie inside the area */
  readonly outOfBoundsIds: Set<string>;
}

/**
 * The year and week (or time zone) the Component Detail screen shows, and
 * what the canvas draws for it. Selected year and week are screen state:
 * the current ISO week by default, week 1 in any other year.
 */
export function usePlanningTimeline(component: ComponentData | undefined, layerIndex: number | undefined): PlanningTimeline {
  const { t } = useTranslation();
  const translate = useCallback<Translate>((key, options) => t(key, options), [t]);
  const getPlantById = usePlantStore((state) => state.getPlantById);

  const [today, setToday] = useState(() => PlantingWeek.containingLocal(new Date()));
  const [year, setYear] = useState(today.year);
  const [selection, setSelection] = useState<PlanningSelection>(() => defaultSelection(today.year, today));

  // The app can stay open across a week or year change: refresh "today" on focus,
  // and move a selection that still is the old default to the new current week
  useFocusEffect(
    useCallback(() => {
      const now = PlantingWeek.containingLocal(new Date());
      if (now.equals(today)) return;
      setToday(now);
      const wasDefault = year === today.year && selection.kind === 'week' && selection.week === today.week;
      if (wasDefault) {
        setYear(now.year);
        setSelection(defaultSelection(now.year, now));
      }
    }, [today, year, selection]),
  );

  const zones = useMemo(
    () => (component ? timeZonesOf(component, year, layerIndex) : calculateTimeZones([], year)),
    [component, year, layerIndex],
  );
  const resolved = useMemo(() => resolveSelection(selection, zones), [selection, zones]);
  const displayedWeek = displayedWeekOf(resolved);

  const timeline = useMemo(
    () => buildWeekTimeline({ year, zones, selection: resolved, today, t: translate }),
    [year, zones, resolved, today, translate],
  );

  const yearRange = useMemo(
    () => planningYearRange(today.year, component ? plannedYearsOf(component) : []),
    [component, today],
  );

  const changeYear = useCallback(
    (nextYear: number) => {
      setYear(nextYear);
      setSelection(defaultSelection(nextYear, today));
    },
    [today],
  );
  const goToPreviousYear = useCallback(() => changeYear(year - 1), [changeYear, year]);
  const goToNextYear = useCallback(() => changeYear(year + 1), [changeYear, year]);
  const selectWeek = useCallback((week: number) => setSelection({ kind: 'week', week }), []);
  const selectZone = useCallback((startWeek: number) => setSelection({ kind: 'zone', startWeek }), []);

  const visiblePlants = useMemo(
    () => (component ? plantsGrowingIn(component, PlantingWeek.of(year, displayedWeek), layerIndex) : []),
    [component, year, displayedWeek, layerIndex],
  );

  // The canvas only draws; the footprint, conflict and wall rules come from the domain
  const { footprints, conflictIds, outOfBoundsIds } = useMemo(() => {
    const footprintOfPlant = (plant: PlacedPlantData): PlantFootprint => footprintOf(getPlantById(plant.plantId), plant);
    return {
      footprints: new Map(visiblePlants.map((plant) => [plant.id, footprintOfPlant(plant)])),
      conflictIds: conflictingPlantIds(visiblePlants, footprintOfPlant),
      outOfBoundsIds: component
        ? plantsOutsideArea(visiblePlants, footprintOfPlant, plantingAreaOf(component, layerIndex))
        : new Set<string>(),
    };
  }, [visiblePlants, getPlantById, component, layerIndex]);

  return {
    year,
    displayedWeek,
    canGoToPreviousYear: year > yearRange.first,
    canGoToNextYear: year < yearRange.last,
    goToPreviousYear,
    goToNextYear,
    timeline,
    selectWeek,
    selectZone,
    visiblePlants,
    footprints,
    conflictIds,
    outOfBoundsIds,
  };
}
