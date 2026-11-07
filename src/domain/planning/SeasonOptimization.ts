import type { PlantData } from '../../types/plant.types.ts';
import type { AreaData, Season } from '../../types/planning.types.ts';
import { layoutAreas } from './AreaLayout.ts';
import type { AreaShare } from './AreaLayout.ts';
import type { Planning } from './Planning.ts';
import type { PlantingArea } from './PlantingArea.ts';
import { relationsFromCatalog } from './PlantRelations.ts';

export interface SeasonOptimizationInput {
  readonly planning: Planning;
  readonly season: Season;
  /** One area per layer: one for a box or pot, one per tower layer (index = layerIndex) */
  readonly areas: readonly PlantingArea[];
  /** Towers store the layer of each area; boxes and pots do not */
  readonly hasLayers: boolean;
  readonly plantOf: (plantId: string) => PlantData | undefined;
  readonly newId: () => string;
}

export interface SeasonOptimizationOutcome {
  readonly planning: Planning;
  readonly shares: readonly AreaShare[];
}

/**
 * Areas the season's plantings would run into later on: in every later season
 * a planting starting in this season grows in, the locked areas of that season
 * and the areas carried into it from other start seasons.
 */
function fixedAreasInLaterSeasons(planning: Planning, season: Season): AreaData[] {
  const later = new Set(planning.plantingsStartingIn(season)
    .flatMap((planting) => planning.growingSeasonsOf(planting))
    .filter((grown) => grown !== season));
  return [...later].flatMap((laterSeason) => planning.fixedAreasIn(laterSeason)
    .filter((area) => planning.plantingById(area.plantingId)?.startSeason !== season));
}

/**
 * Optimize one season: the plantings starting in it get an area by ratio in
 * the space left by the carried-over and locked areas, also those of the later
 * seasons its plantings grow into. Unlocked areas of the
 * season are replaced; a planting with a locked area keeps it and is not laid
 * out again. Plantings of plants missing from the catalog are skipped.
 * Relations are looked up by plant, so two plantings of one plant are laid out
 * independently.
 */
export function optimizeSeason(input: SeasonOptimizationInput): SeasonOptimizationOutcome {
  const { planning, season, plantOf } = input;
  const fixedAreas = planning.fixedAreasIn(season);
  const keptPlantings = new Set(fixedAreas.map((area) => area.plantingId));
  const blockingAreas = [...fixedAreas, ...fixedAreasInLaterSeasons(planning, season)]
    .filter((area, index, all) => all.findIndex((other) => other.id === area.id) === index);

  const result = layoutAreas({
    layers: input.areas,
    fixed: blockingAreas.flatMap((area) => area.pieces.map((piece) => ({ layerIndex: area.layerIndex ?? 0, piece }))),
    plantings: planning.plantingsStartingIn(season)
      .filter((planting) => !keptPlantings.has(planting.id))
      .flatMap((planting) => {
        const plant = plantOf(planting.plantId);
        return plant === undefined
          ? []
          : [{ plantingId: planting.id, plantId: planting.plantId, ratio: planning.ratioOf(season, planting.id), traits: plant }];
      }),
    relations: relationsFromCatalog(planning.plants.flatMap((plantId) => plantOf(plantId) ?? [])),
  });

  const areas = result.areas.map((laidOut): AreaData => ({
    id: input.newId(),
    plantingId: laidOut.plantingId,
    plantId: laidOut.plantId,
    ...(input.hasLayers ? { layerIndex: laidOut.layerIndex } : {}),
    pieces: laidOut.pieces,
  }));

  return { planning: planning.applyAreas(season, areas), shares: result.shares };
}
