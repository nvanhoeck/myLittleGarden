import { useMemo } from 'react';
import { Planning, frostDayOf, placementsGrowingOn, plantingCalendarFor } from '@/domain/planning';
import type { PlantingCalendar } from '@/domain/planning';
import type { ComponentData, PlacedPlantData } from '@/types';
import { useEnvironmentStore } from './environmentStore';
import { usePlantStore } from './plantStore';

/** The planting calendar of a planning year, from the catalog and the garden's last frost (outside React) */
export function plantingCalendarOfYear(year: number): PlantingCalendar {
  return plantingCalendarFor(year, frostDayOf(useEnvironmentStore.getState().lastSpringFrost), (plantId) =>
    usePlantStore.getState().getPlantById(plantId),
  );
}

/** Same as plantingCalendarOfYear, re-computed when the frost date or the catalog changes */
export function usePlantingCalendar(year: number): PlantingCalendar {
  const lastSpringFrost = useEnvironmentStore((state) => state.lastSpringFrost);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  return useMemo(() => plantingCalendarFor(year, frostDayOf(lastSpringFrost), getPlantById), [year, lastSpringFrost, getPlantById]);
}

/** The component's planning of a year; null without a component */
export function usePlanning(component: ComponentData | undefined, year: number): Planning | null {
  const calendar = usePlantingCalendar(year);
  const data = component?.plannings[String(year)];
  return useMemo(() => (component ? Planning.from(data, calendar) : null), [component, data, calendar]);
}

/** What grows today in each component, by component id */
export function useCurrentPlacementsById(components: readonly ComponentData[]): ReadonlyMap<string, readonly PlacedPlantData[]> {
  const lastSpringFrost = useEnvironmentStore((state) => state.lastSpringFrost);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  return useMemo(() => {
    const today = new Date();
    const calendarOfYear = (year: number): PlantingCalendar => plantingCalendarFor(year, frostDayOf(lastSpringFrost), getPlantById);
    return new Map(components.map((component) => [component.id, placementsGrowingOn(component, today, calendarOfYear)]));
  }, [components, lastSpringFrost, getPlantById]);
}
