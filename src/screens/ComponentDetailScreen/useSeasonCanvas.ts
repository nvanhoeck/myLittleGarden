import { useMemo } from 'react';
import { conflictingPlantIds, footprintOf, plantingAreaOf, plantsOutsideArea } from '@/domain/planning';
import type { Planning, PlantFootprint } from '@/domain/planning';
import { usePlantStore } from '@/stores/plantStore';
import type { ComponentData, PlacedPlantData, Season } from '@/types';

export interface SeasonCanvas {
  /** Placements of the plants that start in the season, on the shown layer */
  readonly ownPlants: readonly PlacedPlantData[];
  /** Placements carried into the season from an earlier one, on the shown layer */
  readonly carriedPlants: readonly PlacedPlantData[];
  readonly footprints: Map<string, PlantFootprint>;
  readonly conflictIds: Set<string>;
  readonly outOfBoundsIds: Set<string>;
}

const NOTHING: SeasonCanvas = {
  ownPlants: [],
  carriedPlants: [],
  footprints: new Map(),
  conflictIds: new Set(),
  outOfBoundsIds: new Set(),
};

/** What the canvas draws for one season and layer; the footprint, conflict and wall rules come from the domain */
export function useSeasonCanvas(
  component: ComponentData | undefined,
  planning: Planning | null,
  season: Season,
  layerIndex: number | undefined,
): SeasonCanvas {
  const getPlantById = usePlantStore((state) => state.getPlantById);

  return useMemo(() => {
    if (!component || !planning) return NOTHING;
    const onLayer = (p: PlacedPlantData): boolean => layerIndex === undefined || (p.layerIndex ?? 0) === layerIndex;
    const ownPlants = planning.placementsIn(season).filter(onLayer);
    const carriedPlants = planning.carriedPlacementsIn(season).filter(onLayer);
    const all = [...carriedPlants, ...ownPlants];
    const footprintOfPlant = (plant: PlacedPlantData): PlantFootprint => footprintOf(getPlantById(plant.plantId), plant);
    return {
      ownPlants,
      carriedPlants,
      footprints: new Map(all.map((plant) => [plant.id, footprintOfPlant(plant)])),
      conflictIds: conflictingPlantIds(all, footprintOfPlant),
      outOfBoundsIds: plantsOutsideArea(ownPlants, footprintOfPlant, plantingAreaOf(component, layerIndex)),
    };
  }, [component, planning, season, layerIndex, getPlantById]);
}
