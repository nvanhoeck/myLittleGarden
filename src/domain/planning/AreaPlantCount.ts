import { plantCountOf } from './AreaGrid.ts';
import { plantingAreaOf } from './ComponentArea.ts';
import type { FootprintTraits } from './PlantFootprint.ts';
import type { ComponentData } from '../../types/component.types.ts';
import type { AreaData } from '../../types/planning.types.ts';

/** The plants an area of a component holds; null for a sown area, 0 for a plant missing from the catalog */
export function plantCountOfArea(component: ComponentData, area: AreaData, plant: FootprintTraits | undefined): number | null {
  if (plant === undefined) return 0;
  return plantCountOf(area, plant, plantingAreaOf(component, area.layerIndex));
}

/** The plants of all the areas together; sown areas add nothing */
export function plantCountOfAreas(
  component: ComponentData,
  areas: readonly AreaData[],
  plantOf: (plantId: string) => FootprintTraits | undefined,
): number {
  return areas.reduce((sum, area) => sum + (plantCountOfArea(component, area, plantOf(area.plantId)) ?? 0), 0);
}
