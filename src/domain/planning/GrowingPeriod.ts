import type { PlantData } from '../../types/plant.types.ts';
import { PlantingWeek } from './PlantingWeek.ts';

export type PlantingMethod = 'transplant' | 'directSow';

export interface GrowingPeriodData {
  readonly year: number;
  readonly startWeek: number;
  readonly endWeek: number;
  readonly method: PlantingMethod;
}

/** A day in the year without a year, such as the garden's frost dates */
export interface FrostDay {
  /** 1-12 */
  readonly month: number;
  readonly day: number;
}

/** The garden's frost days applied to the year being planned */
export interface PlanningContext {
  readonly year: number;
  readonly lastSpringFrost: FrostDay;
  /** Reserved for a harvest window that ends at the first fall frost */
  readonly firstFallFrost?: FrostDay;
}

/** The catalog fields that decide when a plant is in the ground */
export type PlantTiming = Pick<PlantData, 'transplantWeeks' | 'directSowWeeks' | 'daysToHarvest'>;

const DAYS_PER_WEEK = 7;

/**
 * The frost day as a UTC date in the given year. A day that does not exist
 * in that month (29 February in a non-leap year) becomes its last day.
 * @throws Error when the month is not 1-12
 */
function frostDateIn(year: number, frostDay: FrostDay): Date {
  if (!Number.isInteger(frostDay.month) || frostDay.month < 1 || frostDay.month > 12) {
    throw new Error(`Ongeldige maand ${frostDay.month}`);
  }
  const daysInMonth = new Date(Date.UTC(year, frostDay.month, 0)).getUTCDate();
  return new Date(Date.UTC(year, frostDay.month - 1, Math.min(Math.max(1, frostDay.day), daysInMonth)));
}

/**
 * GrowingPeriod is a value object for the weeks a plant occupies its spot:
 * from planting (transplant or direct sow) until harvest, both weeks
 * inclusive and always within one planning year.
 */
export class GrowingPeriod implements GrowingPeriodData {
  readonly year: number;
  readonly startWeek: number;
  readonly endWeek: number;
  readonly method: PlantingMethod;

  private constructor(data: GrowingPeriodData) {
    this.year = data.year;
    this.startWeek = data.startWeek;
    this.endWeek = data.endWeek;
    this.method = data.method;
  }

  /**
   * @throws Error when a week does not exist in the year or the end is before the start
   */
  static create(data: GrowingPeriodData): GrowingPeriod {
    PlantingWeek.of(data.year, data.startWeek);
    PlantingWeek.of(data.year, data.endWeek);
    if (data.endWeek < data.startWeek) {
      throw new Error(`Groeiperiode eindigt (week ${data.endWeek}) voor ze begint (week ${data.startWeek})`);
    }
    return new GrowingPeriod(data);
  }

  /**
   * Derives the period from the catalog:
   * start = week of (last spring frost + transplantWeeks/directSowWeeks + shiftWeeks),
   * end = start + ceil(daysToHarvest.max / 7), capped at the last week of the year.
   * daysToHarvest counts from transplanting or from sowing, depending on the method.
   *
   * Returns null when the plant has no timing for the method, no valid harvest
   * time, or a start outside the year.
   */
  static fromCatalog(
    plant: PlantTiming,
    method: PlantingMethod,
    context: PlanningContext,
    shiftWeeks = 0,
  ): GrowingPeriod | null {
    const weeksFromFrost = method === 'transplant' ? plant.transplantWeeks : plant.directSowWeeks;
    const harvestDays = plant.daysToHarvest.max;
    if (weeksFromFrost === null || !Number.isFinite(harvestDays) || harvestDays <= 0) {
      return null;
    }

    const frostWeek = PlantingWeek.containing(frostDateIn(context.year, context.lastSpringFrost));
    const start = frostWeek.plus(weeksFromFrost + shiftWeeks);
    if (start.year !== context.year) {
      return null;
    }

    const endWeek = Math.min(start.week + Math.ceil(harvestDays / DAYS_PER_WEEK), PlantingWeek.weeksInYear(context.year));
    return GrowingPeriod.create({ year: context.year, startWeek: start.week, endWeek, method });
  }

  /** Number of weeks two periods share (0 when they do not overlap); works on stored data too */
  static sharedWeeks(a: GrowingPeriodData, b: GrowingPeriodData): number {
    if (a.year !== b.year) {
      return 0;
    }
    return Math.max(0, Math.min(a.endWeek, b.endWeek) - Math.max(a.startWeek, b.startWeek) + 1);
  }

  /** Whether the period includes the week; works on stored data too */
  static covers(period: GrowingPeriodData, week: PlantingWeek): boolean {
    return week.year === period.year && week.week >= period.startWeek && week.week <= period.endWeek;
  }

  get lengthInWeeks(): number {
    return this.endWeek - this.startWeek + 1;
  }

  includes(week: PlantingWeek): boolean {
    return GrowingPeriod.covers(this, week);
  }

  overlappingWeeks(other: GrowingPeriodData): number {
    return GrowingPeriod.sharedWeeks(this, other);
  }

  overlaps(other: GrowingPeriodData): boolean {
    return GrowingPeriod.sharedWeeks(this, other) > 0;
  }

  equals(other: GrowingPeriodData): boolean {
    return (
      this.year === other.year &&
      this.startWeek === other.startWeek &&
      this.endWeek === other.endWeek &&
      this.method === other.method
    );
  }

  /** Serialize to plain data object for storage */
  toData(): GrowingPeriodData {
    return { year: this.year, startWeek: this.startWeek, endWeek: this.endWeek, method: this.method };
  }
}
