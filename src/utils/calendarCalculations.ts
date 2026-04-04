/**
 * Growing Calendar Calculations
 * Calculates planting dates based on frost dates and plant requirements.
 *
 * Weeks relative to last spring frost:
 * - Negative values = weeks BEFORE last spring frost
 * - Positive values = weeks AFTER last spring frost
 */

import type { PlantData } from '@/types/plant.types';

/**
 * Date range for a growing calendar phase
 */
export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

/**
 * Growing calendar data for a plant
 */
export interface GrowingCalendarData {
  readonly indoorStart: DateRange | null;
  readonly transplant: DateRange | null;
  readonly directSow: DateRange | null;
}

/**
 * Month labels in Dutch
 */
export const MONTH_LABELS_NL: readonly string[] = [
  'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
] as const;

/**
 * Full month names in Dutch
 */
export const MONTH_NAMES_NL: readonly string[] = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
] as const;

/**
 * Calculate a date by adding weeks to a base date
 */
function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/**
 * Create a date range centered around a calculated date
 * Adds a 2-week window (1 week before, 1 week after)
 */
function createDateRange(centerDate: Date): DateRange {
  return {
    start: addWeeks(centerDate, -1),
    end: addWeeks(centerDate, 1),
  };
}

/**
 * Calculate growing calendar dates for a plant based on frost dates
 *
 * @param plant - Plant data with growing week offsets
 * @param lastSpringFrost - ISO date string of last spring frost
 * @returns Growing calendar data with date ranges for each phase
 */
export function calculateGrowingCalendar(
  plant: PlantData,
  lastSpringFrost: string
): GrowingCalendarData {
  const frostDate = new Date(lastSpringFrost);

  // Calculate indoor start date range
  const indoorStart = plant.indoorStartWeeks !== null
    ? createDateRange(addWeeks(frostDate, plant.indoorStartWeeks))
    : null;

  // Calculate transplant date range
  const transplant = plant.transplantWeeks !== null
    ? createDateRange(addWeeks(frostDate, plant.transplantWeeks))
    : null;

  // Calculate direct sow date range
  const directSow = plant.directSowWeeks !== null
    ? createDateRange(addWeeks(frostDate, plant.directSowWeeks))
    : null;

  return {
    indoorStart,
    transplant,
    directSow,
  };
}

/**
 * Format a date in Dutch locale (e.g., "15 maart")
 */
export function formatDateNl(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES_NL[date.getMonth()];
  return `${day} ${month}`;
}

/**
 * Format a date range in Dutch (e.g., "15 maart - 30 maart")
 */
export function formatDateRangeNl(range: DateRange): string {
  return `${formatDateNl(range.start)} - ${formatDateNl(range.end)}`;
}

/**
 * Calculate the position (0-1) of a date within a year
 * Used for visual timeline positioning
 */
export function getYearPosition(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const endOfYear = new Date(date.getFullYear(), 11, 31);
  const yearDuration = endOfYear.getTime() - startOfYear.getTime();
  const datePosition = date.getTime() - startOfYear.getTime();
  return Math.max(0, Math.min(1, datePosition / yearDuration));
}

/**
 * Get the month index (0-11) for a date
 */
export function getMonthIndex(date: Date): number {
  return date.getMonth();
}

/**
 * Check if a date range spans into a specific month
 */
export function rangeSpansMonth(range: DateRange, monthIndex: number): boolean {
  const startMonth = range.start.getMonth();
  const endMonth = range.end.getMonth();

  if (startMonth <= endMonth) {
    return monthIndex >= startMonth && monthIndex <= endMonth;
  }
  // Range spans year boundary
  return monthIndex >= startMonth || monthIndex <= endMonth;
}

/**
 * Get calendar phase colors matching the Planter app design
 */
export const CALENDAR_COLORS = {
  indoorStart: '#E91E63', // Pink/Magenta
  transplant: '#FF9800',  // Orange
  directSow: '#4CAF50',   // Green
} as const;

/**
 * Format germination days as a range string
 */
export function formatDayRange(min: number, max: number): string {
  if (min === max) {
    return `${min}`;
  }
  return `${min}-${max}`;
}

/**
 * Format frost tolerance to Dutch label
 */
export function formatFrostToleranceNl(tolerance: string): string {
  switch (tolerance) {
    case 'tender':
      return 'Vorstgevoelig';
    case 'semi-hardy':
      return 'Licht vorstbestendig';
    case 'hardy':
      return 'Vorstbestendig';
    default:
      return tolerance;
  }
}

/**
 * Format sun requirement to Dutch label
 */
export function formatSunRequirementNl(sun: string): string {
  switch (sun) {
    case 'full':
      return 'Volle zon';
    case 'partial':
      return 'Halfschaduw';
    case 'shade':
      return 'Schaduw';
    default:
      return sun;
  }
}

/**
 * Format water requirement to Dutch label
 */
export function formatWaterRequirementNl(water: string): string {
  switch (water) {
    case 'low':
      return 'Weinig';
    case 'moderate':
      return 'Matig';
    case 'high':
      return 'Veel';
    default:
      return water;
  }
}
