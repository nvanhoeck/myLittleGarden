/**
 * Planning domain exports
 * Time-based planning: weeks, growing periods, footprints, time zones and auto-placement
 */

export { PlantingWeek } from './PlantingWeek';

export { GrowingPeriod, frostDayOf } from './GrowingPeriod';
export type { FrostDay, GrowingPeriodData, PlanningContext, PlantingMethod, PlantTiming } from './GrowingPeriod';

export { periodOptionsFor } from './GrowingPeriodOptions';

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

export { calculateTimeZones } from './TimeZone';
export type { PlantInTime, TimeZone } from './TimeZone';

export { relationsFromCatalog } from './PlantRelations';
export type { PlantRelation, PlantRelations } from './PlantRelations';

export { layoutScore, placePlants } from './AutoPlacement';
export type {
  FixedPlant,
  PlacedCandidate,
  PlacementCandidate,
  PlacementRequest,
  PlacementResult,
  UnplacedCandidate,
  UnplacedReason,
} from './AutoPlacement';

export { rearrangePlanting, startPlantingOver } from './ComponentPlanning';
export { plantingAreaOf, plantingAreasOf } from './ComponentArea';
export type { ComponentPlanningInput, ComponentPlanningOutcome, PlanningRunCounts } from './ComponentPlanning';

export {
  hasAnythingToPlan,
  plannedYearsOf,
  plantsGrowingIn,
  plantsInScope,
  plantsSharingWeeksWith,
  plantsToPlanIn,
  timeZonesOf,
} from './PlanningQueries';

export { SEASONS, seasonContaining, seasonMonths, seasonRange, seasonsAfter } from './Season';
export type { Season, SeasonRange, SeasonsOf } from './Season';

export { frostDayOf as frostDayFromIso, growingSeasonsOf, outdoorPeriodOf, plantingDatesOf, seasonsLookup } from './PlantCalendar';
export type { OutdoorPeriod, PlantingDates } from './PlantCalendar';

export { Planning } from './Planning';

export { fillByRatio } from './SeasonPlacement';
export type { FixedPlacement, NewPlacement, PlantShare, RatioPlant, SeasonPlacementRequest, SeasonPlacementResult } from './SeasonPlacement';

export { optimizeSeason } from './SeasonOptimization';
export type { SeasonOptimizationInput, SeasonOptimizationOutcome } from './SeasonOptimization';
