import type { GardenBoxData, RoadData } from '../../types/component.types.ts';
import type { Season } from '../../types/planning.types.ts';
import { plantingAreaOf } from '../planning/ComponentArea.ts';
import { Planning } from '../planning/Planning.ts';
import type { PlantingCalendar } from '../planning/PlantCalendar.ts';
import type { Border } from './Borders.ts';
import { automaticRoads, roadOnBorder, withWidth } from './RoadPlacement.ts';

/**
 * Roads of one garden box: every change returns the box with its roads and with
 * the areas of every year and season cut back from them. Pure: the store supplies
 * the calendar of a year, the smallest side of a plant and the id generator.
 */

export interface RoadContext {
  readonly calendarOf: (year: number) => PlantingCalendar;
  readonly minSideOf: (plantId: string) => number;
  readonly newId: () => string;
}

interface BoxSize {
  readonly widthCm: number;
  readonly lengthCm: number;
}

/** The inner size of the box: where areas and roads live */
export function innerSizeOf(box: GardenBoxData): BoxSize {
  const area = plantingAreaOf(box);
  return area.shape === 'rectangle' ? { widthCm: area.widthCm, lengthCm: area.lengthCm } : { widthCm: 0, lengthCm: 0 };
}

const roadsOf = (box: GardenBoxData): readonly RoadData[] => box.roads ?? [];

/** The box with these roads; areas of every year are cut back, years that nothing touches keep their data */
function withRoads(box: GardenBoxData, roads: readonly RoadData[], context: RoadContext): GardenBoxData {
  const plannings = Object.fromEntries(
    Object.entries(box.plannings).map(([year, data]) => {
      const planning = Planning.from(data, context.calendarOf(Number(year)));
      const cut = planning.cutBackByRoads(roads, context.minSideOf);
      return [year, cut === planning ? data : cut.toData()] as const;
    }),
  );
  return { ...box, roads, plannings };
}

/** A road on the border; the box stays as it is when the road does not fit */
export function addRoadTo(box: GardenBoxData, input: RoadContext & { readonly border: Border; readonly widthCm: number }): GardenBoxData {
  const piece = roadOnBorder(input.border, input.widthCm, innerSizeOf(box));
  if (piece === null) return box;
  return withRoads(box, [...roadsOf(box), { id: input.newId(), ...piece }], input);
}

export interface AutomaticRoadsRequest extends RoadContext {
  readonly year: number;
  readonly season: Season;
  readonly widthCm: number;
  readonly withRing: boolean;
}

/** Replaces the unlocked roads by roads between the areas of the shown season; locked roads stay */
export function placeAutomaticRoadsIn(box: GardenBoxData, input: AutomaticRoadsRequest): GardenBoxData {
  const lockedRoads = roadsOf(box).filter((road) => road.locked === true);
  const planning = Planning.from(box.plannings[String(input.year)], input.calendarOf(input.year));
  const created = automaticRoads({
    areas: [...planning.areasIn(input.season), ...planning.carriedAreasIn(input.season)],
    box: innerSizeOf(box),
    widthCm: input.widthCm,
    withRing: input.withRing,
    lockedRoads,
  });
  return withRoads(box, [...lockedRoads, ...created.map((piece) => ({ id: input.newId(), ...piece }))], input);
}

/** A road with a new width; a wider road cuts areas back. Unknown road: the box stays */
export function setRoadWidthIn(box: GardenBoxData, roadId: string, input: RoadContext & { readonly widthCm: number }): GardenBoxData {
  const size = innerSizeOf(box);
  if (!roadsOf(box).some((road) => road.id === roadId)) return box;
  return withRoads(box, roadsOf(box).map((road) => (road.id === roadId ? withWidth(road, input.widthCm, size) : road)), input);
}

export function toggleRoadLockIn(box: GardenBoxData, roadId: string): GardenBoxData {
  if (!roadsOf(box).some((road) => road.id === roadId)) return box;
  return { ...box, roads: roadsOf(box).map((road) => (road.id === roadId ? { ...road, locked: road.locked !== true } : road)) };
}

export function removeRoadFrom(box: GardenBoxData, roadId: string): GardenBoxData {
  if (!roadsOf(box).some((road) => road.id === roadId)) return box;
  return { ...box, roads: roadsOf(box).filter((road) => road.id !== roadId) };
}

/** Locks or unlocks every road of the box */
export function setAllRoadsLockedIn(box: GardenBoxData, locked: boolean): GardenBoxData {
  if (roadsOf(box).length === 0) return box;
  return { ...box, roads: roadsOf(box).map((road) => ({ ...road, locked })) };
}
