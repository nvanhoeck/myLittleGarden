/**
 * buildComponentOptimizeRequest
 *
 * Pure mapper that builds an OptimizeComponentRequest payload for a single
 * component, including a minimal GardenSnapshot containing only that
 * component and the plant catalog needed to reason about the placed plants.
 */

import type { ComponentData } from '@/types/component.types';
import type { PlantData, PlacedPlantData } from '@/types/plant.types';
import {
  GARDEN_SNAPSHOT_VERSION,
  type ComponentDimensionsSnapshot,
  type ComponentSnapshot,
  type GardenSnapshot,
  type PlacedPlantSnapshot,
  type PlantSpecSnapshot,
  type SnapshotSunDirection,
} from '@/domain/ai/GardenSnapshot';
import type { OptimizeComponentRequest } from '@/schemas/ai/optimizeComponentRequestSchema';

type Objective = 'maximize-companions' | 'minimize-harm' | 'balanced';

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

function mapSunRequirement(
  sun: PlantData['sun'],
): PlantSpecSnapshot['sunRequirement'] {
  if (sun === 'full') return 'fullSun';
  if (sun === 'partial') return 'partialShade';
  return 'fullShade';
}

function mapWaterNeeds(
  water: PlantData['water'],
): PlantSpecSnapshot['waterNeeds'] {
  if (water === 'moderate') return 'medium';
  return water;
}

function mapPlantSpec(plant: PlantData): PlantSpecSnapshot {
  return {
    plantId: plant.id,
    name: plant.nameNl,
    sunRequirement: mapSunRequirement(plant.sun),
    spacingInCm: plant.spacingRadiusCm,
    heightInCm: null,
    waterNeeds: mapWaterNeeds(plant.water),
    frostTolerant: plant.frostTolerance !== 'tender',
    plantingStyle: plant.plantingStyle ?? null,
    goodCompanions: plant.companions.map((c) => c.plantId),
    badCompanions: plant.combatives.map((c) => c.plantId),
  };
}

export function buildComponentOptimizeRequest(
  component: ComponentData,
  getPlantById: (id: string) => PlantData | undefined,
  gardenSunDirection: string | null,
  objective: Objective = 'balanced',
  numberOfAlternatives = 5,
): OptimizeComponentRequest {
  const distinctPlantIds = new Set(component.plants.map((p) => p.plantId));
  const plantCatalog: PlantSpecSnapshot[] = [...distinctPlantIds].flatMap((id) => {
    const plant = getPlantById(id);
    return plant ? [mapPlantSpec(plant)] : [];
  });

  const snapshot: GardenSnapshot = {
    snapshotVersion: GARDEN_SNAPSHOT_VERSION,
    garden: {
      widthInMeters: 0,
      heightInMeters: 0,
      sunDirection: (gardenSunDirection ?? null) as SnapshotSunDirection | null,
      springFrostDate: null,
      fallFrostDate: null,
    },
    components: [mapComponent(component)],
    plantCatalog,
  };

  return {
    componentId: component.id,
    objective,
    numberOfAlternatives,
    snapshot,
  };
}
