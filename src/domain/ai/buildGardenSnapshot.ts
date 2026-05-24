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
import type { PlacedPlantData } from '@/types/plant.types';
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
  gardenWidth: number;
  gardenHeight: number;
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
 * Map a single placed plant to its snapshot representation.
 */
function mapPlant(plant: PlacedPlantData): PlacedPlantSnapshot {
  return {
    id: plant.id,
    plantId: plant.plantId,
    positionXInCm: plant.positionX,
    positionYInCm: plant.positionY,
    layerIndex: plant.layerIndex ?? null,
    locked: plant.locked ?? false,
    patchWidthInCm: plant.patchWidthInCm ?? null,
    patchHeightInCm: plant.patchHeightInCm ?? null,
    patchRotationDeg: plant.patchRotationDeg ?? null,
  };
}

/**
 * Map a single component to its snapshot representation.
 */
function mapComponent(component: ComponentData): ComponentSnapshot {
  return {
    id: component.id,
    name: component.name,
    type: component.type,
    sunDirection: (component.sunDirection ?? null) as SnapshotSunDirection | null,
    positionXInMeters: component.positionX,
    positionYInMeters: component.positionY,
    rotation: component.rotation,
    dimensions: buildDimensions(component),
    plants: component.plants.map(mapPlant),
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
  plantSpecs: PlantSpecSnapshot[] = [],
): GardenSnapshot {
  return {
    snapshotVersion: GARDEN_SNAPSHOT_VERSION,
    garden: {
      widthInMeters: garden.gardenWidth,
      heightInMeters: garden.gardenHeight,
      sunDirection: (garden.sunDirection ?? null) as SnapshotSunDirection | null,
      springFrostDate: toIsoStringOrNull(garden.springFrostDate),
      fallFrostDate: toIsoStringOrNull(garden.fallFrostDate),
    },
    components: components.map(mapComponent),
    ...(plantSpecs.length > 0 && { plantCatalog: plantSpecs }),
  };
}
