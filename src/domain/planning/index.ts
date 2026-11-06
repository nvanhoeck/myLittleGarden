/**
 * Season planning exports
 * Season planning: seasons, plant calendar, plannings, footprints and placement
 */

export { SEASONS, seasonContaining, seasonMonths, seasonRange, seasonsAfter } from './Season';
export type { Season, SeasonRange, SeasonsOf } from './Season';

export {
  earliestPlantingDate,
  frostDayOf,
  growingSeasonsFrom,
  plantingWindowOf,
  reachableSeasonsOf,
  seasonsLookup,
  sowingDatesOf,
} from './PlantCalendar';
export type { DateWindow, FrostDay, PlantTiming, SowingDates } from './PlantCalendar';

export {
  PlantFootprint,
  boundsOverlap,
  conflictingPlantIds,
  footprintOf,
  footprintsConflict,
  minimumPatchSideCm,
  plantDistanceCm,
} from './PlantFootprint';
export type { Bounds, FootprintTraits, PatchFields, PatchShape, PositionedFootprint } from './PlantFootprint';

export { fitsInArea, plantsOutsideArea } from './PlantingArea';
export type { PlantingArea } from './PlantingArea';

export { relationsFromCatalog } from './PlantRelations';
export type { PlantRelation, PlantRelations } from './PlantRelations';

export { plantingAreaOf, plantingAreasOf } from './ComponentArea';

export { Planning } from './Planning';

export { fillByRatio } from './SeasonPlacement';
export type { FixedPlacement, NewPlacement, PlantShare, RatioPlant, SeasonPlacementRequest, SeasonPlacementResult } from './SeasonPlacement';

export { optimizeSeason } from './SeasonOptimization';
export type { SeasonOptimizationInput, SeasonOptimizationOutcome } from './SeasonOptimization';

export { placementsGrowingOn } from './CurrentPlacements';
