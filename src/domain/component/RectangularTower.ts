/**
 * RectangularTower entity
 * Represents a rectangular tower with multiple layers for vertical gardening
 */

import type { RectangularTowerData, RectangularLayerDimensions, SunDirection } from '@/types';
import {
  RectangularTowerLayer,
  RectangularCustomLayerDimensions,
  createRectangularTowerLayers,
  createRectangularTowerLayersFromCustom,
} from './TowerLayer';

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
  /** Custom layer dimensions. If not provided, layers are auto-calculated with 0.85 reduction factor */
  readonly customLayers?: readonly RectangularCustomLayerDimensions[];
}

/**
 * RectangularTower domain entity
 * Encapsulates behavior for rectangular tower structures with layers
 */
export class RectangularTower {
  private readonly _layers: readonly RectangularTowerLayer[];
  private readonly _customLayers: readonly RectangularLayerDimensions[] | undefined;

  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _sunDirection: SunDirection,
    private readonly _createdAt: Date,
    private readonly _widthInCm: number,
    private readonly _lengthInCm: number,
    private readonly _borderWidthInCm: number,
    private readonly _numberOfLayers: number,
    customLayers?: readonly RectangularLayerDimensions[]
  ) {
    this._customLayers = customLayers;
    // Use custom layers if provided, otherwise auto-calculate with 0.85 reduction factor
    if (customLayers && customLayers.length === _numberOfLayers) {
      this._layers = createRectangularTowerLayersFromCustom(customLayers);
    } else {
      this._layers = createRectangularTowerLayers(
        _numberOfLayers,
        _widthInCm,
        _lengthInCm
      );
    }
  }

  /**
   * Create a new RectangularTower
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
      params.customLayers
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

  get layers(): readonly RectangularTowerLayer[] {
    return this._layers;
  }

  /**
   * Custom layer dimensions if using custom sizing (undefined means auto-calculated)
   */
  get customLayers(): readonly RectangularLayerDimensions[] | undefined {
    return this._customLayers;
  }

  /**
   * Check if tower uses custom layer dimensions
   */
  get hasCustomLayers(): boolean {
    return this._customLayers !== undefined;
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

  // ===== Behavior =====

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
      this._customLayers
    );
  }

  /**
   * Convert to storage data
   */
  toData(): RectangularTowerData {
    const baseData = {
      id: this._id,
      type: 'rectangularTower' as const,
      name: this._name,
      sunDirection: this._sunDirection,
      createdAt: this._createdAt.toISOString(),
      widthInCm: this._widthInCm,
      lengthInCm: this._lengthInCm,
      borderWidthInCm: this._borderWidthInCm,
      numberOfLayers: this._numberOfLayers,
      plants: [] as const,
      plantsToPlan: [] as const,
    };
    // Only include customLayers if they exist
    if (this._customLayers) {
      return { ...baseData, customLayers: this._customLayers };
    }
    return baseData;
  }
}
