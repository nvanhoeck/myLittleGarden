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

/**
 * Meteorological season of a planning year: spring (Mar-May), summer
 * (Jun-Aug), autumn (Sep-Nov), winter (Dec-Feb of the next calendar year)
 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Where a season stands: never placed, placed, or placed but its inputs changed since */
export type SeasonStatus = 'notPlanned' | 'planned' | 'outdated';

/**
 * One plant placed in a component, in the season it is planted.
 * Positions are cm from the top-left of the inner area (border excluded).
 */
export interface PlacementData {
  readonly id: string;
  readonly plantId: string;
  readonly positionX: number;
  readonly positionY: number;
  readonly layerIndex?: number; // Tower layer (0 = bottom), undefined for components without layers
  readonly locked?: boolean; // Locked placements are never moved by the optimizer
  // Patch-only fields, undefined for individual plants
  readonly patchWidthInCm?: number;
  readonly patchHeightInCm?: number;
  readonly patchRotationDeg?: number;
}

/** Ratios and placements of the plants that start in one season */
export interface SeasonPlanData {
  /** Relative share of the free area per plant id; a missing plant has ratio 1 */
  readonly ratios: Readonly<Record<string, number>>;
  readonly placements: readonly PlacementData[];
  readonly status: SeasonStatus;
}

/** What grows in one component during one planning year */
export interface PlanningData {
  /** The plants in the planning, without amounts */
  readonly plants: readonly string[];
  readonly seasons: Readonly<Record<Season, SeasonPlanData>>;
}
