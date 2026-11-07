/**
 * buildGardenSnapshot
 *
 * Pure mapper that converts raw Zustand store state into a serializable
 * `GardenSnapshot` DTO suitable for transmission to the AI backend.
 *
 * This module is intentionally store-agnostic: it accepts plain data and
 * returns plain data. No imports from Zustand stores, no side effects,
 * no Date instances in the output.
 */

import type { SunDirection } from '@/types/environment.types';
import type { ComponentData } from '@/types/component.types';
import type { AreaData } from '@/types/planning.types';
import {
  GARDEN_SNAPSHOT_VERSION,
  type ComponentDimensionsSnapshot,
  type ComponentSnapshot,
  type GardenSnapshot,
  type PlacedPlantSnapshot,
  type PlantSpecSnapshot,
  type SnapshotSunDirection,
} from './GardenSnapshot';

/**
 * Subset of the garden store state required to build a snapshot.
 * Kept as a local interface so this module does not depend on the store.
 */
export interface GardenStoreState {
  sunDirection: SunDirection | null;
  springFrostDate: Date | null;
  fallFrostDate: Date | null;
}

/**
 * Convert a `Date | null` frost date to an ISO 8601 string (or null).
 */
function toIsoStringOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

/**
 * Build the flat dimensions payload for a component, only populating the
 * fields relevant to its discriminated type. Irrelevant fields are null.
 */
function buildDimensions(component: ComponentData): ComponentDimensionsSnapshot {
  const borderWidthInCm = component.borderWidthInCm;
  switch (component.type) {
    case 'gardenBox':
      return {
        widthInCm: component.widthInCm,
        lengthInCm: component.lengthInCm,
        diameterInCm: null,
        numberOfLayers: null,
        borderWidthInCm,
      };
    case 'pot':
      return {
        widthInCm: null,
        lengthInCm: null,
        diameterInCm: component.diameterInCm,
        numberOfLayers: null,
        borderWidthInCm,
      };
    case 'rectangularTower':
      return {
        widthInCm: component.widthInCm,
        lengthInCm: component.lengthInCm,
        diameterInCm: null,
        numberOfLayers: component.numberOfLayers,
        borderWidthInCm,
      };
    case 'circularTower':
      return {
        widthInCm: null,
        lengthInCm: null,
        diameterInCm: component.diameterInCm,
        numberOfLayers: component.numberOfLayers,
        borderWidthInCm,
      };
  }
}

/**
 * Map an area to one snapshot plant: at the centre of its first piece, with
 * that piece's size as patch size.
 */
function mapArea(area: AreaData): PlacedPlantSnapshot {
  const [piece] = area.pieces;
  return {
    id: area.id,
    plantId: area.plantId,
    positionXInCm: piece.xCm + piece.widthCm / 2,
    positionYInCm: piece.yCm + piece.lengthCm / 2,
    layerIndex: area.layerIndex ?? null,
    locked: area.locked ?? false,
    patchWidthInCm: piece.widthCm,
    patchHeightInCm: piece.lengthCm,
    patchRotationDeg: null,
  };
}

/**
 * Map a single component to its snapshot representation.
 */
function mapComponent(
  component: ComponentData,
  areasOf: (component: ComponentData) => readonly AreaData[],
): ComponentSnapshot {
  return {
    id: component.id,
    name: component.name,
    type: component.type,
    sunDirection: (component.sunDirection ?? null) as SnapshotSunDirection | null,
    dimensions: buildDimensions(component),
    plants: areasOf(component).filter((area) => area.pieces.length > 0).map(mapArea),
    createdAt: component.createdAt,
  };
}

/**
 * Build a `GardenSnapshot` DTO from garden metadata and the list of
 * components. This function is pure: given the same inputs it always
 * produces the same output, and it performs no I/O.
 */
export function buildGardenSnapshot(
  garden: GardenStoreState,
  components: ComponentData[],
  /** The areas growing in each component today */
  areasOf: (component: ComponentData) => readonly AreaData[],
  plantSpecs: PlantSpecSnapshot[] = [],
): GardenSnapshot {
  return {
    snapshotVersion: GARDEN_SNAPSHOT_VERSION,
    garden: {
      sunDirection: (garden.sunDirection ?? null) as SnapshotSunDirection | null,
      springFrostDate: toIsoStringOrNull(garden.springFrostDate),
      fallFrostDate: toIsoStringOrNull(garden.fallFrostDate),
    },
    components: components.map((component) => mapComponent(component, areasOf)),
    ...(plantSpecs.length > 0 && { plantCatalog: plantSpecs }),
  };
}
