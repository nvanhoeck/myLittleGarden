/**
 * Component type definitions for garden components
 * These types define the data structures used for garden boxes, pots, and towers.
 * Each component has its own sun direction for microclimate considerations.
 */

import type { SunDirection } from './environment.types';
import type { PlanningData } from './planning.types';

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
  readonly plannings: Readonly<Record<string, PlanningData>>; // Planning per year, keyed "2026"
}

/** Which way a road runs: vertical = along a line x = constant (its width is across x), horizontal = along y = constant */
export type RoadOrientation = 'vertical' | 'horizontal';

/**
 * A road (path) in a garden box: a rectangle in cm from the top-left of the box inner area.
 * The road width is widthCm for a vertical road and lengthCm for a horizontal one.
 */
export interface RoadData {
  readonly id: string;
  readonly xCm: number;
  readonly yCm: number;
  readonly widthCm: number;
  readonly lengthCm: number;
  readonly orientation: RoadOrientation;
  readonly locked?: boolean; // Locked roads are never moved by the automatic roads
}

/**
 * Garden box component - rectangular growing area
 */
export interface GardenBoxData extends BaseComponentData {
  readonly type: 'gardenBox';
  readonly widthInCm: number;
  readonly lengthInCm: number;
  readonly roads?: readonly RoadData[];
}

/**
 * Pot component - circular container
 */
export interface PotData extends BaseComponentData {
  readonly type: 'pot';
  readonly diameterInCm: number;
}

/**
 * Custom layer dimensions for rectangular tower
 */
export interface RectangularLayerDimensions {
  readonly widthCm: number;
  readonly lengthCm: number;
}

/**
 * Rectangular tower component - vertical growing structure with layers
 */
export interface RectangularTowerData extends BaseComponentData {
  readonly type: 'rectangularTower';
  readonly widthInCm: number;
  readonly lengthInCm: number;
  readonly numberOfLayers: number;
  /** Custom layer dimensions (optional). If not provided, layers are auto-calculated with 0.85 reduction factor */
  readonly customLayers?: readonly RectangularLayerDimensions[];
}

/**
 * Custom layer dimensions for circular tower
 */
export interface CircularLayerDimensions {
  readonly diameterCm: number;
}

/**
 * Circular tower component - vertical growing structure with layers
 */
export interface CircularTowerData extends BaseComponentData {
  readonly type: 'circularTower';
  readonly diameterInCm: number;
  readonly numberOfLayers: number;
  /** Custom layer dimensions (optional). If not provided, layers are auto-calculated with 0.85 reduction factor */
  readonly customLayers?: readonly CircularLayerDimensions[];
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
