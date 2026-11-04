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

export { plantingAreaOf, rearrangePlanting, startPlantingOver } from './ComponentPlanning';
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
