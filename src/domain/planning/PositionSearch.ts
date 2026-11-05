import { boundsOverlap } from './PlantFootprint.ts';
import type { Bounds, PlantFootprint } from './PlantFootprint.ts';
import { fitsInArea } from './PlantingArea.ts';
import type { PlantingArea } from './PlantingArea.ts';
import type { PlantRelation, PlantRelations } from './PlantRelations.ts';

/** A plant already in the area */
export interface Occupant {
  readonly plantId: string;
  readonly bounds: Bounds;
  /** What one point of relation score with this plant is worth */
  readonly weight: number;
}

export interface Spot {
  /** Centre of the footprint, from the top-left of the area */
  readonly xCm: number;
  readonly yCm: number;
  readonly score: number;
}

const GRID_CM = 5;
const NEIGHBOUR_DISTANCE_CM = 5;
const COMPANION_SCORE = 1;
const COMBATIVE_SCORE = -2;
const EPSILON = 1e-9;
/** How far from a footprint a plant can still change its score */
const REACH_CM = NEIGHBOUR_DISTANCE_CM + EPSILON;

interface ScoringNeighbour {
  readonly bounds: Bounds;
  readonly relation: PlantRelation;
  readonly weight: number;
}

interface Corner {
  readonly left: number;
  readonly top: number;
  readonly score: number;
}

/**
 * The best free spot for a footprint: inside the area, overlapping no
 * occupant, with the highest relation score (+1 per companion touching it or within
 * 5 cm (facing each other), -2 per combative plant within 5 cm, times the occupant's weight).
 * Ties go to the smallest y, then the smallest x. Null when nothing fits.
 */
export function bestSpot(
  plantId: string,
  footprint: PlantFootprint,
  area: PlantingArea,
  occupants: readonly Occupant[],
  relations: PlantRelations,
): Spot | null {
  const { widthCm, lengthCm } = footprint;
  const scoring: ScoringNeighbour[] = occupants.flatMap((occupant) => {
    const relation = relations(plantId, occupant.plantId);
    return relation === 'neutral' ? [] : [{ bounds: occupant.bounds, relation, weight: occupant.weight }];
  });
  const taken = occupants.map((occupant) => occupant.bounds);

  const lefts = candidatePositions(areaWidth(area), widthCm, taken.flatMap((b) => [b.right, b.left - widthCm]));
  const tops = candidatePositions(areaLength(area), lengthCm, taken.flatMap((b) => [b.bottom, b.top - lengthCm]));
  const takenByLeft = new LeftSortedBounds(taken);
  const scoringByLeft = new LeftSortedBounds(scoring.map((neighbour) => neighbour.bounds));
  // Every candidate lies inside the bounding box of its footprint, which only a circular area can cut off
  const needsFitCheck = area.shape === 'circle';
  let best: Corner | null = null;

  for (const left of lefts) {
    const right = left + widthCm;
    // Only plants overlapping this column can block a position in it
    const column = takenByLeft.within(left, right).map((i) => taken[i]).filter((b) => left < b.right && b.left < right);
    // Only plants within reach of this column can score
    const neighbours = scoringByLeft.within(left - REACH_CM, right + REACH_CM).map((i) => scoring[i]);
    // Tops ascend: a position blocked by a plant stays blocked until the plant's bottom edge
    for (let t = 0; t < tops.length; t++) {
      const top = tops[t];
      const bounds: Bounds = { left, top, right, bottom: top + lengthCm };
      const blocker = column.find((b) => boundsOverlap(bounds, b));
      if (blocker !== undefined) {
        t = lastStartBefore(tops, blocker.bottom, t);
        continue;
      }
      if (needsFitCheck && !fitsInArea(area, footprint, left + widthCm / 2, top + lengthCm / 2)) {
        continue;
      }
      const corner: Corner = { left, top, score: scoringGain(bounds, neighbours) };
      if (best === null || isBetterCorner(corner, best)) {
        best = corner;
      }
    }
  }
  return best === null ? null : { xCm: best.left + widthCm / 2, yCm: best.top + lengthCm / 2, score: best.score };
}

/**
 * Rectangles sorted by their left edge, so the ones in a vertical strip are
 * found without scanning them all. Results come back in the original order.
 */
class LeftSortedBounds {
  private readonly order: number[];
  private readonly widest: number;
  private readonly all: readonly Bounds[];

  constructor(all: readonly Bounds[]) {
    this.all = all;
    this.order = all.map((_, i) => i).sort((x, y) => all[x].left - all[y].left || x - y);
    this.widest = all.reduce((widest, b) => Math.max(widest, b.right - b.left), 0);
  }

  /** Indexes of the rectangles that may touch the strip between minX and maxX (a superset), ascending */
  within(minX: number, maxX: number): number[] {
    const from = this.firstWithLeftAtLeast(minX - this.widest - EPSILON);
    const found: number[] = [];
    for (let i = from; i < this.order.length && this.all[this.order[i]].left <= maxX + EPSILON; i++) {
      found.push(this.order[i]);
    }
    return found.sort((x, y) => x - y);
  }

  private firstWithLeftAtLeast(x: number): number {
    let low = 0;
    let high = this.order.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.all[this.order[mid]].left < x) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }
}

/** The last index at or after `from` whose start is below the limit (`from` itself when none further is) */
function lastStartBefore(starts: readonly number[], limit: number, from: number): number {
  let low = from;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (starts[mid] < limit) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
}

/** Higher score wins; equal scores go to the smallest y, then the smallest x */
function isBetterCorner(corner: Corner, best: Corner): boolean {
  if (Math.abs(corner.score - best.score) > EPSILON) {
    return corner.score > best.score;
  }
  return corner.top < best.top || (corner.top === best.top && corner.left < best.left);
}

function scoringGain(bounds: Bounds, neighbours: readonly ScoringNeighbour[]): number {
  let score = 0;
  for (const neighbour of neighbours) {
    score += relationScore(neighbour.relation, bounds, neighbour.bounds) * neighbour.weight;
  }
  return score;
}

/**
 * +1 for a companion touching or within 5 cm (close on one axis while facing
 * each other on the other), -2 for a combative plant within 5 cm on both axes.
 */
function relationScore(relation: PlantRelation, a: Bounds, b: Bounds): number {
  if (relation === 'neutral') {
    return 0;
  }
  const gapX = Math.max(0, b.left - a.right, a.left - b.right);
  const gapY = Math.max(0, b.top - a.bottom, a.top - b.bottom);
  const nearX = gapX <= NEIGHBOUR_DISTANCE_CM + EPSILON;
  const nearY = gapY <= NEIGHBOUR_DISTANCE_CM + EPSILON;

  if (relation === 'companion') {
    const facingX = Math.min(a.right, b.right) - Math.max(a.left, b.left) > EPSILON;
    const facingY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > EPSILON;
    return (nearX && facingY) || (nearY && facingX) ? COMPANION_SCORE : 0;
  }
  return nearX && nearY ? COMBATIVE_SCORE : 0;
}

/**
 * Start coordinates to try on one axis, ascending: the 5 cm grid, the far
 * edge of the area, and the given edges of other plants, so a footprint can
 * sit flush against them. Only starts that keep the footprint inside are kept.
 */
function candidatePositions(areaSizeCm: number, footprintSizeCm: number, plantEdges: readonly number[]): number[] {
  const maxStart = areaSizeCm - footprintSizeCm;
  const starts = new Map<number, number>();
  const add = (start: number): void => {
    if (start >= -EPSILON && start <= maxStart + EPSILON) {
      const clamped = Math.min(Math.max(start, 0), maxStart);
      starts.set(Math.round(clamped * 1e6), clamped);
    }
  };

  for (let start = 0; start <= maxStart + EPSILON; start += GRID_CM) {
    add(start);
  }
  add(maxStart);
  plantEdges.forEach(add);
  return [...starts.values()].sort((a, b) => a - b);
}

export function areaWidth(area: PlantingArea): number {
  return area.shape === 'circle' ? area.diameterCm : area.widthCm;
}

export function areaLength(area: PlantingArea): number {
  return area.shape === 'circle' ? area.diameterCm : area.lengthCm;
}
