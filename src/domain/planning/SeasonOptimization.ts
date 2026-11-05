import type { PlantData } from '../../types/plant.types.ts';
import type { PlacementData, Season } from '../../types/planning.types.ts';
import type { Planning } from './Planning.ts';
import { footprintOf } from './PlantFootprint.ts';
import type { PlantingArea } from './PlantingArea.ts';
import { relationsFromCatalog } from './PlantRelations.ts';
import { fillByRatio } from './SeasonPlacement.ts';
import type { PlantShare } from './SeasonPlacement.ts';

export interface SeasonOptimizationInput {
  readonly planning: Planning;
  readonly season: Season;
  /** One area per layer: one for a box or pot, one per tower layer (index = layerIndex) */
  readonly areas: readonly PlantingArea[];
  /** Towers store the layer of each placement; boxes and pots do not */
  readonly hasLayers: boolean;
  readonly plantOf: (plantId: string) => PlantData | undefined;
  readonly newId: () => string;
}

export interface SeasonOptimizationOutcome {
  readonly planning: Planning;
  readonly shares: readonly PlantShare[];
}

/**
 * Optimize one season: the plants starting in it fill the free area by
 * ratio around the carried-over and locked plants. Unlocked placements of
 * the season are replaced. Plants missing from the catalog are skipped.
 */
export function optimizeSeason(input: SeasonOptimizationInput): SeasonOptimizationOutcome {
  const { planning, season, plantOf } = input;

  const fixed = planning.fixedPlacementsIn(season).map((placement) => ({
    plantId: placement.plantId,
    layerIndex: placement.layerIndex ?? 0,
    footprint: footprintOf(plantOf(placement.plantId), placement),
    xCm: placement.positionX,
    yCm: placement.positionY,
  }));
  const plants = planning.plantsStartingIn(season).flatMap((plantId) => {
    const plant = plantOf(plantId);
    return plant === undefined ? [] : [{ plantId, ratio: planning.ratioOf(season, plantId), traits: plant }];
  });

  const result = fillByRatio({
    layers: input.areas,
    fixed,
    plants,
    relations: relationsFromCatalog(planning.plants.flatMap((plantId) => plantOf(plantId) ?? [])),
  });

  const placements = result.placements.map((placed): PlacementData => ({
    id: input.newId(),
    plantId: placed.plantId,
    positionX: placed.xCm,
    positionY: placed.yCm,
    ...(input.hasLayers ? { layerIndex: placed.layerIndex } : {}),
    ...(placed.patch !== undefined
      ? { patchWidthInCm: placed.patch.widthCm, patchHeightInCm: placed.patch.heightCm, patchRotationDeg: placed.patch.rotationDeg }
      : {}),
  }));

  return { planning: planning.applyPlacement(season, placements), shares: result.shares };
}
