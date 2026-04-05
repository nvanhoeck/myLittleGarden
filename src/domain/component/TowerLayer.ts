/**
 * TowerLayer value object
 * Represents a single layer in a tower component
 * Each layer is 15% smaller than the layer below it
 */

/**
 * Reduction factor per layer (15% smaller)
 */
const LAYER_REDUCTION_FACTOR = 0.85;

/**
 * Data structure for rectangular tower layer
 */
export interface RectangularLayerData {
  readonly layerIndex: number;
  readonly widthCm: number;
  readonly lengthCm: number;
}

/**
 * Data structure for circular tower layer
 */
export interface CircularLayerData {
  readonly layerIndex: number;
  readonly diameterCm: number;
}

/**
 * Value object for a rectangular tower layer
 * Immutable - dimensions are calculated from base dimensions and layer index
 */
export class RectangularTowerLayer {
  private constructor(
    private readonly _layerIndex: number,
    private readonly _widthCm: number,
    private readonly _lengthCm: number
  ) {}

  /**
   * Create a rectangular tower layer
   * @param layerIndex 0-based index (0 = bottom layer)
   * @param baseWidthCm Width of the bottom layer in cm
   * @param baseLengthCm Length of the bottom layer in cm
   */
  static create(
    layerIndex: number,
    baseWidthCm: number,
    baseLengthCm: number
  ): RectangularTowerLayer {
    const reductionFactor = Math.pow(LAYER_REDUCTION_FACTOR, layerIndex);
    const width = Math.round(baseWidthCm * reductionFactor * 100) / 100;
    const length = Math.round(baseLengthCm * reductionFactor * 100) / 100;
    return new RectangularTowerLayer(layerIndex, width, length);
  }

  /**
   * Create from storage data
   */
  static fromData(data: RectangularLayerData): RectangularTowerLayer {
    return new RectangularTowerLayer(data.layerIndex, data.widthCm, data.lengthCm);
  }

  /**
   * Layer index (0 = bottom)
   */
  get layerIndex(): number {
    return this._layerIndex;
  }

  /**
   * Width in centimeters
   */
  get widthCm(): number {
    return this._widthCm;
  }

  /**
   * Length in centimeters
   */
  get lengthCm(): number {
    return this._lengthCm;
  }

  /**
   * Calculate usable planting area in square centimeters
   */
  get areaCm2(): number {
    return this._widthCm * this._lengthCm;
  }

  /**
   * Convert to plain data object
   */
  toData(): RectangularLayerData {
    return {
      layerIndex: this._layerIndex,
      widthCm: this._widthCm,
      lengthCm: this._lengthCm,
    };
  }
}

/**
 * Value object for a circular tower layer
 * Immutable - dimensions are calculated from base diameter and layer index
 */
export class CircularTowerLayer {
  private constructor(
    private readonly _layerIndex: number,
    private readonly _diameterCm: number
  ) {}

  /**
   * Create a circular tower layer
   * @param layerIndex 0-based index (0 = bottom layer)
   * @param baseDiameterCm Diameter of the bottom layer in cm
   */
  static create(layerIndex: number, baseDiameterCm: number): CircularTowerLayer {
    const reductionFactor = Math.pow(LAYER_REDUCTION_FACTOR, layerIndex);
    const diameter = Math.round(baseDiameterCm * reductionFactor * 100) / 100;
    return new CircularTowerLayer(layerIndex, diameter);
  }

  /**
   * Create from storage data
   */
  static fromData(data: CircularLayerData): CircularTowerLayer {
    return new CircularTowerLayer(data.layerIndex, data.diameterCm);
  }

  /**
   * Layer index (0 = bottom)
   */
  get layerIndex(): number {
    return this._layerIndex;
  }

  /**
   * Diameter in centimeters
   */
  get diameterCm(): number {
    return this._diameterCm;
  }

  /**
   * Radius in centimeters
   */
  get radiusCm(): number {
    return this._diameterCm / 2;
  }

  /**
   * Calculate usable planting area in square centimeters
   */
  get areaCm2(): number {
    return Math.PI * Math.pow(this.radiusCm, 2);
  }

  /**
   * Convert to plain data object
   */
  toData(): CircularLayerData {
    return {
      layerIndex: this._layerIndex,
      diameterCm: this._diameterCm,
    };
  }
}

/**
 * Custom layer dimensions for rectangular tower
 */
export interface RectangularCustomLayerDimensions {
  readonly widthCm: number;
  readonly lengthCm: number;
}

/**
 * Generate all layers for a rectangular tower using auto-calculation (0.85 reduction factor)
 */
export function createRectangularTowerLayers(
  numberOfLayers: number,
  baseWidthCm: number,
  baseLengthCm: number
): RectangularTowerLayer[] {
  const layers: RectangularTowerLayer[] = [];
  for (let i = 0; i < numberOfLayers; i++) {
    layers.push(RectangularTowerLayer.create(i, baseWidthCm, baseLengthCm));
  }
  return layers;
}

/**
 * Generate rectangular tower layers from custom dimensions
 */
export function createRectangularTowerLayersFromCustom(
  customLayers: readonly RectangularCustomLayerDimensions[]
): RectangularTowerLayer[] {
  return customLayers.map((layer, index) =>
    RectangularTowerLayer.fromData({
      layerIndex: index,
      widthCm: layer.widthCm,
      lengthCm: layer.lengthCm,
    })
  );
}

/**
 * Calculate auto-fill values for rectangular tower layers using 0.85 reduction factor
 */
export function calculateRectangularAutoFillLayers(
  numberOfLayers: number,
  baseWidthCm: number,
  baseLengthCm: number
): RectangularCustomLayerDimensions[] {
  const layers: RectangularCustomLayerDimensions[] = [];
  for (let i = 0; i < numberOfLayers; i++) {
    const reductionFactor = Math.pow(LAYER_REDUCTION_FACTOR, i);
    layers.push({
      widthCm: Math.round(baseWidthCm * reductionFactor * 100) / 100,
      lengthCm: Math.round(baseLengthCm * reductionFactor * 100) / 100,
    });
  }
  return layers;
}

/**
 * Custom layer dimensions for circular tower
 */
export interface CircularCustomLayerDimensions {
  readonly diameterCm: number;
}

/**
 * Generate all layers for a circular tower using auto-calculation (0.85 reduction factor)
 */
export function createCircularTowerLayers(
  numberOfLayers: number,
  baseDiameterCm: number
): CircularTowerLayer[] {
  const layers: CircularTowerLayer[] = [];
  for (let i = 0; i < numberOfLayers; i++) {
    layers.push(CircularTowerLayer.create(i, baseDiameterCm));
  }
  return layers;
}

/**
 * Generate circular tower layers from custom dimensions
 */
export function createCircularTowerLayersFromCustom(
  customLayers: readonly CircularCustomLayerDimensions[]
): CircularTowerLayer[] {
  return customLayers.map((layer, index) =>
    CircularTowerLayer.fromData({
      layerIndex: index,
      diameterCm: layer.diameterCm,
    })
  );
}

/**
 * Calculate auto-fill values for circular tower layers using 0.85 reduction factor
 */
export function calculateCircularAutoFillLayers(
  numberOfLayers: number,
  baseDiameterCm: number
): CircularCustomLayerDimensions[] {
  const layers: CircularCustomLayerDimensions[] = [];
  for (let i = 0; i < numberOfLayers; i++) {
    const reductionFactor = Math.pow(LAYER_REDUCTION_FACTOR, i);
    layers.push({
      diameterCm: Math.round(baseDiameterCm * reductionFactor * 100) / 100,
    });
  }
  return layers;
}
