/**
 * Pot entity
 * Represents a circular pot for planting
 */

import type { PotData, SunDirection } from '@/types';
import { ComponentPosition } from './ComponentPosition';

/**
 * Creation parameters for a new Pot
 */
export interface CreatePotParams {
  readonly id: string;
  readonly name: string;
  readonly sunDirection: SunDirection;
  readonly diameterInCm: number;
  readonly borderWidthInCm: number;
}

/**
 * Pot domain entity
 * Encapsulates behavior for circular pots
 */
export class Pot {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _sunDirection: SunDirection,
    private readonly _createdAt: Date,
    private readonly _diameterInCm: number,
    private readonly _borderWidthInCm: number,
    private readonly _position: ComponentPosition
  ) {}

  /**
   * Create a new Pot (not placed on canvas yet)
   */
  static create(params: CreatePotParams): Pot {
    return new Pot(
      params.id,
      params.name,
      params.sunDirection,
      new Date(),
      params.diameterInCm,
      params.borderWidthInCm,
      ComponentPosition.atOrigin()
    );
  }

  /**
   * Reconstruct a Pot from storage data
   */
  static fromData(data: PotData): Pot {
    return new Pot(
      data.id,
      data.name,
      data.sunDirection,
      new Date(data.createdAt),
      data.diameterInCm,
      data.borderWidthInCm,
      ComponentPosition.fromData({
        positionX: data.positionX,
        positionY: data.positionY,
        rotation: data.rotation,
      })
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

  get diameterInCm(): number {
    return this._diameterInCm;
  }

  get borderWidthInCm(): number {
    return this._borderWidthInCm;
  }

  get position(): ComponentPosition {
    return this._position;
  }

  /**
   * Check if the pot has been placed on the canvas
   */
  get isPlaced(): boolean {
    return !this._position.isUnplaced;
  }

  /**
   * Radius in centimeters
   */
  get radiusInCm(): number {
    return this._diameterInCm / 2;
  }

  /**
   * Inner radius (excluding border) in centimeters
   */
  get innerRadiusInCm(): number {
    return Math.max(0, this.radiusInCm - this._borderWidthInCm);
  }

  /**
   * Calculate inner planting area (excluding border) in cm2
   */
  get innerAreaCm2(): number {
    return Math.PI * Math.pow(this.innerRadiusInCm, 2);
  }

  /**
   * Calculate outer area (including border) in cm2
   */
  get outerAreaCm2(): number {
    return Math.PI * Math.pow(this.radiusInCm, 2);
  }

  /**
   * Diameter in meters (for canvas positioning)
   */
  get diameterInMeters(): number {
    return this._diameterInCm / 100;
  }

  // ===== Behavior =====

  /**
   * Move the pot to a new position
   */
  moveTo(x: number, y: number): Pot {
    return new Pot(
      this._id,
      this._name,
      this._sunDirection,
      this._createdAt,
      this._diameterInCm,
      this._borderWidthInCm,
      this._position.moveTo(x, y)
    );
  }

  /**
   * Rotate the pot (although circular, rotation matters for sun direction display)
   */
  rotateTo(degrees: number): Pot {
    return new Pot(
      this._id,
      this._name,
      this._sunDirection,
      this._createdAt,
      this._diameterInCm,
      this._borderWidthInCm,
      this._position.rotateTo(degrees)
    );
  }

  /**
   * Update the pot name
   */
  rename(newName: string): Pot {
    return new Pot(
      this._id,
      newName,
      this._sunDirection,
      this._createdAt,
      this._diameterInCm,
      this._borderWidthInCm,
      this._position
    );
  }

  /**
   * Convert to storage data
   */
  toData(): PotData {
    const positionData = this._position.toData();
    return {
      id: this._id,
      type: 'pot',
      name: this._name,
      sunDirection: this._sunDirection,
      createdAt: this._createdAt.toISOString(),
      diameterInCm: this._diameterInCm,
      borderWidthInCm: this._borderWidthInCm,
      positionX: positionData.positionX,
      positionY: positionData.positionY,
      rotation: positionData.rotation,
      plants: [],
    };
  }
}
