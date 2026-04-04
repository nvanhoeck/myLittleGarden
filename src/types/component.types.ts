/**
 * Component type definitions for garden components
 * These types define the data structures used for garden boxes, pots, and towers.
 * Each component has its own sun direction for microclimate considerations.
 */

import type { SunDirection } from './environment.types';
import type { PlacedPlantData } from './plant.types';

/**
 * Types of garden components available
 */
export type ComponentType = 'gardenBox' | 'pot' | 'rectangularTower' | 'circularTower';

/**
 * Base data structure shared by all garden components
 */
export interface BaseComponentData {
  readonly id: string;
  readonly name: string;
  readonly type: ComponentType;
  readonly sunDirection: SunDirection;
  readonly createdAt: string; // ISO date string
  readonly borderWidthInCm: number;
  readonly positionX: number; // Position on canvas in meters
  readonly positionY: number; // Position on canvas in meters
  readonly rotation: number; // Rotation angle in degrees (0-360)
  readonly plants: readonly PlacedPlantData[]; // Plants placed in this component
}

/**
 * Garden box component - rectangular growing area
 */
export interface GardenBoxData extends BaseComponentData {
  readonly type: 'gardenBox';
  readonly widthInCm: number;
  readonly lengthInCm: number;
}

/**
 * Pot component - circular container
 */
export interface PotData extends BaseComponentData {
  readonly type: 'pot';
  readonly diameterInCm: number;
}

/**
 * Rectangular tower component - vertical growing structure with layers
 */
export interface RectangularTowerData extends BaseComponentData {
  readonly type: 'rectangularTower';
  readonly widthInCm: number;
  readonly lengthInCm: number;
  readonly numberOfLayers: number;
}

/**
 * Circular tower component - vertical growing structure with layers
 */
export interface CircularTowerData extends BaseComponentData {
  readonly type: 'circularTower';
  readonly diameterInCm: number;
  readonly numberOfLayers: number;
}

/**
 * Union type for all component data types
 */
export type ComponentData =
  | GardenBoxData
  | PotData
  | RectangularTowerData
  | CircularTowerData;

/**
 * Storage data structure for components
 * Used for persistence with Zustand/AsyncStorage
 */
export interface ComponentStorageData {
  readonly components: ComponentData[];
}
