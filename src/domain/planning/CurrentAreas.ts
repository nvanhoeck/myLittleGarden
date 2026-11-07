import type { ComponentData } from '../../types/component.types.ts';
import type { AreaData } from '../../types/planning.types.ts';
import { Planning } from './Planning.ts';
import { seasonContaining } from './Season.ts';
import type { PlantingCalendar } from './PlantCalendar.ts';

/**
 * What grows in a component on a day: the areas of that day's season,
 * including areas carried into it, from the planning of its year.
 */
export function areasGrowingOn(
  component: Pick<ComponentData, 'plannings'>,
  date: Date,
  calendarOfYear: (year: number) => PlantingCalendar,
): AreaData[] {
  const { year, season } = seasonContaining(date);
  const planning = Planning.from(component.plannings[String(year)], calendarOfYear(year));
  return [...planning.carriedAreasIn(season), ...planning.areasIn(season)];
}
