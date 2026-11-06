import type { PlantData, SowingWindow } from '../../types/plant.types.ts';
import type { Season } from '../../types/planning.types.ts';
import { SEASONS, seasonRange } from './Season.ts';
import type { SeasonsOf } from './Season.ts';

/** A day in the year without a year, such as the garden's frost dates */
export interface FrostDay {
  /** 1-12 */
  readonly month: number;
  readonly day: number;
}

/** The catalog fields that decide when a plant is sown, planted and harvested */
export type PlantTiming = Pick<PlantData, 'indoorStartWindow' | 'transplantWindow' | 'directSowWindow' | 'daysToHarvest'>;

/** A period of days, both inclusive, as UTC midnights */
export interface DateWindow {
  readonly start: Date;
  readonly end: Date;
}

export interface SowingDates {
  readonly indoorStart: DateWindow | null;
  readonly transplant: DateWindow | null;
  readonly directSow: DateWindow | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

/**
 * Reads the frost day from a stored frost date ('YYYY-MM-DD', as the
 * environment store keeps it). Only the digits are used, so no timezone can
 * shift the day. Returns null when there is no valid date.
 */
export function frostDayOf(isoDate: string | null): FrostDay | null {
  const match = isoDate === null ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Day 0 of the next month is the last day of this one
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth ? { month, day } : null;
}

/**
 * The frost day as a UTC date in the given year. A day that does not exist
 * in that month (29 February in a non-leap year) becomes its last day.
 * @throws Error when the month is not 1-12
 */
export function frostDateIn(year: number, frostDay: FrostDay): Date {
  if (!Number.isInteger(frostDay.month) || frostDay.month < 1 || frostDay.month > 12) {
    throw new Error(`Ongeldige maand ${frostDay.month}`);
  }
  const daysInMonth = new Date(Date.UTC(year, frostDay.month, 0)).getUTCDate();
  return new Date(Date.UTC(year, frostDay.month - 1, Math.min(Math.max(1, frostDay.day), daysInMonth)));
}

function plusDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function datesOf(window: SowingWindow | null, frost: Date): DateWindow | null {
  return window === null
    ? null
    : { start: plusDays(frost, window.fromWeeks * DAYS_PER_WEEK), end: plusDays(frost, window.toWeeks * DAYS_PER_WEEK) };
}

/**
 * The sowing and planting windows of a plant in a planning year, as dates:
 * the last spring frost plus the catalog's weeks (negative = before the frost).
 * The Plant Details calendar and the season planning both use these dates.
 */
export function sowingDatesOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): SowingDates {
  const frost = frostDateIn(year, lastSpringFrost);
  return {
    indoorStart: datesOf(plant.indoorStartWindow, frost),
    transplant: datesOf(plant.transplantWindow, frost),
    directSow: datesOf(plant.directSowWindow, frost),
  };
}

/** When the plant goes into the component: its transplant window, else its direct sow window */
export function plantingWindowOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): DateWindow | null {
  const dates = sowingDatesOf(plant, lastSpringFrost, year);
  return dates.transplant ?? dates.directSow;
}

/**
 * The first day a planting can start in a season: the later of the window
 * start and the season's first day. Null when that day is after the window
 * or after the season (the season is not reachable).
 */
export function earliestPlantingDate(plant: PlantTiming, lastSpringFrost: FrostDay, year: number, season: Season): Date | null {
  const window = plantingWindowOf(plant, lastSpringFrost, year);
  if (window === null) {
    return null;
  }
  const range = seasonRange(year, season);
  const start = window.start > range.start ? window.start : range.start;
  return start <= window.end && start <= range.end ? start : null;
}

/** The seasons of the planning year a planting can start in, in order */
export function reachableSeasonsOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): Season[] {
  return SEASONS.filter((season) => earliestPlantingDate(plant, lastSpringFrost, year, season) !== null);
}

/**
 * The seasons a planting starting in startSeason grows in: from its earliest
 * planting date until the latest harvest, at the latest the end of the
 * planning year's winter. None when the season is not reachable or there is
 * no harvest time.
 */
export function growingSeasonsFrom(plant: PlantTiming, lastSpringFrost: FrostDay, year: number, startSeason: Season): Season[] {
  const start = earliestPlantingDate(plant, lastSpringFrost, year, startSeason);
  const harvestDays = plant.daysToHarvest.max;
  if (start === null || !Number.isFinite(harvestDays) || harvestDays <= 0) {
    return [];
  }
  const lastDay = seasonRange(year, 'winter').end;
  const end = new Date(Math.min(plusDays(start, harvestDays).getTime(), lastDay.getTime()));
  return SEASONS.filter((season) => {
    const range = seasonRange(year, season);
    return start <= range.end && end >= range.start;
  });
}

/** Growing seasons of each plant's first planting for one planning year; unknown plants or no frost date give none */
export function seasonsLookup(
  year: number,
  lastSpringFrost: FrostDay | null,
  plantOf: (plantId: string) => PlantTiming | undefined,
): SeasonsOf {
  return (plantId) => {
    const plant = plantOf(plantId);
    if (plant === undefined || lastSpringFrost === null) {
      return [];
    }
    const first = reachableSeasonsOf(plant, lastSpringFrost, year)[0];
    return first === undefined ? [] : growingSeasonsFrom(plant, lastSpringFrost, year, first);
  };
}
