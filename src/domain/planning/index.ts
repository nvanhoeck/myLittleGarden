/**
 * Season planning exports
 * Season planning: seasons, plant calendar, plannings, footprints and area layout
 */

export { SEASONS, seasonContaining, seasonMonths, seasonRange, seasonsAfter } from './Season';
export type { Season, SeasonRange } from './Season';

export {
  earliestPlantingDate,
  frostDayOf,
  growingSeasonsFrom,
  plantingCalendarFor,
  plantingWindowOf,
  reachableSeasonsOf,
  sowingDatesOf,
} from './PlantCalendar';
export type { DateWindow, FrostDay, PlantTiming, PlantingCalendar, SowingDates } from './PlantCalendar';

export {
  PlantFootprint,
  boundsOverlap,
  footprintsConflict,
  minimumAreaSideOf,
  minimumPatchSideCm,
  plantDistanceCm,
} from './PlantFootprint';
export type { Bounds, FootprintTraits, PatchShape, PositionedFootprint } from './PlantFootprint';

export { fitsInArea } from './PlantingArea';
export type { PlantingArea } from './PlantingArea';

export { relationsFromCatalog } from './PlantRelations';
export type { PlantRelation, PlantRelations } from './PlantRelations';

export { plantingAreaOf, plantingAreasOf } from './ComponentArea';

export { Planning } from './Planning';
export type { LayerBounds } from './Planning';

export { freeRectangles, layerBounds } from './FreeSpace';
export { orderForNeighbours } from './AreaOrder';
export { gridPositions, plantCountOf } from './AreaGrid';
export { plantCountOfArea, plantCountOfAreas } from './AreaPlantCount';
export { layoutAreas } from './AreaLayout';
export type { AreaLayoutRequest, AreaLayoutResult, AreaShare, LaidOutArea } from './AreaLayout';

export { optimizeSeason } from './SeasonOptimization';
export type { SeasonOptimizationInput, SeasonOptimizationOutcome } from './SeasonOptimization';

export { areasGrowingOn } from './CurrentAreas';
