import { FrostPeriodData } from '@/types/environment.types';
import { validateFrostPeriod } from '@/schemas/environmentSchema';

/**
 * FrostPeriod is a value object representing the frost-free growing season.
 * It encapsulates the last spring frost date and first fall frost date,
 * providing calculations for the growing season duration.
 *
 * This is an immutable value object - all operations return new instances.
 */
export class FrostPeriod {
  private readonly _lastSpringFrost: Date;
  private readonly _firstFallFrost: Date;

  private constructor(lastSpringFrost: Date, firstFallFrost: Date) {
    this._lastSpringFrost = lastSpringFrost;
    this._firstFallFrost = firstFallFrost;
  }

  /**
   * Factory method to create a validated FrostPeriod instance from Date objects
   * @throws Error if dates are invalid or spring date is after fall date
   */
  static create(lastSpringFrost: Date, firstFallFrost: Date): FrostPeriod {
    const springStr = FrostPeriod.dateToISOString(lastSpringFrost);
    const fallStr = FrostPeriod.dateToISOString(firstFallFrost);

    // Validate using Zod schema
    validateFrostPeriod({
      lastSpringFrost: springStr,
      firstFallFrost: fallStr,
    });

    return new FrostPeriod(lastSpringFrost, firstFallFrost);
  }

  /**
   * Factory method to create from ISO date strings
   * @throws Error if dates are invalid
   */
  static fromStrings(lastSpringFrost: string, firstFallFrost: string): FrostPeriod {
    // Validate using Zod schema
    validateFrostPeriod({
      lastSpringFrost,
      firstFallFrost,
    });

    return new FrostPeriod(
      new Date(lastSpringFrost),
      new Date(firstFallFrost)
    );
  }

  /**
   * Factory method to create from data object
   */
  static fromData(data: FrostPeriodData): FrostPeriod {
    return FrostPeriod.fromStrings(data.lastSpringFrost, data.firstFallFrost);
  }

  /**
   * Safely attempt to create frost period, returning null if invalid
   */
  static tryCreate(lastSpringFrost: Date, firstFallFrost: Date): FrostPeriod | null {
    try {
      return FrostPeriod.create(lastSpringFrost, firstFallFrost);
    } catch {
      return null;
    }
  }

  /**
   * Safely attempt to create from strings, returning null if invalid
   */
  static tryFromStrings(lastSpringFrost: string, firstFallFrost: string): FrostPeriod | null {
    try {
      return FrostPeriod.fromStrings(lastSpringFrost, firstFallFrost);
    } catch {
      return null;
    }
  }

  /**
   * Helper to convert Date to ISO date string (YYYY-MM-DD)
   */
  private static dateToISOString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  get lastSpringFrost(): Date {
    return new Date(this._lastSpringFrost);
  }

  get firstFallFrost(): Date {
    return new Date(this._firstFallFrost);
  }

  get lastSpringFrostString(): string {
    return FrostPeriod.dateToISOString(this._lastSpringFrost);
  }

  get firstFallFrostString(): string {
    return FrostPeriod.dateToISOString(this._firstFallFrost);
  }

  /**
   * Calculate the number of frost-free growing days
   */
  calculateGrowingSeasonDays(): number {
    const diffTime = this._firstFallFrost.getTime() - this._lastSpringFrost.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate the number of growing weeks
   */
  calculateGrowingSeasonWeeks(): number {
    return Math.floor(this.calculateGrowingSeasonDays() / 7);
  }

  /**
   * Check if a given date falls within the growing season
   */
  isWithinGrowingSeason(date: Date): boolean {
    return date >= this._lastSpringFrost && date <= this._firstFallFrost;
  }

  /**
   * Get the midpoint of the growing season
   */
  getMidSeasonDate(): Date {
    const midTime =
      (this._lastSpringFrost.getTime() + this._firstFallFrost.getTime()) / 2;
    return new Date(midTime);
  }

  /**
   * Check equality with another FrostPeriod instance
   */
  equals(other: FrostPeriod): boolean {
    return (
      this._lastSpringFrost.getTime() === other._lastSpringFrost.getTime() &&
      this._firstFallFrost.getTime() === other._firstFallFrost.getTime()
    );
  }

  /**
   * Serialize to plain data object for storage
   */
  toData(): FrostPeriodData {
    return {
      lastSpringFrost: this.lastSpringFrostString,
      firstFallFrost: this.firstFallFrostString,
    };
  }

  /**
   * Get a formatted string representation
   */
  toString(): string {
    return `${this.lastSpringFrostString} - ${this.firstFallFrostString} (${this.calculateGrowingSeasonDays()} dagen)`;
  }
}
