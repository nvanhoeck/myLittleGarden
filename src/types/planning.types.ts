/**
 * Planning type definitions: seasons, ratios and placements per component and year
 */

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
  readonly plantingId: string; // The planting this placement belongs to
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
  /** Relative share of the free area per planting id; a missing planting has ratio 1 */
  readonly ratios: Readonly<Record<string, number>>;
  readonly placements: readonly PlacementData[];
  readonly status: SeasonStatus;
}

/** One time a plant is planted: where in the year it starts */
export interface PlantingData {
  readonly id: string;
  readonly plantId: string;
  readonly startSeason: Season;
  /** The growing seasons saved when the planting was placed; frost-date changes no longer alter them */
  readonly fixedSeasons?: readonly Season[];
}

/** What grows in one component during one planning year */
export interface PlanningData {
  /** The plants in the planning, without amounts */
  readonly plants: readonly string[];
  /** Each time a plant is planted; at most one per plant per start season */
  readonly plantings: readonly PlantingData[];
  readonly seasons: Readonly<Record<Season, SeasonPlanData>>;
}
