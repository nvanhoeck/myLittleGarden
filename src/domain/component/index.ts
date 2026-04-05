/**
 * Component domain exports
 * Barrel file for all garden component domain entities and value objects
 */

export { ComponentPosition } from './ComponentPosition';
export type { ComponentPositionData } from './ComponentPosition';

export { GardenBox } from './GardenBox';
export type { CreateGardenBoxParams } from './GardenBox';

export { Pot } from './Pot';
export type { CreatePotParams } from './Pot';

export { RectangularTower } from './RectangularTower';
export type { CreateRectangularTowerParams } from './RectangularTower';

export { CircularTower } from './CircularTower';
export type { CreateCircularTowerParams } from './CircularTower';

export {
  RectangularTowerLayer,
  CircularTowerLayer,
  createRectangularTowerLayers,
  createCircularTowerLayers,
  createRectangularTowerLayersFromCustom,
  createCircularTowerLayersFromCustom,
  calculateRectangularAutoFillLayers,
  calculateCircularAutoFillLayers,
} from './TowerLayer';
export type {
  RectangularLayerData,
  CircularLayerData,
  RectangularCustomLayerDimensions,
  CircularCustomLayerDimensions,
} from './TowerLayer';
