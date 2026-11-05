import type { PlantData } from '../../types/plant.types.ts';
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
export type PlantTiming = Pick<PlantData, 'indoorStartWeeks' | 'transplantWeeks' | 'directSowWeeks' | 'daysToHarvest'>;

export interface PlantingDates {
  readonly indoorStart: Date | null;
  readonly transplant: Date | null;
  readonly directSow: Date | null;
}

/** The days a plant occupies its spot outside, both inclusive */
export interface OutdoorPeriod {
  readonly start: Date;
  readonly end: Date;
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

/**
 * The sowing and planting dates of a plant in a planning year: the last
 * spring frost plus the catalog's weeks (negative = before the frost).
 * The Plant Details calendar and the season calculation both use these dates.
 */
export function plantingDatesOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): PlantingDates {
  const frost = frostDateIn(year, lastSpringFrost);
  const at = (weeks: number | null): Date | null => (weeks === null ? null : plusDays(frost, weeks * DAYS_PER_WEEK));
  return {
    indoorStart: at(plant.indoorStartWeeks),
    transplant: at(plant.transplantWeeks),
    directSow: at(plant.directSowWeeks),
  };
}

/**
 * When the plant is in the component: from transplanting (or direct sowing
 * when it is not transplanted) until the latest harvest, at the latest the
 * end of the planning year's winter. Null without planting weeks or harvest time.
 */
export function outdoorPeriodOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): OutdoorPeriod | null {
  const dates = plantingDatesOf(plant, lastSpringFrost, year);
  const start = dates.transplant ?? dates.directSow;
  const harvestDays = plant.daysToHarvest.max;
  if (start === null || !Number.isFinite(harvestDays) || harvestDays <= 0) {
    return null;
  }
  const lastDay = seasonRange(year, 'winter').end;
  return { start, end: new Date(Math.min(plusDays(start, harvestDays).getTime(), lastDay.getTime())) };
}

/** The seasons of the planning year the plant's outdoor period overlaps, in order; none without a calendar */
export function growingSeasonsOf(plant: PlantTiming, lastSpringFrost: FrostDay, year: number): Season[] {
  const period = outdoorPeriodOf(plant, lastSpringFrost, year);
  if (period === null) {
    return [];
  }
  return SEASONS.filter((season) => {
    const range = seasonRange(year, season);
    return period.start <= range.end && period.end >= range.start;
  });
}

/** Growing seasons by plant id for one planning year; unknown plants or no frost date give none */
export function seasonsLookup(
  year: number,
  lastSpringFrost: FrostDay | null,
  plantOf: (plantId: string) => PlantTiming | undefined,
): SeasonsOf {
  return (plantId) => {
    const plant = plantOf(plantId);
    return plant !== undefined && lastSpringFrost !== null ? growingSeasonsOf(plant, lastSpringFrost, year) : [];
  };
}
