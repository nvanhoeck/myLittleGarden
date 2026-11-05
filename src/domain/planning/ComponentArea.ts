import type { ComponentData } from '../../types/component.types.ts';
import { getTowerLayerDimensions } from '../component/towerLayerGeometry.ts';
import type { PlantingArea } from './PlantingArea.ts';

/** The inner area of a component or tower layer, as the canvas draws it */
export function plantingAreaOf(component: ComponentData, layerIndex?: number): PlantingArea {
  const border = 2 * component.borderWidthInCm;
  const layer = layerIndex ?? 0;

  switch (component.type) {
    case 'gardenBox':
      return {
        shape: 'rectangle',
        widthCm: Math.max(0, component.widthInCm - border),
        lengthCm: Math.max(0, component.lengthInCm - border),
      };
    case 'pot':
      return { shape: 'circle', diameterCm: Math.max(0, component.diameterInCm - border) };
    case 'rectangularTower': {
      const dims = getTowerLayerDimensions(component.widthInCm - border, component.lengthInCm - border, layer);
      return { shape: 'rectangle', widthCm: dims.width, lengthCm: dims.height };
    }
    case 'circularTower': {
      const dims = getTowerLayerDimensions(component.diameterInCm - border, component.diameterInCm - border, layer);
      return { shape: 'circle', diameterCm: dims.width };
    }
  }
}

/** Every area plants can go in: one per tower layer (bottom first), one for a box or pot */
export function plantingAreasOf(component: ComponentData): PlantingArea[] {
  const layers = component.type === 'rectangularTower' || component.type === 'circularTower' ? component.numberOfLayers : 1;
  return Array.from({ length: layers }, (_, layerIndex) => plantingAreaOf(component, layers > 1 ? layerIndex : undefined));
}
