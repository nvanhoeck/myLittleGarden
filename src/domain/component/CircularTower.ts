/**
 * CircularTower entity
 * Represents a circular tower with multiple layers for vertical gardening
 */

import type { CircularTowerData, SunDirection } from '@/types';
import { ComponentPosition } from './ComponentPosition';
import { CircularTowerLayer, createCircularTowerLayers } from './TowerLayer';

/**
 * Creation parameters for a new CircularTower
 */
export interface CreateCircularTowerParams {
  readonly id: string;
  readonly name: string;
  readonly sunDirection: SunDirection;
  readonly diameterInCm: number;
  readonly borderWidthInCm: number;
  readonly numberOfLayers: number;
}

/**
 * CircularTower domain entity
 * Encapsulates behavior for circular tower structures with layers
 */
export class CircularTower {
  private readonly _layers: readonly CircularTowerLayer[];

  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _sunDirection: SunDirection,
    private readonly _createdAt: Date,
    private readonly _diameterInCm: number,
    private readonly _borderWidthInCm: number,
    private readonly _numberOfLayers: number,
    private readonly _position: ComponentPosition
  ) {
    // Calculate layers based on base diameter
    this._layers = createCircularTowerLayers(_numberOfLayers, _diameterInCm);
  }

  /**
   * Create a new CircularTower (not placed on canvas yet)
   */
  static create(params: CreateCircularTowerParams): CircularTower {
    return new CircularTower(
      params.id,
      params.name,
      params.sunDirection,
      new Date(),
      params.diameterInCm,
      params.borderWidthInCm,
      params.numberOfLayers,
      ComponentPosition.atOrigin()
    );
  }

  /**
   * Reconstruct a CircularTower from storage data
   */
  static fromData(data: CircularTowerData): CircularTower {
    return new CircularTower(
      data.id,
      data.name,
      data.sunDirection,
      new Date(data.createdAt),
      data.diameterInCm,
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

  get diameterInCm(): number {
    return this._diameterInCm;
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

  get layers(): readonly CircularTowerLayer[] {
    return this._layers;
  }

  /**
   * Check if the tower has been placed on the canvas
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
   * Get a specific layer by index
   */
  getLayer(index: number): CircularTowerLayer | undefined {
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
   * Move the tower to a new position
   */
  moveTo(x: number, y: number): CircularTower {
    return new CircularTower(
      this._id,
      this._name,
      this._sunDirection,
      this._createdAt,
      this._diameterInCm,
      this._borderWidthInCm,
      this._numberOfLayers,
      this._position.moveTo(x, y)
    );
  }

  /**
   * Rotate the tower
   */
  rotateTo(degrees: number): CircularTower {
    return new CircularTower(
      this._id,
      this._name,
      this._sunDirection,
      this._createdAt,
      this._diameterInCm,
      this._borderWidthInCm,
      this._numberOfLayers,
      this._position.rotateTo(degrees)
    );
  }

  /**
   * Update the tower name
   */
  rename(newName: string): CircularTower {
    return new CircularTower(
      this._id,
      newName,
      this._sunDirection,
      this._createdAt,
      this._diameterInCm,
      this._borderWidthInCm,
      this._numberOfLayers,
      this._position
    );
  }

  /**
   * Convert to storage data
   */
  toData(): CircularTowerData {
    const positionData = this._position.toData();
    return {
      id: this._id,
      type: 'circularTower',
      name: this._name,
      sunDirection: this._sunDirection,
      createdAt: this._createdAt.toISOString(),
      diameterInCm: this._diameterInCm,
      borderWidthInCm: this._borderWidthInCm,
      numberOfLayers: this._numberOfLayers,
      positionX: positionData.positionX,
      positionY: positionData.positionY,
      rotation: positionData.rotation,
      plants: [],
    };
  }
}
