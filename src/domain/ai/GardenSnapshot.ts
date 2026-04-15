/**
 * GardenSnapshot
 *
 * Serializable DTO representing the full garden state sent to the AI backend
 * for placement reasoning. Contains only plain JSON-compatible primitives
 * (no Date objects, no class instances, no methods).
 */

export const GARDEN_SNAPSHOT_VERSION = '1.0' as const;

export type SnapshotSunDirection =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

export type SnapshotComponentType =
  | 'gardenBox'
  | 'pot'
  | 'rectangularTower'
  | 'circularTower';

/**
 * A single plant instance placed inside a component snapshot.
 * Positions are expressed in centimeters, relative to the component's origin.
 */
export interface PlacedPlantSnapshot {
  id: string;
  plantId: string;
  positionXInCm: number;
  positionYInCm: number;
  layerIndex: number | null;
}

/**
 * Dimensional summary for a component. Only the fields relevant to the
 * component's `type` are populated; the others are null. Kept flat so the AI
 * can reason about size without discriminating a union.
 */
export interface ComponentDimensionsSnapshot {
  widthInCm: number | null;
  lengthInCm: number | null;
  diameterInCm: number | null;
  numberOfLayers: number | null;
  borderWidthInCm: number;
}

/**
 * Minimal, flat representation of a component for AI consumption.
 */
export interface ComponentSnapshot {
  id: string;
  name: string;
  type: SnapshotComponentType;
  sunDirection: SnapshotSunDirection | null;
  /** Position of the component within the garden, in meters. */
  positionXInMeters: number;
  positionYInMeters: number;
  /** Rotation in degrees. */
  rotation: number;
  dimensions: ComponentDimensionsSnapshot;
  plants: PlacedPlantSnapshot[];
  /** ISO 8601 timestamp of component creation. */
  createdAt: string;
}

/**
 * Garden-level metadata.
 */
export interface GardenMetadataSnapshot {
  widthInMeters: number;
  heightInMeters: number;
  sunDirection: SnapshotSunDirection | null;
  /** ISO 8601 date string or null if unknown. */
  springFrostDate: string | null;
  fallFrostDate: string | null;
}

/**
 * Root DTO for the garden snapshot payload sent to the AI backend.
 */
export interface GardenSnapshot {
  snapshotVersion: string;
  garden: GardenMetadataSnapshot;
  components: ComponentSnapshot[];
}
