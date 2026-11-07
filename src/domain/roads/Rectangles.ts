import type { AreaPiece } from '../../types/planning.types.ts';

/** Sizes below this are floating point noise, not space */
export const EPSILON_CM = 1e-6;

/** True when the rectangles share a positive area; touching edges do not count */
export function overlaps(a: AreaPiece, b: AreaPiece): boolean {
  return (
    a.xCm < b.xCm + b.widthCm - EPSILON_CM
    && b.xCm < a.xCm + a.widthCm - EPSILON_CM
    && a.yCm < b.yCm + b.lengthCm - EPSILON_CM
    && b.yCm < a.yCm + a.lengthCm - EPSILON_CM
  );
}

function rectangle(left: number, top: number, right: number, bottom: number): AreaPiece[] {
  return right - left > EPSILON_CM && bottom - top > EPSILON_CM
    ? [{ xCm: left, yCm: top, widthCm: right - left, lengthCm: bottom - top }]
    : [];
}

/**
 * The part of the piece outside the cut, as at most four disjoint rectangles:
 * a band above and below over the full width, and left and right of the cut in between.
 */
export function subtractRectangle(piece: AreaPiece, cut: AreaPiece): AreaPiece[] {
  if (!overlaps(piece, cut)) return [piece];
  const left = piece.xCm;
  const right = piece.xCm + piece.widthCm;
  const top = piece.yCm;
  const bottom = piece.yCm + piece.lengthCm;
  const cutLeft = Math.max(left, cut.xCm);
  const cutRight = Math.min(right, cut.xCm + cut.widthCm);
  const cutTop = Math.max(top, cut.yCm);
  const cutBottom = Math.min(bottom, cut.yCm + cut.lengthCm);
  return [
    ...rectangle(left, top, right, cutTop),
    ...rectangle(left, cutBottom, right, bottom),
    ...rectangle(left, cutTop, cutLeft, cutBottom),
    ...rectangle(cutRight, cutTop, right, cutBottom),
  ];
}

/** The part of the piece outside every cut */
export function subtractAll(piece: AreaPiece, cuts: readonly AreaPiece[]): AreaPiece[] {
  return cuts.reduce<AreaPiece[]>((pieces, cut) => pieces.flatMap((p) => subtractRectangle(p, cut)), [piece]);
}
