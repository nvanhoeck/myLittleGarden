import { GrowingPeriod } from './GrowingPeriod.ts';
import type { GrowingPeriodData } from './GrowingPeriod.ts';
import { PlantingWeek } from './PlantingWeek.ts';

/**
 * A time zone is a maximal run of consecutive weeks in which the same plants
 * are in the ground, so the layout is identical in every week of the zone.
 */
export interface TimeZone {
  readonly startWeek: number;
  readonly endWeek: number;
  /** Sorted ids of the plants active during the zone */
  readonly plantIds: readonly string[];
}

export interface PlantInTime {
  readonly id: string;
  readonly period: GrowingPeriodData;
}

/**
 * Splits the year into time zones covering every week, including weeks
 * without plants. Plants of other years are ignored. Always calculated, never stored.
 */
export function calculateTimeZones(plants: readonly PlantInTime[], year: number): TimeZone[] {
  const zones: TimeZone[] = [];

  for (let weekNumber = 1; weekNumber <= PlantingWeek.weeksInYear(year); weekNumber++) {
    const week = PlantingWeek.of(year, weekNumber);
    const plantIds = plants
      .filter((plant) => GrowingPeriod.covers(plant.period, week))
      .map((plant) => plant.id)
      .sort();

    const current = zones[zones.length - 1];
    if (current !== undefined && sameIds(current.plantIds, plantIds)) {
      zones[zones.length - 1] = { ...current, endWeek: weekNumber };
    } else {
      zones.push({ startWeek: weekNumber, endWeek: weekNumber, plantIds });
    }
  }
  return zones;
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
