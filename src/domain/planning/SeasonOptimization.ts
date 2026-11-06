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

/** A planting's share of the free area; plantId is the plant, plantingId the planting */
export interface PlantingShare extends PlantShare {
  readonly plantingId: string;
}

export interface SeasonOptimizationOutcome {
  readonly planning: Planning;
  readonly shares: readonly PlantingShare[];
}

/**
 * Optimize one season: the plantings starting in it fill the free area by
 * ratio around the carried-over and locked plantings. Unlocked placements
 * of the season are replaced. Plantings of plants missing from the catalog
 * are skipped. fillByRatio sees planting ids as its plant ids, so two
 * plantings of one plant are placed independently; relations still use the plant.
 */
export function optimizeSeason(input: SeasonOptimizationInput): SeasonOptimizationOutcome {
  const { planning, season, plantOf } = input;
  const plantIdOf = new Map(planning.plantings.map((p) => [p.id, p.plantId]));
  const plantOfPlanting = (plantingId: string): string => plantIdOf.get(plantingId) ?? plantingId;
  const catalogRelations = relationsFromCatalog(planning.plants.flatMap((plantId) => plantOf(plantId) ?? []));

  const fixed = planning.fixedPlacementsIn(season).map((placement) => ({
    plantId: placement.plantingId,
    layerIndex: placement.layerIndex ?? 0,
    footprint: footprintOf(plantOf(placement.plantId), placement),
    xCm: placement.positionX,
    yCm: placement.positionY,
  }));
  const plantings = planning.plantingsStartingIn(season).flatMap((planting) => {
    const plant = plantOf(planting.plantId);
    return plant === undefined ? [] : [{ plantId: planting.id, ratio: planning.ratioOf(season, planting.id), traits: plant }];
  });

  const result = fillByRatio({
    layers: input.areas,
    fixed,
    plants: plantings,
    relations: (a, b) => catalogRelations(plantOfPlanting(a), plantOfPlanting(b)),
  });

  const placements = result.placements.map((placed): PlacementData => ({
    id: input.newId(),
    plantId: plantOfPlanting(placed.plantId),
    plantingId: placed.plantId,
    positionX: placed.xCm,
    positionY: placed.yCm,
    ...(input.hasLayers ? { layerIndex: placed.layerIndex } : {}),
    ...(placed.patch !== undefined
      ? { patchWidthInCm: placed.patch.widthCm, patchHeightInCm: placed.patch.heightCm, patchRotationDeg: placed.patch.rotationDeg }
      : {}),
  }));

  return {
    planning: planning.applyPlacement(season, placements),
    shares: result.shares.map((share) => ({ ...share, plantingId: share.plantId, plantId: plantOfPlanting(share.plantId) })),
  };
}
