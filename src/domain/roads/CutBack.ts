import type { AreaPiece } from '../../types/planning.types.ts';
import { EPSILON_CM, overlaps, subtractAll } from './Rectangles.ts';

/** An area has at most this many pieces */
const MAX_PIECES = 3;

function areaOf(piece: AreaPiece): number {
  return piece.widthCm * piece.lengthCm;
}

/**
 * The pieces cut back from the roads: leftovers with a side below the minimum are dropped
 * and at most the three largest stay. Null when nothing usable is left.
 * Returns the same array when no road overlaps a piece.
 */
export function cutBack(pieces: readonly AreaPiece[], roads: readonly AreaPiece[], minSideCm: number): AreaPiece[] | null {
  if (!pieces.some((piece) => roads.some((road) => overlaps(piece, road)))) return pieces as AreaPiece[];

  const leftovers = pieces
    .flatMap((piece) => subtractAll(piece, roads))
    .filter((piece) => Math.min(piece.widthCm, piece.lengthCm) >= minSideCm - EPSILON_CM);
  if (leftovers.length === 0) return null;

  return [...leftovers]
    .sort((a, b) => areaOf(b) - areaOf(a) || a.yCm - b.yCm || a.xCm - b.xCm)
    .slice(0, MAX_PIECES)
    .sort((a, b) => a.yCm - b.yCm || a.xCm - b.xCm);
}
