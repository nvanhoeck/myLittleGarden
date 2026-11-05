import type { PlacedPlantData } from '../../types/plant.types.ts';
import type { PlantFootprint } from './PlantFootprint.ts';

/** Inner dimensions of a component or tower layer (border already subtracted) */
export type PlantingArea =
  | { readonly shape: 'rectangle'; readonly widthCm: number; readonly lengthCm: number }
  | { readonly shape: 'circle'; readonly diameterCm: number };

/** Tolerance for rounding: a footprint touching the wall still fits */
const EPSILON_CM = 1e-6;

/**
 * Whether a footprint at a position lies inside the area: every corner of its
 * outline (a rotated patch with its real corners) is inside the rectangle or
 * the circle. Touching the wall is allowed. Auto-placement and the canvas both use this.
 */
export function fitsInArea(area: PlantingArea, footprint: PlantFootprint, xCm: number, yCm: number): boolean {
  const corners = footprint.cornersAt(xCm, yCm);
  if (area.shape === 'rectangle') {
    return corners.every(([x, y]) =>
      x >= -EPSILON_CM && y >= -EPSILON_CM && x <= area.widthCm + EPSILON_CM && y <= area.lengthCm + EPSILON_CM);
  }
  const radius = area.diameterCm / 2;
  return corners.every(([x, y]) => Math.hypot(x - radius, y - radius) <= radius + EPSILON_CM);
}

/** The ids of the plants whose footprint does not lie inside the area */
export function plantsOutsideArea<P extends Pick<PlacedPlantData, 'id' | 'positionX' | 'positionY'>>(
  plants: readonly P[],
  footprintOfPlant: (plant: P) => PlantFootprint,
  area: PlantingArea,
): Set<string> {
  return new Set(
    plants
      .filter((plant) => !fitsInArea(area, footprintOfPlant(plant), plant.positionX, plant.positionY))
      .map((plant) => plant.id),
  );
}
