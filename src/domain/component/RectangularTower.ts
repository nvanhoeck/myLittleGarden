/**
 * RectangularTower entity
 * Represents a rectangular tower with multiple layers for vertical gardening
 */

import type { RectangularTowerData, SunDirection } from '@/types';
import { ComponentPosition } from './ComponentPosition';
import { RectangularTowerLayer, createRectangularTowerLayers } from './TowerLayer';

/**
 * Creation parameters for a new RectangularTower
 */
export interface CreateRectangularTowerParams {
  readonly id: string;
  readonly name: string;
  readonly sunDirection: SunDirection;
  readonly widthInCm: number;
  readonly lengthInCm: number;
  readonly borderWidthInCm: number;
  readonly numberOfLayers: number;
}

/**
 * RectangularTower domain entity
 * Encapsulates behavior for rectangular tower structures with layers
 */
export class RectangularTower {
  private readonly _layers: readonly RectangularTowerLayer[];

  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _sunDirection: SunDirection,
    private readonly _createdAt: Date,
    private readonly _widthInCm: number,
    private readonly _lengthInCm: number,
    private readonly _borderWidthInCm: number,
    private readonly _numberOfLayers: number,
    private readonly _position: ComponentPosition
  ) {
    // Calculate layers based on base dimensions
    this._layers = createRectangularTowerLayers(
      _numberOfLayers,
      _widthInCm,
      _lengthInCm
    );
  }

  /**
   * Create a new RectangularTower (not placed on canvas yet)
   */
  static create(params: CreateRectangularTowerParams): RectangularTower {
    return new RectangularTower(
      params.id,
      params.name,
      params.sunDirection,
      new Date(),
      params.widthInCm,
      params.lengthInCm,
      params.borderWidthInCm,
      params.numberOfLayers,
      ComponentPosition.atOrigin()
    );
  }

  /**
   * Reconstruct a RectangularTower from storage data
   */
  static fromData(data: RectangularTowerData): RectangularTower {
    return new RectangularTower(
      data.id,
      data.name,
      data.sunDirection,
      new Date(data.createdAt),
      data.widthInCm,
      data.lengthInCm,
      data.borderWidthInCm,
      data.numberOfLayers,
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

  get numberOfLayers(): number {
    return this._numberOfLayers;
  }

  get position(): ComponentPosition {
    return this._position;
  }

  get layers(): readonly RectangularTowerLayer[] {
    return this._layers;
  }

  /**
   * Check if the tower has been placed on the canvas
   */
  get isPlaced(): boolean {
    return !this._position.isUnplaced;
  }

  /**
   * Get a specific layer by index
   */
  getLayer(index: number): RectangularTowerLayer | undefined {
    return this._layers[index];
  }

  /**
   * Calculate total planting area across all layers in cm2
   */
  get totalAreaCm2(): number {
    return this._layers.reduce((sum, layer) => sum + layer.areaCm2, 0);
  }

  /**
   * Base footprint area in cm2 (bottom layer)
   */
  get footprintAreaCm2(): number {
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
   * Move the tower to a new position
   */
  moveTo(x: number, y: number): RectangularTower {
    return new RectangularTower(
      this._id,
      this._name,
      this._sunDirection,
      this._createdAt,
      this._widthInCm,
      this._lengthInCm,
      this._borderWidthInCm,
      this._numberOfLayers,
      this._position.moveTo(x, y)
    );
  }

  /**
   * Rotate the tower
   */
  rotateTo(degrees: number): RectangularTower {
    return new RectangularTower(
      this._id,
      this._name,
      this._sunDirection,
      this._createdAt,
      this._widthInCm,
      this._lengthInCm,
      this._borderWidthInCm,
      this._numberOfLayers,
      this._position.rotateTo(degrees)
    );
  }

  /**
   * Update the tower name
   */
  rename(newName: string): RectangularTower {
    return new RectangularTower(
      this._id,
      newName,
      this._sunDirection,
      this._createdAt,
      this._widthInCm,
      this._lengthInCm,
      this._borderWidthInCm,
      this._numberOfLayers,
      this._position
    );
  }

  /**
   * Convert to storage data
   */
  toData(): RectangularTowerData {
    const positionData = this._position.toData();
    return {
      id: this._id,
      type: 'rectangularTower',
      name: this._name,
      sunDirection: this._sunDirection,
      createdAt: this._createdAt.toISOString(),
      widthInCm: this._widthInCm,
      lengthInCm: this._lengthInCm,
      borderWidthInCm: this._borderWidthInCm,
      numberOfLayers: this._numberOfLayers,
      positionX: positionData.positionX,
      positionY: positionData.positionY,
      rotation: positionData.rotation,
      plants: [],
    };
  }
}
