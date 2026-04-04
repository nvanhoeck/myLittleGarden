import type { GardenEnvironmentStorageData } from '@/types/environment.types';
import { FrostPeriod } from './FrostPeriod';
import { safeValidateFrostPeriod } from '@/schemas/environmentSchema';

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * GardenEnvironment is the aggregate root for garden environment configuration.
 * It manages the frost period configuration for the garden.
 *
 * Note: Garden dimensions have been removed as the canvas is infinite (Miro-style).
 * Sun direction has been moved to the Component level for microclimate considerations.
 *
 * This entity manages the state of a garden's environmental configuration
 * and provides commands for modifying each aspect while maintaining consistency.
 */
export class GardenEnvironment {
  private _frostPeriod: FrostPeriod | null;

  private constructor(frostPeriod: FrostPeriod | null) {
    this._frostPeriod = frostPeriod;
  }

  /**
   * Factory method to create an empty (unconfigured) garden environment
   */
  static createEmpty(): GardenEnvironment {
    return new GardenEnvironment(null);
  }

  /**
   * Factory method to hydrate from persisted storage data
   */
  static fromStorageData(data: GardenEnvironmentStorageData): GardenEnvironment {
    let frostPeriod: FrostPeriod | null = null;

    // Restore frost period
    if (data.lastSpringFrost !== null && data.firstFallFrost !== null) {
      frostPeriod = FrostPeriod.tryFromStrings(
        data.lastSpringFrost,
        data.firstFallFrost
      );
    }

    return new GardenEnvironment(frostPeriod);
  }

  // ===== Queries =====

  get frostPeriod(): FrostPeriod | null {
    return this._frostPeriod;
  }

  /**
   * Check if frost period has been configured
   */
  hasFrostPeriod(): boolean {
    return this._frostPeriod !== null;
  }

  /**
   * Check if environment settings have been configured
   */
  isFullyConfigured(): boolean {
    return this.hasFrostPeriod();
  }

  /**
   * Get the growing season length if frost period is configured
   */
  getGrowingSeasonDays(): number | null {
    return this._frostPeriod?.calculateGrowingSeasonDays() ?? null;
  }

  // ===== Commands =====

  /**
   * Set the frost period from Date objects
   * @throws Error if dates are invalid
   */
  setFrostPeriod(lastSpringFrost: Date, firstFallFrost: Date): void {
    this._frostPeriod = FrostPeriod.create(lastSpringFrost, firstFallFrost);
  }

  /**
   * Set the frost period from a FrostPeriod value object
   */
  setFrostPeriodFromObject(frostPeriod: FrostPeriod): void {
    this._frostPeriod = frostPeriod;
  }

  /**
   * Set the frost period from ISO date strings
   * @throws Error if dates are invalid
   */
  setFrostPeriodFromStrings(lastSpringFrost: string, firstFallFrost: string): void {
    this._frostPeriod = FrostPeriod.fromStrings(lastSpringFrost, firstFallFrost);
  }

  /**
   * Clear the frost period
   */
  clearFrostPeriod(): void {
    this._frostPeriod = null;
  }

  /**
   * Reset all configuration to empty state
   */
  reset(): void {
    this._frostPeriod = null;
  }

  // ===== Serialization =====

  /**
   * Serialize to storage data format for persistence
   */
  toStorageData(): GardenEnvironmentStorageData {
    return {
      lastSpringFrost: this._frostPeriod?.lastSpringFrostString ?? null,
      firstFallFrost: this._frostPeriod?.firstFallFrostString ?? null,
    };
  }

  /**
   * Create a copy of this garden environment
   */
  clone(): GardenEnvironment {
    return GardenEnvironment.fromStorageData(this.toStorageData());
  }

  // ===== Validation Methods =====

  /**
   * Validate frost dates
   * @param springFrostDate - Last spring frost date in ISO format or null
   * @param fallFrostDate - First fall frost date in ISO format or null
   */
  static validateFrostDates(
    springFrostDate: string | null,
    fallFrostDate: string | null
  ): ValidationResult {
    const errors: string[] = [];

    if (!springFrostDate) {
      errors.push('Selecteer de laatste lentevorst datum');
    }
    if (!fallFrostDate) {
      errors.push('Selecteer de eerste herfstvorst datum');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const result = safeValidateFrostPeriod({
      lastSpringFrost: springFrostDate!,
      firstFallFrost: fallFrostDate!,
    });

    if (!result.success) {
      return {
        isValid: false,
        errors: result.error.errors.map((err) => err.message),
      };
    }

    return { isValid: true, errors: [] };
  }
}
