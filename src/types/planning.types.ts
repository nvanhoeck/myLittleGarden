/**
 * Planning type definitions: when a placed plant is in the ground and
 * which plants still wait to be planned in a component.
 */

/**
 * How a plant goes into the ground
 * - transplant: raised indoors, planted out as a seedling
 * - directSow: sown where it grows
 */
export type PlantingMethod = 'transplant' | 'directSow';

/**
 * The ISO weeks a placed plant occupies its spot, both inclusive, within one year
 */
export interface GrowingPeriodData {
  readonly year: number;
  readonly startWeek: number;
  readonly endWeek: number;
  readonly method: PlantingMethod;
}

/**
 * A plant the user wants in a component in a year, not placed yet.
 * Auto-placement turns it into a placed plant.
 */
export interface PlantToPlanData {
  readonly id: string;
  readonly plantId: string;
  readonly year: number;
  readonly layerIndex?: number; // Layer index for towers (0 = bottom layer), undefined for non-towers
  // Patch-only: the size a patch had when it was placed before, kept for the next placement
  readonly patchWidthInCm?: number;
  readonly patchHeightInCm?: number;
  readonly patchRotationDeg?: number;
}
