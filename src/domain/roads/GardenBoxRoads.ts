import type { GardenBoxData, RoadData } from '../../types/component.types.ts';
import type { Season } from '../../types/planning.types.ts';
import { plantingAreaOf } from '../planning/ComponentArea.ts';
import { Planning } from '../planning/Planning.ts';
import type { PlantingCalendar } from '../planning/PlantCalendar.ts';
import type { Border } from './Borders.ts';
import { automaticRoads, roadOnBorder, withWidth } from './RoadPlacement.ts';
import { EPSILON_CM } from './Rectangles.ts';

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

/** The widths the user can pick: whole cm from 10 to 200 */
function isValidWidth(widthCm: number): boolean {
  return Number.isInteger(widthCm) && widthCm >= 10 && widthCm <= 200;
}

function sameRoads(a: readonly RoadData[], b: readonly RoadData[]): boolean {
  return a.length === b.length && a.every((road, i) => (
    road.id === b[i].id && road.xCm === b[i].xCm && road.yCm === b[i].yCm
    && road.widthCm === b[i].widthCm && road.lengthCm === b[i].lengthCm && road.locked === b[i].locked
  ));
}

/**
 * The box with these roads; areas of every year are cut back. Years that nothing touches keep their
 * stored data (also free of reconcile side effects); the same box comes back when nothing changed.
 */
function withRoads(box: GardenBoxData, roads: readonly RoadData[], context: RoadContext): GardenBoxData {
  let anyYearChanged = false;
  const plannings = Object.fromEntries(
    Object.entries(box.plannings).map(([year, data]) => {
      const planning = Planning.from(data, context.calendarOf(Number(year)));
      const cut = planning.cutBackByRoads(roads, context.minSideOf);
      if (cut === planning) return [year, data] as const;
      anyYearChanged = true;
      return [year, cut.toData()] as const;
    }),
  );
  if (!anyYearChanged && sameRoads(roadsOf(box), roads)) return box;
  return { ...box, roads, plannings: anyYearChanged ? plannings : box.plannings };
}

/** A road on the border; the box stays as it is when the road does not fit */
export function addRoadTo(box: GardenBoxData, input: RoadContext & { readonly border: Border; readonly widthCm: number }): GardenBoxData {
  if (!isValidWidth(input.widthCm)) return box;
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

/** A road lying against the box edge along its long side (a ring road) */
function isEdgeRoad(road: RoadData, size: BoxSize): boolean {
  if (road.widthCm <= road.lengthCm) {
    return road.xCm <= EPSILON_CM || road.xCm + road.widthCm >= size.widthCm - EPSILON_CM;
  }
  return road.yCm <= EPSILON_CM || road.yCm + road.lengthCm >= size.lengthCm - EPSILON_CM;
}

/**
 * Locked roads stay. Unlocked roads away from the edge keep their centre line with the new width;
 * unlocked edge roads go and come back as the ring. Roads are added on the borders that remain.
 */
export function placeAutomaticRoadsIn(box: GardenBoxData, input: AutomaticRoadsRequest): GardenBoxData {
  if (!isValidWidth(input.widthCm)) return box;
  const size = innerSizeOf(box);
  const lockedRoads = roadsOf(box).filter((road) => road.locked === true);
  const keptRoads = roadsOf(box)
    .filter((road) => road.locked !== true && !isEdgeRoad(road, size))
    .map((road) => withWidth(road, input.widthCm, size));
  const planning = Planning.from(box.plannings[String(input.year)], input.calendarOf(input.year));
  const created = automaticRoads({
    areas: [...planning.areasIn(input.season), ...planning.carriedAreasIn(input.season)],
    box: size,
    widthCm: input.widthCm,
    withRing: input.withRing,
    lockedRoads: [...lockedRoads, ...keptRoads],
  });
  const roads = [...roadsOf(box).flatMap((road) => (road.locked === true ? [road] : keptRoads.filter((kept) => kept.id === road.id))), ...created.map((piece) => ({ id: input.newId(), ...piece }))];
  return withRoads(box, roads, input);
}

/** A road with a new width; a wider road cuts areas back. Unknown road: the box stays */
export function setRoadWidthIn(box: GardenBoxData, roadId: string, input: RoadContext & { readonly widthCm: number }): GardenBoxData {
  const size = innerSizeOf(box);
  if (!isValidWidth(input.widthCm) || !roadsOf(box).some((road) => road.id === roadId)) return box;
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
