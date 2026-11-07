import type { AreaData, AreaPiece } from '../../types/planning.types.ts';
import type { RoadData } from '../../types/component.types.ts';
import { bordersOf } from './Borders.ts';
import type { Border } from './Borders.ts';
import { EPSILON_CM } from './Rectangles.ts';

interface BoxSize {
  readonly widthCm: number;
  readonly lengthCm: number;
}

export interface AutomaticRoadsInput {
  readonly areas: readonly Pick<AreaData, 'id' | 'pieces'>[];
  readonly box: BoxSize;
  readonly widthCm: number;
  readonly withRing: boolean;
  readonly lockedRoads: readonly AreaPiece[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Where a road of the given thickness starts across its line: centred on a between border, on the inside of an edge border */
function startAcross(border: Border, thicknessCm: number, boxAcrossCm: number): number {
  const start = border.kind === 'edge'
    ? (border.inside === 'after' ? border.lineCm : border.lineCm - thicknessCm)
    : border.lineCm - thicknessCm / 2;
  return clamp(start, 0, boxAcrossCm - thicknessCm);
}

/** The road on a border, kept inside the box; null when the road does not fit across the box or the border has no length */
export function roadOnBorder(border: Border, widthCm: number, box: BoxSize): AreaPiece | null {
  const length = border.toCm - border.fromCm;
  if (length <= EPSILON_CM) return null;
  if (border.orientation === 'vertical') {
    if (widthCm > box.widthCm) return null;
    return { xCm: startAcross(border, widthCm, box.widthCm), yCm: border.fromCm, widthCm, lengthCm: length };
  }
  if (widthCm > box.lengthCm) return null;
  return { xCm: border.fromCm, yCm: startAcross(border, widthCm, box.lengthCm), widthCm: length, lengthCm: widthCm };
}

/** Four roads along the box edges: top and bottom over the full width, the sides between them */
export function ringRoads(widthCm: number, box: BoxSize): AreaPiece[] {
  if (!(widthCm > 0) || 2 * widthCm >= Math.min(box.widthCm, box.lengthCm)) return [];
  const sideLength = box.lengthCm - 2 * widthCm;
  return [
    { xCm: 0, yCm: 0, widthCm: box.widthCm, lengthCm: widthCm },
    { xCm: 0, yCm: box.lengthCm - widthCm, widthCm: box.widthCm, lengthCm: widthCm },
    { xCm: 0, yCm: widthCm, widthCm, lengthCm: sideLength },
    { xCm: box.widthCm - widthCm, yCm: widthCm, widthCm, lengthCm: sideLength },
  ];
}

/**
 * The roads to create: an optional ring, and a road on every border between two areas
 * that no ring or locked road covers. Locked roads are not part of the result.
 */
export function automaticRoads(input: AutomaticRoadsInput): AreaPiece[] {
  const ring = input.withRing ? ringRoads(input.widthCm, input.box) : [];
  const borders = bordersOf(input.areas, input.box, [...ring, ...input.lockedRoads]).filter((border) => border.kind === 'between');
  const between = borders
    .map((border) => roadOnBorder(border, input.widthCm, input.box))
    .filter((road): road is AreaPiece => road !== null);
  return [...ring, ...between];
}

/** Resizes one axis: a road on the box edge keeps that edge, any other stays centred */
function resizedAxis(start: number, thickness: number, newThickness: number, boxSize: number): number {
  if (start <= EPSILON_CM) return 0;
  if (start + thickness >= boxSize - EPSILON_CM) return boxSize - newThickness;
  return clamp(start + thickness / 2 - newThickness / 2, 0, boxSize - newThickness);
}

/** The road with a new width (its short side); a road wider than the box fills the box */
export function withWidth(road: RoadData, widthCm: number, box: BoxSize): RoadData {
  if (road.widthCm <= road.lengthCm) {
    const width = Math.min(widthCm, box.widthCm);
    return { ...road, xCm: resizedAxis(road.xCm, road.widthCm, width, box.widthCm), widthCm: width };
  }
  const length = Math.min(widthCm, box.lengthCm);
  return { ...road, yCm: resizedAxis(road.yCm, road.lengthCm, length, box.lengthCm), lengthCm: length };
}
