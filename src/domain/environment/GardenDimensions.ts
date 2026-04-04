import { validateGardenDimensions } from '@/schemas/environmentSchema';

/**
 * Data transfer object for garden dimensions
 */
export interface GardenDimensionsData {
  readonly widthInMeters: number;
  readonly heightInMeters: number;
}

/**
 * GardenDimensions is a value object representing physical dimensions.
 * It encapsulates width and height in meters and provides domain-specific calculations.
 *
 * Note: This class can be used for any rectangular dimensions (components, etc.)
 * The environment-level garden dimensions have been removed (infinite canvas).
 *
 * This is an immutable value object - all operations return new instances.
 */
export class GardenDimensions {
  private readonly _widthInMeters: number;
  private readonly _heightInMeters: number;

  private constructor(widthInMeters: number, heightInMeters: number) {
    this._widthInMeters = widthInMeters;
    this._heightInMeters = heightInMeters;
  }

  /**
   * Factory method to create a validated GardenDimensions instance
   * @throws Error if dimensions are invalid
   */
  static create(widthInMeters: number, heightInMeters: number): GardenDimensions {
    // Validate using Zod schema
    validateGardenDimensions({ widthInMeters, heightInMeters });
    return new GardenDimensions(widthInMeters, heightInMeters);
  }

  /**
   * Factory method to create from data object
   */
  static fromData(data: GardenDimensionsData): GardenDimensions {
    return GardenDimensions.create(data.widthInMeters, data.heightInMeters);
  }

  /**
   * Safely attempt to create dimensions, returning null if invalid
   */
  static tryCreate(widthInMeters: number, heightInMeters: number): GardenDimensions | null {
    try {
      return GardenDimensions.create(widthInMeters, heightInMeters);
    } catch {
      return null;
    }
  }

  get widthInMeters(): number {
    return this._widthInMeters;
  }

  get heightInMeters(): number {
    return this._heightInMeters;
  }

  /**
   * Calculate the total garden area in square meters
   */
  calculateAreaInSquareMeters(): number {
    return this._widthInMeters * this._heightInMeters;
  }

  /**
   * Get the width in centimeters
   */
  get widthInCentimeters(): number {
    return this._widthInMeters * 100;
  }

  /**
   * Get the height in centimeters
   */
  get heightInCentimeters(): number {
    return this._heightInMeters * 100;
  }

  /**
   * Calculate the perimeter of the garden in meters
   */
  calculatePerimeterInMeters(): number {
    return 2 * (this._widthInMeters + this._heightInMeters);
  }

  /**
   * Check if this garden is larger than another
   */
  isLargerThan(other: GardenDimensions): boolean {
    return this.calculateAreaInSquareMeters() > other.calculateAreaInSquareMeters();
  }

  /**
   * Check equality with another GardenDimensions instance
   */
  equals(other: GardenDimensions): boolean {
    return (
      this._widthInMeters === other._widthInMeters &&
      this._heightInMeters === other._heightInMeters
    );
  }

  /**
   * Serialize to plain data object for storage
   */
  toData(): GardenDimensionsData {
    return {
      widthInMeters: this._widthInMeters,
      heightInMeters: this._heightInMeters,
    };
  }

  /**
   * Get a formatted string representation
   */
  toString(): string {
    return `${this._widthInMeters}m x ${this._heightInMeters}m`;
  }
}
