import { GrowingPeriod } from './GrowingPeriod.ts';
import { boundsOverlap } from './PlantFootprint.ts';
import type { Bounds, PlantFootprint } from './PlantFootprint.ts';
import { fitsInArea } from './PlantingArea.ts';
import type { PlantingArea } from './PlantingArea.ts';
import type { PlantRelation, PlantRelations } from './PlantRelations.ts';

export type { PlantingArea };

/**
 * Auto-placement: greedily places plants so that as many as possible fit in
 * space and time, with companions next to each other and combative plants
 * apart. Pure and deterministic: the same request always gives the same
 * result, whatever the order of the candidates.
 */

/** A plant that stays where it is (e.g. a locked plant) */
export interface FixedPlant {
  readonly id: string;
  readonly plantId: string;
  readonly footprint: PlantFootprint;
  readonly period: GrowingPeriod;
  readonly xCm: number;
  readonly yCm: number;
}

/** A plant to place, with the periods it may start in (in order of preference) */
export interface PlacementCandidate {
  readonly id: string;
  readonly plantId: string;
  readonly footprint: PlantFootprint;
  readonly periodOptions: readonly GrowingPeriod[];
}

export interface PlacementRequest {
  readonly area: PlantingArea;
  readonly fixed: readonly FixedPlant[];
  readonly candidates: readonly PlacementCandidate[];
  readonly relations: PlantRelations;
}

export interface PlacedCandidate {
  readonly id: string;
  /** Centre of the footprint, from the top-left of the area */
  readonly xCm: number;
  readonly yCm: number;
  readonly period: GrowingPeriod;
}

export type UnplacedReason = 'noSpace' | 'noPlantingWindow';

export interface UnplacedCandidate {
  readonly id: string;
  readonly reason: UnplacedReason;
  /** For noSpace: the weeks spanned by all period options */
  readonly weeks?: { readonly startWeek: number; readonly endWeek: number };
}

export interface PlacementResult {
  readonly placed: readonly PlacedCandidate[];
  readonly unplaced: readonly UnplacedCandidate[];
}

const GRID_CM = 5;
const NEIGHBOUR_DISTANCE_CM = 5;
const COMPANION_SCORE = 1;
const COMBATIVE_SCORE = -2;
const EPSILON = 1e-9;

/** A plant in the area during a run: fixed, or a candidate placed earlier */
interface Occupant {
  readonly plantId: string;
  readonly bounds: Bounds;
  readonly period: GrowingPeriod;
  /** Placed candidates score their neighbours too; fixed plants do not */
  readonly isCandidate: boolean;
}

/** An occupant seen from a candidate during one period option */
interface Neighbour {
  readonly bounds: Bounds;
  readonly relation: PlantRelation;
  /** What one point of relation score is worth in the layout score */
  readonly weight: number;
}

interface Spot {
  readonly xCm: number;
  readonly yCm: number;
  readonly period: GrowingPeriod;
  readonly score: number;
}

export function placePlants(request: PlacementRequest): PlacementResult {
  const occupants: Occupant[] = request.fixed.map((plant) => ({
    plantId: plant.plantId,
    bounds: plant.footprint.boundsAt(plant.xCm, plant.yCm),
    period: plant.period,
    isCandidate: false,
  }));
  const placed: PlacedCandidate[] = [];
  const unplaced: UnplacedCandidate[] = [];

  for (const candidate of inPlacementOrder(request.candidates)) {
    if (candidate.periodOptions.length === 0) {
      unplaced.push({ id: candidate.id, reason: 'noPlantingWindow' });
      continue;
    }

    const spot = findBestSpot(candidate, request.area, occupants, request.relations);
    if (spot === null) {
      unplaced.push({ id: candidate.id, reason: 'noSpace', weeks: windowOf(candidate.periodOptions) });
      continue;
    }

    placed.push({ id: candidate.id, xCm: spot.xCm, yCm: spot.yCm, period: spot.period });
    occupants.push({
      plantId: candidate.plantId,
      bounds: candidate.footprint.boundsAt(spot.xCm, spot.yCm),
      period: spot.period,
      isCandidate: true,
    });
  }

  return { placed, unplaced };
}

/**
 * Score of a layout: for every placed candidate and every other plant
 * (fixed or placed) that shares weeks with it,
 * +1 for a companion sharing an edge (touching or within 5 cm) and
 * -2 for a combative plant within 5 cm, weighted by the shared weeks /
 * the candidate's period length. Higher is better.
 *
 * placePlants maximises this score greedily: each step adds exactly what the
 * new plant gains towards it.
 * @throws Error when a placed id is not one of the request's candidates
 */
export function layoutScore(request: PlacementRequest, placed: readonly PlacedCandidate[]): number {
  const footprints = new Map(request.candidates.map((c) => [c.id, c] as const));
  const plants = [
    ...request.fixed.map((plant) => ({ ...plant, isCandidate: false })),
    ...placed.map((plant) => {
      const candidate = footprints.get(plant.id);
      if (candidate === undefined) {
        throw new Error(`Onbekende plant ${plant.id}`);
      }
      return { ...plant, plantId: candidate.plantId, footprint: candidate.footprint, isCandidate: true };
    }),
  ];

  let score = 0;
  for (const plant of plants.filter((p) => p.isCandidate)) {
    const bounds = plant.footprint.boundsAt(plant.xCm, plant.yCm);
    for (const other of plants) {
      const shared = other === plant ? 0 : GrowingPeriod.sharedWeeks(plant.period, other.period);
      if (shared > 0) {
        const relation = request.relations(plant.plantId, other.plantId);
        score += (relationScore(relation, bounds, other.footprint.boundsAt(other.xCm, other.yCm)) * shared) / plant.period.lengthInWeeks;
      }
    }
  }
  return score;
}

/** Largest footprint first, then longest period option, then plantId, then id */
function inPlacementOrder(candidates: readonly PlacementCandidate[]): PlacementCandidate[] {
  const longestOption = (c: PlacementCandidate): number => Math.max(0, ...c.periodOptions.map((p) => p.lengthInWeeks));
  return [...candidates].sort(
    (a, b) =>
      b.footprint.areaCm2 - a.footprint.areaCm2 ||
      longestOption(b) - longestOption(a) ||
      compareText(a.plantId, b.plantId) ||
      compareText(a.id, b.id),
  );
}

/** Locale-independent comparison, so the order is the same on every device */
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Tries every period option and position and keeps the highest gain in
 * layout score. Ties go to the earliest option, then the smallest y, then
 * the smallest x.
 */
function findBestSpot(
  candidate: PlacementCandidate,
  area: PlantingArea,
  occupants: readonly Occupant[],
  relations: PlantRelations,
): Spot | null {
  const { widthCm, lengthCm } = candidate.footprint;
  let best: Spot | null = null;

  for (const period of candidate.periodOptions) {
    const sameTime = occupants.filter((occupant) => occupant.period.overlaps(period));
    const neighbours: Neighbour[] = sameTime.map((occupant) => {
      const shared = occupant.period.overlappingWeeks(period);
      return {
        bounds: occupant.bounds,
        relation: relations(candidate.plantId, occupant.plantId),
        weight: shared / period.lengthInWeeks + (occupant.isCandidate ? shared / occupant.period.lengthInWeeks : 0),
      };
    });
    const scoring = neighbours.filter((neighbour) => neighbour.relation !== 'neutral');
    const boundsInTime = neighbours.map((neighbour) => neighbour.bounds);

    const lefts = candidatePositions(areaWidth(area), widthCm, boundsInTime.flatMap((b) => [b.right, b.left - widthCm]));
    const tops = candidatePositions(areaLength(area), lengthCm, boundsInTime.flatMap((b) => [b.bottom, b.top - lengthCm]));
    let bestInOption: Corner | null = null;

    for (const left of lefts) {
      // Only plants overlapping this column can block a position in it
      const column = boundsInTime.filter((b) => left < b.right && b.left < left + widthCm);
      for (const top of tops) {
        const bounds: Bounds = { left, top, right: left + widthCm, bottom: top + lengthCm };
        if (column.some((b) => boundsOverlap(bounds, b)) || !fitsInArea(area, candidate.footprint, left + widthCm / 2, top + lengthCm / 2)) {
          continue;
        }
        const corner: Corner = { left, top, score: scoringGain(bounds, scoring) };
        if (bestInOption === null || isBetterCorner(corner, bestInOption)) {
          bestInOption = corner;
        }
      }
    }

    // A later option only wins with a strictly higher score
    if (bestInOption !== null && (best === null || bestInOption.score > best.score + EPSILON)) {
      best = {
        xCm: bestInOption.left + widthCm / 2,
        yCm: bestInOption.top + lengthCm / 2,
        period,
        score: bestInOption.score,
      };
    }
  }
  return best;
}

/** Top-left corner of a free position with its gain */
interface Corner {
  readonly left: number;
  readonly top: number;
  readonly score: number;
}

/** Higher score wins; equal scores go to the smallest y, then the smallest x */
function isBetterCorner(corner: Corner, best: Corner): boolean {
  if (Math.abs(corner.score - best.score) > EPSILON) {
    return corner.score > best.score;
  }
  return corner.top < best.top || (corner.top === best.top && corner.left < best.left);
}

function scoringGain(bounds: Bounds, neighbours: readonly Neighbour[]): number {
  let score = 0;
  for (const neighbour of neighbours) {
    score += relationScore(neighbour.relation, bounds, neighbour.bounds) * neighbour.weight;
  }
  return score;
}

/**
 * +1 for a companion sharing an edge (close on one axis while facing each
 * other on the other), -2 for a combative plant within 5 cm on both axes.
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

function areaWidth(area: PlantingArea): number {
  return area.shape === 'circle' ? area.diameterCm : area.widthCm;
}

function areaLength(area: PlantingArea): number {
  return area.shape === 'circle' ? area.diameterCm : area.lengthCm;
}

function windowOf(options: readonly GrowingPeriod[]): { startWeek: number; endWeek: number } {
  return {
    startWeek: Math.min(...options.map((p) => p.startWeek)),
    endWeek: Math.max(...options.map((p) => p.endWeek)),
  };
}
