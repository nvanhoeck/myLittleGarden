/**
 * CircularTower entity
 * Represents a circular tower with multiple layers for vertical gardening
 */

import type { CircularTowerData, CircularLayerDimensions, SunDirection } from '@/types';
import {
  CircularTowerLayer,
  CircularCustomLayerDimensions,
  createCircularTowerLayers,
  createCircularTowerLayersFromCustom,
} from './TowerLayer';

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
  /** Custom layer dimensions. If not provided, layers are auto-calculated with 0.85 reduction factor */
  readonly customLayers?: readonly CircularCustomLayerDimensions[];
}

/**
 * CircularTower domain entity
 * Encapsulates behavior for circular tower structures with layers
 */
export class CircularTower {
  private readonly _layers: readonly CircularTowerLayer[];
  private readonly _customLayers: readonly CircularLayerDimensions[] | undefined;

  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _sunDirection: SunDirection,
    private readonly _createdAt: Date,
    private readonly _diameterInCm: number,
    private readonly _borderWidthInCm: number,
    private readonly _numberOfLayers: number,
    customLayers?: readonly CircularLayerDimensions[]
  ) {
    this._customLayers = customLayers;
    // Use custom layers if provided, otherwise auto-calculate with 0.85 reduction factor
    if (customLayers && customLayers.length === _numberOfLayers) {
      this._layers = createCircularTowerLayersFromCustom(customLayers);
    } else {
      this._layers = createCircularTowerLayers(_numberOfLayers, _diameterInCm);
    }
  }

  /**
   * Create a new CircularTower
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
      params.customLayers
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
      data.customLayers
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

  get layers(): readonly CircularTowerLayer[] {
    return this._layers;
  }

  /**
   * Custom layer dimensions if using custom sizing (undefined means auto-calculated)
   */
  get customLayers(): readonly CircularLayerDimensions[] | undefined {
    return this._customLayers;
  }

  /**
   * Check if tower uses custom layer dimensions
   */
  get hasCustomLayers(): boolean {
    return this._customLayers !== undefined;
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

  // ===== Behavior =====

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
      this._customLayers
    );
  }

  /**
   * Convert to storage data
   */
  toData(): CircularTowerData {
    const baseData = {
      id: this._id,
      type: 'circularTower' as const,
      name: this._name,
      sunDirection: this._sunDirection,
      createdAt: this._createdAt.toISOString(),
      diameterInCm: this._diameterInCm,
      borderWidthInCm: this._borderWidthInCm,
      numberOfLayers: this._numberOfLayers,
      plants: [] as const,
    };
    // Only include customLayers if they exist
    if (this._customLayers) {
      return { ...baseData, customLayers: this._customLayers };
    }
    return baseData;
  }
}
