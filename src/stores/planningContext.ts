import { useMemo } from 'react';
import { Planning, frostDayOf, placementsGrowingOn, seasonsLookup } from '@/domain/planning';
import type { SeasonsOf } from '@/domain/planning';
import type { ComponentData, PlacedPlantData } from '@/types';
import { useEnvironmentStore } from './environmentStore';
import { usePlantStore } from './plantStore';

/** The seasons of every plant in a planning year, from the catalog and the garden's last frost (outside React) */
export function seasonsOfYear(year: number): SeasonsOf {
  return seasonsLookup(year, frostDayOf(useEnvironmentStore.getState().lastSpringFrost), (plantId) =>
    usePlantStore.getState().getPlantById(plantId),
  );
}

/** Same as seasonsOfYear, re-computed when the frost date or the catalog changes */
export function useSeasonsOfYear(year: number): SeasonsOf {
  const lastSpringFrost = useEnvironmentStore((state) => state.lastSpringFrost);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  return useMemo(() => seasonsLookup(year, frostDayOf(lastSpringFrost), getPlantById), [year, lastSpringFrost, getPlantById]);
}

/** The component's planning of a year; null without a component */
export function usePlanning(component: ComponentData | undefined, year: number): Planning | null {
  const seasonsOf = useSeasonsOfYear(year);
  const data = component?.plannings[String(year)];
  return useMemo(() => (component ? Planning.from(data, seasonsOf) : null), [component, data, seasonsOf]);
}

/** What grows today in each component, by component id */
export function useCurrentPlacementsById(components: readonly ComponentData[]): ReadonlyMap<string, readonly PlacedPlantData[]> {
  const lastSpringFrost = useEnvironmentStore((state) => state.lastSpringFrost);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  return useMemo(() => {
    const today = new Date();
    const seasonsOf = (year: number): SeasonsOf => seasonsLookup(year, frostDayOf(lastSpringFrost), getPlantById);
    return new Map(components.map((component) => [component.id, placementsGrowingOn(component, today, seasonsOf)]));
  }, [components, lastSpringFrost, getPlantById]);
}
