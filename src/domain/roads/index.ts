/**
 * Road exports
 * Roads (paths) in garden boxes: rectangle geometry, borders between areas, road placement and cutting areas back
 */

export { overlaps, subtractAll, subtractRectangle } from './Rectangles.ts';
export { bordersOf } from './Borders.ts';
export type { Border } from './Borders.ts';
export { automaticRoads, ringRoads, roadOnBorder, withWidth } from './RoadPlacement.ts';
export type { AutomaticRoadsInput } from './RoadPlacement.ts';
export { cutBack } from './CutBack.ts';
export {
  addRoadTo,
  innerSizeOf,
  isValidRoadWidth,
  placeAutomaticRoadsIn,
  ROAD_MAX_WIDTH_CM,
  ROAD_MIN_WIDTH_CM,
  removeRoadFrom,
  setAllRoadsLockedIn,
  setRoadWidthIn,
  toggleRoadLockIn,
} from './GardenBoxRoads.ts';
export type { AutomaticRoadsRequest, RoadContext } from './GardenBoxRoads.ts';
