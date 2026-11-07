import type { AreaPiece } from '../../types/planning.types.ts';
import type { PlantingArea } from './PlantingArea.ts';

/** Tolerance for rounding: edges closer than this are the same edge */
const EPSILON_CM = 1e-6;

/** The rectangle the layer's pieces live in: the layer itself, or a circle's bounding square */
export function layerBounds(layer: PlantingArea): { readonly widthCm: number; readonly lengthCm: number } {
  return layer.shape === 'rectangle'
    ? { widthCm: layer.widthCm, lengthCm: layer.lengthCm }
    : { widthCm: layer.diameterCm, lengthCm: layer.diameterCm };
}

interface Interval {
  readonly from: number;
  readonly to: number;
}

/** The parts of [0, width] not covered by the given intervals, in x order */
function uncovered(widthCm: number, covered: readonly Interval[]): Interval[] {
  const free: Interval[] = [];
  let cursor = 0;
  for (const interval of [...covered].sort((a, b) => a.from - b.from)) {
    if (interval.from > cursor + EPSILON_CM) free.push({ from: cursor, to: interval.from });
    cursor = Math.max(cursor, interval.to);
  }
  if (widthCm > cursor + EPSILON_CM) free.push({ from: cursor, to: widthCm });
  return free;
}

/**
 * The free space of a layer as disjoint rectangles: the layer's bounding
 * rectangle cut into horizontal bands at every fixed piece's top and bottom,
 * the uncovered x-intervals of each band, and vertically adjacent rectangles
 * with the same x-interval merged. Rectangles with a side below the minimum are dropped.
 */
export function freeRectangles(layer: PlantingArea, fixed: readonly AreaPiece[], minSideCm: number): AreaPiece[] {
  const { widthCm, lengthCm } = layerBounds(layer);
  const obstacles = fixed
    .map((p) => ({
      left: Math.max(0, p.xCm),
      right: Math.min(widthCm, p.xCm + p.widthCm),
      top: Math.max(0, p.yCm),
      bottom: Math.min(lengthCm, p.yCm + p.lengthCm),
    }))
    .filter((o) => o.right - o.left > EPSILON_CM && o.bottom - o.top > EPSILON_CM);

  const cuts = [...new Set([0, lengthCm, ...obstacles.flatMap((o) => [o.top, o.bottom])])].sort((a, b) => a - b);

  const done: AreaPiece[] = [];
  let open: AreaPiece[] = [];
  for (let band = 0; band + 1 < cuts.length; band++) {
    const top = cuts[band];
    const bottom = cuts[band + 1];
    if (bottom - top <= EPSILON_CM) continue;
    const covered = obstacles
      .filter((o) => o.top < bottom - EPSILON_CM && o.bottom > top + EPSILON_CM)
      .map((o) => ({ from: o.left, to: o.right }));

    const next: AreaPiece[] = [];
    for (const { from, to } of uncovered(widthCm, covered)) {
      const above = open.find((r) => Math.abs(r.xCm - from) <= EPSILON_CM && Math.abs(r.xCm + r.widthCm - to) <= EPSILON_CM
        && Math.abs(r.yCm + r.lengthCm - top) <= EPSILON_CM);
      next.push(above
        ? { ...above, lengthCm: bottom - above.yCm }
        : { xCm: from, yCm: top, widthCm: to - from, lengthCm: bottom - top });
    }
    done.push(...open.filter((r) => !next.some((n) => n.xCm === r.xCm && n.yCm === r.yCm)));
    open = next;
  }
  done.push(...open);

  return done
    .filter((r) => r.widthCm >= minSideCm - EPSILON_CM && r.lengthCm >= minSideCm - EPSILON_CM)
    .sort((a, b) => a.yCm - b.yCm || a.xCm - b.xCm);
}
