import type { ComponentData } from '../../types/component.types.ts';
import type { PlacementData } from '../../types/planning.types.ts';
import { Planning } from './Planning.ts';
import { seasonContaining } from './Season.ts';
import type { SeasonsOf } from './Season.ts';

/**
 * What grows in a component on a day: the placements of that day's season,
 * including plants carried into it, from the planning of its year.
 */
export function placementsGrowingOn(
  component: Pick<ComponentData, 'plannings'>,
  date: Date,
  seasonsOfYear: (year: number) => SeasonsOf,
): PlacementData[] {
  const { year, season } = seasonContaining(date);
  const planning = Planning.from(component.plannings[String(year)], seasonsOfYear(year));
  return [...planning.carriedPlacementsIn(season), ...planning.placementsIn(season)];
}
