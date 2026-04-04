/**
 * GardenBox entity
 * Represents a rectangular garden box for planting
 */

import type { GardenBoxData, SunDirection } from '@/types';
import { ComponentPosition } from './ComponentPosition';

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
    private readonly _borderWidthInCm: number,
    private readonly _position: ComponentPosition
  ) {}

  /**
   * Create a new GardenBox (not placed on canvas yet)
   */
  static create(params: CreateGardenBoxParams): GardenBox {
    return new GardenBox(
      params.id,
      params.name,
      params.sunDirection,
      new Date(),
      params.widthInCm,
      params.lengthInCm,
      params.borderWidthInCm,
      ComponentPosition.atOrigin()
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

  get widthInCm(): number {
    return this._widthInCm;
  }

  get lengthInCm(): number {
    return this._lengthInCm;
  }

  get borderWidthInCm(): number {
    return this._borderWidthInCm;
  }

  get position(): ComponentPosition {
    return this._position;
  }

  /**
   * Check if the box has been placed on the canvas
   */
  get isPlaced(): boolean {
    return !this._position.isUnplaced;
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

  /**
   * Width in meters (for canvas positioning)
   */
  get widthInMeters(): number {
    return this._widthInCm / 100;
  }

  /**
   * Length in meters (for canvas positioning)
   */
  get lengthInMeters(): number {
    return this._lengthInCm / 100;
  }

  // ===== Behavior =====

  /**
   * Move the box to a new position
   */
  moveTo(x: number, y: number): GardenBox {
    return new GardenBox(
      this._id,
      this._name,
      this._sunDirection,
      this._createdAt,
      this._widthInCm,
      this._lengthInCm,
      this._borderWidthInCm,
      this._position.moveTo(x, y)
    );
  }

  /**
   * Rotate the box
   */
  rotateTo(degrees: number): GardenBox {
    return new GardenBox(
      this._id,
      this._name,
      this._sunDirection,
      this._createdAt,
      this._widthInCm,
      this._lengthInCm,
      this._borderWidthInCm,
      this._position.rotateTo(degrees)
    );
  }

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
      this._borderWidthInCm,
      this._position
    );
  }

  /**
   * Convert to storage data
   */
  toData(): GardenBoxData {
    const positionData = this._position.toData();
    return {
      id: this._id,
      type: 'gardenBox',
      name: this._name,
      sunDirection: this._sunDirection,
      createdAt: this._createdAt.toISOString(),
      widthInCm: this._widthInCm,
      lengthInCm: this._lengthInCm,
      borderWidthInCm: this._borderWidthInCm,
      positionX: positionData.positionX,
      positionY: positionData.positionY,
      rotation: positionData.rotation,
      plants: [],
    };
  }
}
