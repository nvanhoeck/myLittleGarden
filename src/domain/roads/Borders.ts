import type { AreaData, AreaPiece } from '../../types/planning.types.ts';
import { EPSILON_CM } from './Rectangles.ts';

export interface Border {
  readonly orientation: 'vertical' | 'horizontal'; // vertical = the line x = constant
  readonly lineCm: number; // x for vertical, y for horizontal
  readonly fromCm: number; // start of the segment along the line
  readonly toCm: number; // end, toCm > fromCm
  readonly kind: 'between' | 'edge'; // two areas, or area on the box edge
  /** edge only: which side of the line the box interior lies ('after' = larger coordinates) */
  readonly inside?: 'before' | 'after';
}

interface BoxSize {
  readonly widthCm: number;
  readonly lengthCm: number;
}

type AreaPieces = Pick<AreaData, 'id' | 'pieces'>;

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON_CM;
}

/** The piece edges as [line, from, to] for the given orientation: its low and high edge across, and its span along */
function acrossAndAlong(piece: AreaPiece, orientation: Border['orientation']): { low: number; high: number; from: number; to: number } {
  return orientation === 'vertical'
    ? { low: piece.xCm, high: piece.xCm + piece.widthCm, from: piece.yCm, to: piece.yCm + piece.lengthCm }
    : { low: piece.yCm, high: piece.yCm + piece.lengthCm, from: piece.xCm, to: piece.xCm + piece.widthCm };
}

function betweenBorders(areas: readonly AreaPieces[], orientation: Border['orientation']): Border[] {
  const borders: Border[] = [];
  areas.forEach((first, i) => {
    areas.slice(i + 1).forEach((second) => {
      first.pieces.forEach((a) => {
        second.pieces.forEach((b) => {
          const pa = acrossAndAlong(a, orientation);
          const pb = acrossAndAlong(b, orientation);
          const from = Math.max(pa.from, pb.from);
          const to = Math.min(pa.to, pb.to);
          if (to - from <= EPSILON_CM) return;
          if (near(pa.high, pb.low)) borders.push({ orientation, lineCm: pa.high, fromCm: from, toCm: to, kind: 'between' });
          else if (near(pb.high, pa.low)) borders.push({ orientation, lineCm: pb.high, fromCm: from, toCm: to, kind: 'between' });
        });
      });
    });
  });
  return borders;
}

function edgeBorders(areas: readonly AreaPieces[], box: BoxSize, orientation: Border['orientation']): Border[] {
  const size = orientation === 'vertical' ? box.widthCm : box.lengthCm;
  const borders: Border[] = [];
  areas.forEach((area) => {
    area.pieces.forEach((piece) => {
      const { low, high, from, to } = acrossAndAlong(piece, orientation);
      if (near(low, 0)) borders.push({ orientation, lineCm: 0, fromCm: from, toCm: to, kind: 'edge', inside: 'after' });
      if (near(high, size)) borders.push({ orientation, lineCm: size, fromCm: from, toCm: to, kind: 'edge', inside: 'before' });
    });
  });
  return borders;
}

function sameLine(a: Border, b: Border): boolean {
  return a.orientation === b.orientation && near(a.lineCm, b.lineCm) && a.kind === b.kind && a.inside === b.inside;
}

function byPosition(a: Border, b: Border): number {
  return (
    (a.orientation === b.orientation ? 0 : a.orientation === 'vertical' ? -1 : 1)
    || a.lineCm - b.lineCm
    || (a.kind === b.kind ? 0 : a.kind === 'between' ? -1 : 1)
    || (a.inside === b.inside ? 0 : a.inside === 'after' ? -1 : 1)
    || a.fromCm - b.fromCm
    || a.toCm - b.toCm
  );
}

/** Joins segments on the same line that touch or overlap */
function merged(borders: readonly Border[]): Border[] {
  const result: Border[] = [];
  [...borders].sort(byPosition).forEach((border) => {
    const last = result[result.length - 1];
    if (last && sameLine(last, border) && border.fromCm <= last.toCm + EPSILON_CM) {
      result[result.length - 1] = { ...last, toCm: Math.max(last.toCm, border.toCm) };
    } else {
      result.push(border);
    }
  });
  return result;
}

/** The stretches of the border that no road lies on (a road touching the line counts) */
function uncovered(border: Border, roads: readonly AreaPiece[]): Border[] {
  const covers = roads
    .map((road) => acrossAndAlong(road, border.orientation))
    .filter((road) => road.low <= border.lineCm + EPSILON_CM && road.high >= border.lineCm - EPSILON_CM)
    .sort((a, b) => a.from - b.from);
  const result: Border[] = [];
  let cursor = border.fromCm;
  covers.forEach((cover) => {
    if (cover.from - cursor > EPSILON_CM) result.push({ ...border, fromCm: cursor, toCm: Math.min(cover.from, border.toCm) });
    cursor = Math.max(cursor, cover.to);
  });
  if (border.toCm - cursor > EPSILON_CM) result.push({ ...border, fromCm: cursor });
  return result;
}

/**
 * The lines where a road can go: between two areas, and along the box edge for an area on the edge.
 * Stretches already covered by a road are left out. The order is deterministic.
 */
export function bordersOf(areas: readonly AreaPieces[], box: BoxSize, roads: readonly AreaPiece[]): Border[] {
  const orientations: Border['orientation'][] = ['vertical', 'horizontal'];
  const all = orientations.flatMap((orientation) => [...betweenBorders(areas, orientation), ...edgeBorders(areas, box, orientation)]);
  return merged(all).flatMap((border) => uncovered(border, roads)).sort(byPosition);
}
