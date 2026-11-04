/**
 * PlantingWeek is a value object for one ISO-8601 week (Monday to Sunday).
 * The year is the ISO week-numbering year, so 1 January can belong to
 * week 52/53 of the previous year and 29 December to week 1 of the next.
 *
 * All date math is done in UTC so the result never depends on the device
 * timezone. A Date is read by its UTC calendar day, which matches ISO date
 * strings parsed with `new Date('YYYY-MM-DD')`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Monday = 0 ... Sunday = 6 */
function isoWeekday(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

function utcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Monday of ISO week 1: the week that contains 4 January. */
function mondayOfFirstWeek(year: number): number {
  const fourthOfJanuary = new Date(Date.UTC(year, 0, 4));
  return fourthOfJanuary.getTime() - isoWeekday(fourthOfJanuary) * DAY_MS;
}

export class PlantingWeek {
  readonly year: number;
  readonly week: number;

  private constructor(year: number, week: number) {
    this.year = year;
    this.week = week;
  }

  /**
   * @throws Error when the week does not exist in that year
   */
  static of(year: number, week: number): PlantingWeek {
    if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > PlantingWeek.weeksInYear(year)) {
      throw new Error(`Week ${week} bestaat niet in ${year}`);
    }
    return new PlantingWeek(year, week);
  }

  static containing(date: Date): PlantingWeek {
    const day = utcMidnight(date);
    // The Thursday of a week decides which year the week belongs to
    const thursday = new Date(day + (3 - isoWeekday(new Date(day))) * DAY_MS);
    const year = thursday.getUTCFullYear();
    const week = 1 + Math.floor((thursday.getTime() - mondayOfFirstWeek(year)) / WEEK_MS);
    return new PlantingWeek(year, week);
  }

  /** The week of the date's calendar day in the device timezone, e.g. for a stored `new Date().toISOString()` */
  static containingLocal(date: Date): PlantingWeek {
    return PlantingWeek.containing(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));
  }

  /** 52 or 53: 28 December always lies in the last week of its year. */
  static weeksInYear(year: number): number {
    return PlantingWeek.containing(new Date(Date.UTC(year, 11, 28))).week;
  }

  /** Monday of this week, at UTC midnight */
  firstDay(): Date {
    return new Date(mondayOfFirstWeek(this.year) + (this.week - 1) * WEEK_MS);
  }

  /** Sunday of this week, at UTC midnight */
  lastDay(): Date {
    return new Date(this.firstDay().getTime() + 6 * DAY_MS);
  }

  isBefore(other: PlantingWeek): boolean {
    return this.year < other.year || (this.year === other.year && this.week < other.week);
  }

  equals(other: PlantingWeek): boolean {
    return this.year === other.year && this.week === other.week;
  }

  /** Moves the given number of weeks (negative goes back), crossing years when needed. */
  plus(weeks: number): PlantingWeek {
    return PlantingWeek.containing(new Date(this.firstDay().getTime() + weeks * WEEK_MS));
  }
}
