/**
 * GardenBox entity
 * Represents a rectangular garden box for planting
 */

import type { GardenBoxData, SunDirection } from '@/types';

/**
 * Creation parameters for a new GardenBox
 */
export interface CreateGardenBoxParams {
  readonly id: string;
  readonly name: string;
  readonly sunDirection: SunDirection;
  readonly widthInCm: number;
  readonly lengthInCm: number;
  readonly borderWidthInCm: number;
}

/**
 * GardenBox domain entity
 * Encapsulates behavior for rectangular garden boxes
 */
export class GardenBox {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _sunDirection: SunDirection,
    private readonly _createdAt: Date,
    private readonly _widthInCm: number,
    private readonly _lengthInCm: number,
    private readonly _borderWidthInCm: number
  ) {}

  /**
   * Create a new GardenBox
   */
  static create(params: CreateGardenBoxParams): GardenBox {
    return new GardenBox(
      params.id,
      params.name,
      params.sunDirection,
      new Date(),
      params.widthInCm,
      params.lengthInCm,
      params.borderWidthInCm
    );
  }

  /**
   * Reconstruct a GardenBox from storage data
   */
  static fromData(data: GardenBoxData): GardenBox {
    return new GardenBox(
      data.id,
      data.name,
      data.sunDirection,
      new Date(data.createdAt),
      data.widthInCm,
      data.lengthInCm,
      data.borderWidthInCm
    );
  }

  // ===== Getters =====

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get sunDirection(): SunDirection {
    return this._sunDirection;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get widthInCm(): number {
    return this._widthInCm;
  }

  get lengthInCm(): number {
    return this._lengthInCm;
  }

  get borderWidthInCm(): number {
    return this._borderWidthInCm;
  }

  /**
   * Calculate inner planting area (excluding borders) in cm2
   */
  get innerAreaCm2(): number {
    const innerWidth = this._widthInCm - 2 * this._borderWidthInCm;
    const innerLength = this._lengthInCm - 2 * this._borderWidthInCm;
    return Math.max(0, innerWidth * innerLength);
  }

  /**
   * Calculate outer area (including borders) in cm2
   */
  get outerAreaCm2(): number {
    return this._widthInCm * this._lengthInCm;
  }

  // ===== Behavior =====

  /**
   * Update the box name
   */
  rename(newName: string): GardenBox {
    return new GardenBox(
      this._id,
      newName,
      this._sunDirection,
      this._createdAt,
      this._widthInCm,
      this._lengthInCm,
      this._borderWidthInCm
    );
  }

  /**
   * Convert to storage data
   */
  toData(): GardenBoxData {
    return {
      id: this._id,
      type: 'gardenBox',
      name: this._name,
      sunDirection: this._sunDirection,
      createdAt: this._createdAt.toISOString(),
      widthInCm: this._widthInCm,
      lengthInCm: this._lengthInCm,
      borderWidthInCm: this._borderWidthInCm,
      plants: [],
      plantsToPlan: [],
    };
  }
}
