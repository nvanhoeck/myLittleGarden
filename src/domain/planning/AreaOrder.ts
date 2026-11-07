import type { PlantRelation } from './PlantRelations.ts';

/** Above this many plantings every order is too many to try; a greedy order is used */
const MAX_EXHAUSTIVE = 7;

/** What two neighbouring areas are worth: companions +1, combative plants -2 */
function pairScore(relation: PlantRelation): number {
  if (relation === 'companion') return 1;
  if (relation === 'combative') return -2;
  return 0;
}

function scoreOf(order: readonly number[], score: readonly (readonly number[])[]): number {
  let total = 0;
  for (let i = 1; i < order.length; i++) total += score[order[i - 1]][order[i]];
  return total;
}

/** Tries every order of the (sorted) ids; the first best one wins */
function bestOfAll(score: readonly (readonly number[])[]): number[] {
  const n = score.length;
  const used = new Array<boolean>(n).fill(false);
  const current: number[] = [];
  let best: number[] = [];
  let bestScore = -Infinity;

  const extend = (partial: number): void => {
    if (current.length === n) {
      if (partial > bestScore) {
        bestScore = partial;
        best = [...current];
      }
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const added = current.length === 0 ? 0 : score[current[current.length - 1]][i];
      used[i] = true;
      current.push(i);
      extend(partial + added);
      current.pop();
      used[i] = false;
    }
  };
  extend(0);
  return best;
}

/**
 * Greedy: start with the id with most relations, then keep appending the
 * best-scoring next id. Pairwise swaps that raise the score then repair dead ends at the tail.
 */
function greedy(score: readonly (readonly number[])[]): number[] {
  const n = score.length;
  const relationCount = score.map((row) => row.filter((s) => s !== 0).length);
  let start = 0;
  for (let i = 1; i < n; i++) if (relationCount[i] > relationCount[start]) start = i;

  const order = [start];
  const left = new Set(Array.from({ length: n }, (_, i) => i).filter((i) => i !== start));
  while (left.size > 0) {
    const last = order[order.length - 1];
    let next = -1;
    for (const candidate of left) {
      if (next === -1 || score[last][candidate] > score[last][next]) next = candidate;
    }
    order.push(next);
    left.delete(next);
  }

  let current = scoreOf(order, score);
  for (let pass = 0, improved = true; improved && pass < n; pass++) {
    improved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        [order[i], order[j]] = [order[j], order[i]];
        const swapped = scoreOf(order, score);
        if (swapped > current) {
          current = swapped;
          improved = true;
        } else {
          [order[i], order[j]] = [order[j], order[i]];
        }
      }
    }
  }
  return order;
}

/**
 * Orders plantings so companions end up side by side and combative plants
 * apart: the order's score is the sum over neighbouring pairs (+1 companion,
 * -2 combative). Up to 7 ids every order is tried, above that a greedy order.
 * Ties go to id order, so the result does not depend on the input order.
 */
export function orderForNeighbours(ids: readonly string[], relationOf: (a: string, b: string) => PlantRelation): string[] {
  const sorted = [...new Set(ids)].sort();
  if (sorted.length <= 2) return sorted;
  const score = sorted.map((a) => sorted.map((b) => (a === b ? 0 : pairScore(relationOf(a, b)))));
  const order = sorted.length <= MAX_EXHAUSTIVE ? bestOfAll(score) : greedy(score);
  return order.map((i) => sorted[i]);
}
