import type { Season } from '../../types/planning.types.ts';

export type { Season };

/** The seasons of a planning year in order; winter runs into the next calendar year */
export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** First month (1-12) of each meteorological season */
const FIRST_MONTH: Readonly<Record<Season, number>> = { spring: 3, summer: 6, autumn: 9, winter: 12 };

export interface SeasonRange {
  /** First day, UTC midnight */
  readonly start: Date;
  /** Last day, UTC midnight, inclusive */
  readonly end: Date;
}

/** The days of a season in a planning year; winter of year Y ends in February of Y+1 */
export function seasonRange(year: number, season: Season): SeasonRange {
  const firstMonth = FIRST_MONTH[season];
  return {
    start: new Date(Date.UTC(year, firstMonth - 1, 1)),
    // Day 0 of the month after the season is the season's last day
    end: new Date(Date.UTC(year, firstMonth + 2, 0)),
  };
}

/** First and last month (1-12) of a season, for hints such as "mrt–mei" */
export function seasonMonths(season: Season): { readonly first: number; readonly last: number } {
  const first = FIRST_MONTH[season];
  return { first, last: ((first + 1) % 12) + 1 };
}

/** The seasons after the given one in the same planning year */
export function seasonsAfter(season: Season): Season[] {
  return SEASONS.slice(SEASONS.indexOf(season) + 1);
}

/**
 * The planning year and season of a (local) day. January and February
 * belong to the winter of the year before.
 */
export function seasonContaining(date: Date): { readonly year: number; readonly season: Season } {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month <= 2) {
    return { year: year - 1, season: 'winter' };
  }
  const season = SEASONS.find((s) => month >= FIRST_MONTH[s] && month < FIRST_MONTH[s] + 3) ?? 'winter';
  return { year, season };
}
