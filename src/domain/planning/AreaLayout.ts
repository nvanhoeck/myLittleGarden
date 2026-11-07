import type { AreaPiece } from '../../types/planning.types.ts';
import { plantCountOf } from './AreaGrid.ts';
import { orderForNeighbours } from './AreaOrder.ts';
import { freeRectangles } from './FreeSpace.ts';
import { minimumPatchSideCm } from './PlantFootprint.ts';
import type { FootprintTraits } from './PlantFootprint.ts';
import type { PlantingArea } from './PlantingArea.ts';
import type { PlantRelations } from './PlantRelations.ts';

export interface AreaLayoutRequest {
  /** The layers to lay out on; the index is the layer index (0 = bottom) */
  readonly layers: readonly PlantingArea[];
  /** Pieces that stay put: locked areas and areas carried over from earlier seasons */
  readonly fixed: readonly { layerIndex: number; piece: AreaPiece }[];
  /** The plantings that start in the season */
  readonly plantings: readonly { plantingId: string; plantId: string; ratio: number; traits: FootprintTraits }[];
  /** Relations by plant id */
  readonly relations: PlantRelations;
}

export interface LaidOutArea {
  readonly plantingId: string;
  readonly plantId: string;
  readonly layerIndex: number;
  readonly pieces: readonly AreaPiece[];
}

export interface AreaShare {
  readonly plantingId: string;
  readonly plantId: string;
  /** ratio / sum of ratios */
  readonly targetShare: number;
  /** The area's size / the free area */
  readonly actualShare: number;
  /** Plants on the area's grid; null for patch and thinning plants ("zaaivlak") */
  readonly plantCount: number | null;
  /** False when the planting got no area ("past niet") */
  readonly fits: boolean;
}

export interface AreaLayoutResult {
  readonly areas: readonly LaidOutArea[];
  readonly shares: readonly AreaShare[];
}

type Planting = AreaLayoutRequest['plantings'][number];

/** Tolerance for rounding of lengths (cm) */
const EPSILON_CM = 1e-6;
/** The most pieces one area may have */
const MAX_PIECES = 3;
/** A planting's share may be off by this fraction of its target before it gets an extra piece */
const SHARE_TOLERANCE = 0.1;
/** A free rectangle is a strip field when its long side is at least this many times its short side */
const STRIP_RATIO = 2;

/** Part of a planting's target poured into one free rectangle */
interface Chunk {
  readonly plantingId: string;
  readonly rectangle: number;
  readonly volume: number;
}

/** A planting's claim on a free rectangle, as a relative weight */
interface Claim {
  readonly plantingId: string;
  readonly weight: number;
}

function isSownOverArea(traits: FootprintTraits): boolean {
  return traits.plantingStyle === 'patch' || traits.plantingStyle === 'thinning';
}

/** The smallest side a piece may have */
function minimumSideOf(traits: FootprintTraits): number {
  return isSownOverArea(traits) ? minimumPatchSideCm(traits) : 2 * traits.spacingRadiusCm;
}

/** The grid spacing pieces snap to; null for plants sown over the area */
function snapSpacingOf(traits: FootprintTraits): number | null {
  return isSownOverArea(traits) || !(traits.spacingRadiusCm > 0) ? null : 2 * traits.spacingRadiusCm;
}

/** A length rounded down to whole plant spacings */
function snap(lengthCm: number, spacingCm: number | null): number {
  if (spacingCm === null) return lengthCm;
  return Math.floor(lengthCm / spacingCm + 1e-9) * spacingCm;
}

function areaOf(piece: AreaPiece): number {
  return piece.widthCm * piece.lengthCm;
}

function sumOf(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

/** The worst aspect ratio of a treemap row of the given areas along a side */
function worstAspect(areas: readonly number[], sideCm: number): number {
  const depth = sumOf(areas) / sideCm;
  return Math.max(...areas.map((area) => {
    const along = area / depth;
    return Math.max(along / depth, depth / along);
  }));
}

/**
 * Splits a rectangle among claims, in order. A long rectangle (long side ≥ 2 ×
 * short side) becomes strips across its short side; a squarish one a squarified
 * treemap that keeps the order. Each row is filled as a band: a single-claim band
 * snaps its depth, a multi-claim band snaps each piece's length along the band, to
 * whole plant spacings; the slack goes to the next piece or band.
 */
function partition(rectangle: AreaPiece, claims: readonly Claim[], spacingOf: (plantingId: string) => number | null): Map<string, AreaPiece> {
  const pieces = new Map<string, AreaPiece>();
  const strips = Math.max(rectangle.widthCm, rectangle.lengthCm) >= STRIP_RATIO * Math.min(rectangle.widthCm, rectangle.lengthCm) - EPSILON_CM;
  let rest = claims;
  let free = rectangle;
  while (rest.length > 0) {
    // Bands across the width are stacked from top to bottom; otherwise from left to right
    const acrossWidth = strips ? rectangle.lengthCm >= rectangle.widthCm : free.widthCm <= free.lengthCm;
    const side = acrossWidth ? free.widthCm : free.lengthCm;
    const room = acrossWidth ? free.lengthCm : free.widthCm;
    const scale = (side * room) / sumOf(rest.map((c) => c.weight));
    const areas = rest.map((c) => c.weight * scale);

    let count = 1;
    if (!strips) {
      while (count < rest.length && worstAspect(areas.slice(0, count + 1), side) <= worstAspect(areas.slice(0, count), side)) count++;
    }
    const row = rest.slice(0, count);
    rest = rest.slice(count);

    let depth = rest.length === 0 ? room : sumOf(areas.slice(0, count)) / side;
    if (row.length === 1) depth = snap(depth, spacingOf(row[0].plantingId));

    const rowWeight = sumOf(row.map((c) => c.weight));
    let start = 0;
    let nominalEnd = 0;
    row.forEach((claim, index) => {
      nominalEnd = index === row.length - 1 ? side : nominalEnd + (claim.weight / rowWeight) * side;
      const length = row.length === 1 ? side : snap(nominalEnd - start, spacingOf(claim.plantingId));
      pieces.set(claim.plantingId, acrossWidth
        ? { xCm: free.xCm + start, yCm: free.yCm, widthCm: length, lengthCm: depth }
        : { xCm: free.xCm, yCm: free.yCm + start, widthCm: depth, lengthCm: length });
      start += length;
    });

    free = acrossWidth
      ? { xCm: free.xCm, yCm: free.yCm + depth, widthCm: free.widthCm, lengthCm: free.lengthCm - depth }
      : { xCm: free.xCm + depth, yCm: free.yCm, widthCm: free.widthCm - depth, lengthCm: free.lengthCm };
  }
  return pieces;
}

/**
 * Partitions a rectangle and drops claims whose piece is below their minimum
 * side, one at a time (the smallest claim first), until every piece fits.
 */
function partitionFitting(
  rectangle: AreaPiece,
  claims: readonly Claim[],
  byId: ReadonlyMap<string, Planting>,
): Map<string, AreaPiece> {
  const spacingOf = (id: string) => snapSpacingOf(byId.get(id)!.traits);
  let remaining = claims;
  while (remaining.length > 0) {
    const pieces = partition(rectangle, remaining, spacingOf);
    const tooSmall = remaining.filter((claim) => {
      const piece = pieces.get(claim.plantingId)!;
      return Math.min(piece.widthCm, piece.lengthCm) < minimumSideOf(byId.get(claim.plantingId)!.traits) - EPSILON_CM;
    });
    if (tooSmall.length === 0) return pieces;
    const dropped = tooSmall.reduce((smallest, claim) => (claim.weight < smallest.weight ? claim : smallest));
    remaining = remaining.filter((claim) => claim !== dropped);
  }
  return new Map();
}

/**
 * Pours each planting's target, in order, into the free rectangles of a
 * layer, largest first: a planting that overflows the current rectangle
 * continues in the next one.
 */
function pour(order: readonly string[], targetOf: (id: string) => number, rectangles: readonly AreaPiece[]): Chunk[] {
  const chunks: Chunk[] = [];
  let current = 0;
  let room = rectangles.length > 0 ? areaOf(rectangles[0]) : 0;
  for (const plantingId of order) {
    let need = targetOf(plantingId);
    while (need > EPSILON_CM && current < rectangles.length) {
      const volume = Math.min(need, room);
      if (volume > EPSILON_CM) chunks.push({ plantingId, rectangle: current, volume });
      need -= volume;
      room -= volume;
      if (room <= EPSILON_CM) {
        current++;
        room = current < rectangles.length ? areaOf(rectangles[current]) : 0;
      }
    }
  }
  return chunks;
}

/** The chunks a planting keeps: at most 3, none below 10 % of its target unless it is the only one */
function keptChunks(chunks: readonly Chunk[], target: number): Chunk[] {
  return [...chunks]
    .sort((a, b) => b.volume - a.volume || a.rectangle - b.rectangle)
    .slice(0, MAX_PIECES)
    .filter((chunk, index) => index === 0 || chunk.volume >= SHARE_TOLERANCE * target)
    .sort((a, b) => a.rectangle - b.rectangle);
}

/** Cost of a layer left empty while there are plantings enough for every layer */
const EMPTY_LAYER_COST = 1e9;

/**
 * Splits the plantings (in neighbour order) into consecutive groups, one per
 * layer with free space, lowest layer first; an area lives on one layer and a
 * group fills its layer. The split whose shares stay closest to their targets
 * wins, and every layer gets a group when there are plantings enough.
 */
function groupByLayer(order: readonly string[], ratioOf: (id: string) => number, capacities: readonly number[]): Map<string, number> {
  const layers = capacities.map((_, index) => index).filter((index) => capacities[index] > EPSILON_CM);
  const result = new Map<string, number>();
  if (layers.length === 0) return result;

  const free = sumOf(capacities);
  const totalRatio = sumOf(order.map(ratioOf));
  const n = order.length;
  const k = layers.length;
  const groupCost = (layer: number, from: number, to: number): number => {
    if (from === to) return n >= k ? EMPTY_LAYER_COST : capacities[layer] / free;
    const ratios = order.slice(from, to).map(ratioOf);
    const groupRatio = sumOf(ratios);
    return sumOf(ratios.map((ratio) => Math.abs(
      (groupRatio > 0 ? (capacities[layer] * ratio) / groupRatio : 0) / free - (totalRatio > 0 ? ratio / totalRatio : 0),
    )));
  };

  // cost[j][i]: the best split of the first i plantings over the first j layers; cut[j][i]: where layer j's group starts
  const cost = Array.from({ length: k + 1 }, () => new Array<number>(n + 1).fill(Infinity));
  const cut = Array.from({ length: k + 1 }, () => new Array<number>(n + 1).fill(0));
  cost[0][0] = 0;
  for (let j = 1; j <= k; j++) {
    for (let i = 0; i <= n; i++) {
      for (let s = 0; s <= i; s++) {
        const candidate = cost[j - 1][s] + groupCost(layers[j - 1], s, i);
        if (candidate < cost[j][i] - 1e-12) {
          cost[j][i] = candidate;
          cut[j][i] = s;
        }
      }
    }
  }
  for (let j = k, i = n; j >= 1; j--) {
    const start = cut[j][i];
    for (let t = start; t < i; t++) result.set(order[t], layers[j - 1]);
    i = start;
  }
  return result;
}

/** The piece grown into a free neighbour rectangle along their shared edge, when its whole side lies on that edge */
function extendInto(piece: AreaPiece, leftover: AreaPiece): AreaPiece | null {
  const near = (a: number, b: number) => Math.abs(a - b) <= EPSILON_CM;
  const withinX = piece.xCm >= leftover.xCm - EPSILON_CM && piece.xCm + piece.widthCm <= leftover.xCm + leftover.widthCm + EPSILON_CM;
  const withinY = piece.yCm >= leftover.yCm - EPSILON_CM && piece.yCm + piece.lengthCm <= leftover.yCm + leftover.lengthCm + EPSILON_CM;
  if (withinX && near(piece.yCm + piece.lengthCm, leftover.yCm)) return { ...piece, lengthCm: piece.lengthCm + leftover.lengthCm };
  if (withinX && near(leftover.yCm + leftover.lengthCm, piece.yCm)) return { ...piece, yCm: leftover.yCm, lengthCm: piece.lengthCm + leftover.lengthCm };
  if (withinY && near(piece.xCm + piece.widthCm, leftover.xCm)) return { ...piece, widthCm: piece.widthCm + leftover.widthCm };
  if (withinY && near(leftover.xCm + leftover.widthCm, piece.xCm)) return { ...piece, xCm: leftover.xCm, widthCm: piece.widthCm + leftover.widthCm };
  return null;
}

/** The planting's piece that grows most into the leftover: its index and grown shape */
function bestExtension(pieces: readonly AreaPiece[], leftover: AreaPiece): { index: number; piece: AreaPiece } | null {
  let best: { index: number; piece: AreaPiece } | null = null;
  let gain = EPSILON_CM;
  pieces.forEach((piece, index) => {
    const grown = extendInto(piece, leftover);
    if (grown && areaOf(grown) - areaOf(piece) > gain) {
      best = { index, piece: grown };
      gain = areaOf(grown) - areaOf(piece);
    }
  });
  return best;
}

/** At most this many passes re-pour the leftover space of a layer */
const MAX_REFILL_ROUNDS = 20;

/** What re-pouring a layer's leftover space needs */
interface Refill {
  readonly layer: PlantingArea;
  readonly fixed: readonly AreaPiece[];
  /** The plantings on this layer, in neighbour order */
  readonly group: readonly string[];
  readonly byId: ReadonlyMap<string, Planting>;
  readonly targetOf: (id: string) => number;
  readonly piecesOf: Map<string, AreaPiece[]>;
}

/**
 * Free space must not vanish: every leftover rectangle of the layer (dropped
 * by the piece cap, the 10 % rule, a too-small claim or snapping) goes to the
 * plantings with the largest deficit (target − actual). Two or more of them
 * with room for a piece share it; otherwise the first one that can take it
 * grows a piece into it along a shared edge or, below the cap, gets a new piece.
 */
function refillLeftovers({ layer, fixed, group, byId, targetOf, piecesOf }: Refill): void {
  const traitsOf = (id: string) => byId.get(id)!.traits;
  const smallestSide = Math.min(...group.map((id) => minimumSideOf(traitsOf(id))));
  const rank = new Map(group.map((id, index) => [id, index]));
  const deficitOf = (id: string) => targetOf(id) - sumOf((piecesOf.get(id) ?? []).map(areaOf));
  const add = (id: string, piece: AreaPiece) => piecesOf.set(id, [...(piecesOf.get(id) ?? []), piece]);

  for (let round = 0; round < MAX_REFILL_ROUNDS; round++) {
    const placed = group.flatMap((id) => piecesOf.get(id) ?? []);
    const leftovers = freeRectangles(layer, [...fixed, ...placed], smallestSide)
      .sort((a, b) => areaOf(b) - areaOf(a) || a.yCm - b.yCm || a.xCm - b.xCm);
    let progress = false;

    for (const leftover of leftovers) {
      const takesNewPiece = (id: string) => (piecesOf.get(id)?.length ?? 0) < MAX_PIECES
        && Math.min(leftover.widthCm, leftover.lengthCm) >= minimumSideOf(traitsOf(id)) - EPSILON_CM;
      const byDeficit = [...group].sort((a, b) => deficitOf(b) - deficitOf(a) || rank.get(a)! - rank.get(b)!);
      const withRoom = byDeficit.filter((id) => takesNewPiece(id) && deficitOf(id) > EPSILON_CM);

      if (withRoom.length >= 2) {
        const claims = [...withRoom]
          .sort((a, b) => rank.get(a)! - rank.get(b)!)
          .map((id) => ({ plantingId: id, weight: deficitOf(id) }));
        for (const [id, piece] of partitionFitting(leftover, claims, byId)) {
          add(id, piece);
          progress = true;
        }
        continue;
      }

      for (const id of byDeficit) {
        const extension = bestExtension(piecesOf.get(id) ?? [], leftover);
        if (extension) {
          piecesOf.set(id, (piecesOf.get(id) ?? []).map((piece, index) => (index === extension.index ? extension.piece : piece)));
          progress = true;
          break;
        }
        const piece = takesNewPiece(id) ? partitionFitting(leftover, [{ plantingId: id, weight: 1 }], byId).get(id) : undefined;
        if (piece) {
          add(id, piece);
          progress = true;
          break;
        }
      }
    }
    if (!progress) return;
  }
}

/**
 * Lays out the plantings of a season as areas: the free space (layers minus
 * fixed pieces) is split into rectangles, plantings are ordered so companions
 * neighbour and combative plants stay apart, each layer gets a consecutive group
 * of them, each gets a share of its layer by ratio (in 1..3 pieces), and pieces
 * snap to whole plant spacings. Leftover space is re-poured to the plantings
 * furthest below their target. A planting whose area would be smaller than its
 * minimum side gets none. The work depends on the number of plantings and fixed
 * pieces, not on the number of plants.
 */
export function layoutAreas(request: AreaLayoutRequest): AreaLayoutResult {
  const byId = new Map<string, Planting>();
  for (const planting of request.plantings) {
    if (!byId.has(planting.plantingId)) byId.set(planting.plantingId, planting);
  }
  if (byId.size === 0) return { areas: [], shares: [] };

  const smallestSide = Math.min(...[...byId.values()].map((p) => minimumSideOf(p.traits)));
  const fixedOn = (layerIndex: number) => request.fixed.filter((f) => f.layerIndex === layerIndex).map((f) => f.piece);
  const freeByLayer = request.layers.map((layer, layerIndex) => freeRectangles(layer, fixedOn(layerIndex), smallestSide)
    .sort((a, b) => areaOf(b) - areaOf(a) || a.yCm - b.yCm || a.xCm - b.xCm));
  const capacities = freeByLayer.map((rectangles) => sumOf(rectangles.map(areaOf)));
  const freeArea = sumOf(capacities);

  const ratioOf = (id: string) => Math.max(0, byId.get(id)!.ratio);
  const totalRatio = sumOf([...byId.keys()].map(ratioOf));
  const targetShareOf = (id: string) => (totalRatio > 0 ? ratioOf(id) / totalRatio : 0);

  const order = orderForNeighbours([...byId.keys()], (a, b) => request.relations(byId.get(a)!.plantId, byId.get(b)!.plantId));
  const layerOf = groupByLayer(order, ratioOf, capacities);
  const piecesOf = new Map<string, AreaPiece[]>();

  request.layers.forEach((layer, layerIndex) => {
    const group = order.filter((id) => layerOf.get(id) === layerIndex);
    if (group.length === 0) return;
    const rectangles = freeByLayer[layerIndex];
    const groupRatio = sumOf(group.map(ratioOf));
    const targetOf = (id: string) => (groupRatio > 0 ? (ratioOf(id) / groupRatio) * capacities[layerIndex] : 0);

    const poured = pour(group, targetOf, rectangles);
    const kept = group.flatMap((id) => keptChunks(poured.filter((chunk) => chunk.plantingId === id), targetOf(id)));
    rectangles.forEach((rectangle, index) => {
      const claims = kept
        .filter((chunk) => chunk.rectangle === index)
        .map((chunk) => ({ plantingId: chunk.plantingId, weight: chunk.volume }));
      if (claims.length === 0) return;
      for (const [id, piece] of partitionFitting(rectangle, claims, byId)) {
        piecesOf.set(id, [...(piecesOf.get(id) ?? []), piece]);
      }
    });

    refillLeftovers({ layer, fixed: fixedOn(layerIndex), group, byId, targetOf, piecesOf });
  });

  const areas: LaidOutArea[] = order
    .filter((id) => (piecesOf.get(id)?.length ?? 0) > 0)
    .map((id) => ({ plantingId: id, plantId: byId.get(id)!.plantId, layerIndex: layerOf.get(id)!, pieces: piecesOf.get(id)! }));

  const shares: AreaShare[] = order.map((id) => {
    const planting = byId.get(id)!;
    const area = areas.find((a) => a.plantingId === id);
    const placed = area ? sumOf(area.pieces.map(areaOf)) : 0;
    return {
      plantingId: id,
      plantId: planting.plantId,
      targetShare: targetShareOf(id),
      actualShare: freeArea > 0 ? placed / freeArea : 0,
      plantCount: area
        ? plantCountOf(area, planting.traits, request.layers[area.layerIndex])
        : (isSownOverArea(planting.traits) ? null : 0),
      fits: area !== undefined,
    };
  });

  return { areas, shares };
}
