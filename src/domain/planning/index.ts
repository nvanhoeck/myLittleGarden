/**
 * Planning domain exports
 * Time-based planning: weeks, growing periods, footprints, time zones and auto-placement
 */

export { PlantingWeek } from './PlantingWeek';

export { GrowingPeriod, frostDayOf } from './GrowingPeriod';
export type { FrostDay, GrowingPeriodData, PlanningContext, PlantingMethod, PlantTiming } from './GrowingPeriod';

export { periodOptionsFor } from './GrowingPeriodOptions';

export { PlantFootprint, boundsOverlap, footprintsConflict } from './PlantFootprint';
export type { Bounds, PatchShape, PositionedFootprint } from './PlantFootprint';

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
  PlantingArea,
  UnplacedCandidate,
  UnplacedReason,
} from './AutoPlacement';

export { plantingAreaOf, rearrangePlanting, startPlantingOver } from './ComponentPlanning';
export type { ComponentPlanningInput, ComponentPlanningOutcome } from './ComponentPlanning';

export { hasAnythingToPlan, plantsGrowingIn, plantsInScope, plantsToPlanIn, timeZonesOf } from './PlanningQueries';
