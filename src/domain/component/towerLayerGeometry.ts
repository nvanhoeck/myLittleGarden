/**
 * Tower layer geometry shared by every view that draws tower layers.
 * Plant positions are stored relative to these dimensions, so the
 * detail screen, layer overview and home slide must all agree.
 */

export const TOWER_LAYER_REDUCTION_FACTOR = 0.85;

export interface LayerDimensionsCm {
  width: number;
  height: number;
}

export function getTowerLayerDimensions(
  baseInnerWidthCm: number,
  baseInnerHeightCm: number,
  layerIndex: number,
): LayerDimensionsCm {
  const factor = Math.pow(TOWER_LAYER_REDUCTION_FACTOR, Math.max(0, layerIndex));
  return {
    width: Math.max(0, baseInnerWidthCm) * factor,
    height: Math.max(0, baseInnerHeightCm) * factor,
  };
}
