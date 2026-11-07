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

/** A free rectangle with the layer it lies on */
interface FreeRectangle {
  readonly layerIndex: number;
  readonly piece: AreaPiece;
}

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
 * Pours each planting's target, in order, into the free rectangles, largest
 * (lowest layer) first: a planting that overflows the current rectangle
 * continues in the next one.
 */
function pour(order: readonly string[], targetOf: (id: string) => number, rectangles: readonly FreeRectangle[]): Chunk[] {
  const chunks: Chunk[] = [];
  let current = 0;
  let room = rectangles.length > 0 ? areaOf(rectangles[0].piece) : 0;
  for (const plantingId of order) {
    let need = targetOf(plantingId);
    while (need > EPSILON_CM && current < rectangles.length) {
      const volume = Math.min(need, room);
      if (volume > EPSILON_CM) chunks.push({ plantingId, rectangle: current, volume });
      need -= volume;
      room -= volume;
      if (room <= EPSILON_CM) {
        current++;
        room = current < rectangles.length ? areaOf(rectangles[current].piece) : 0;
      }
    }
  }
  return chunks;
}

/**
 * The chunks a planting keeps: all on one layer (the one holding most of
 * it), at most 3, and none below 10 % of its target unless it is the only one.
 */
function keptChunks(chunks: readonly Chunk[], target: number, rectangles: readonly FreeRectangle[]): Chunk[] {
  if (chunks.length === 0) return [];
  const perLayer = new Map<number, number>();
  for (const chunk of chunks) {
    const layer = rectangles[chunk.rectangle].layerIndex;
    perLayer.set(layer, (perLayer.get(layer) ?? 0) + chunk.volume);
  }
  const [layer] = [...perLayer.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  const largestFirst = chunks
    .filter((chunk) => rectangles[chunk.rectangle].layerIndex === layer)
    .sort((a, b) => b.volume - a.volume || a.rectangle - b.rectangle)
    .slice(0, MAX_PIECES);
  return largestFirst
    .filter((chunk, index) => index === 0 || chunk.volume >= SHARE_TOLERANCE * target)
    .sort((a, b) => a.rectangle - b.rectangle);
}

/**
 * Lays out the plantings of a season as areas: the free space (layers minus
 * fixed pieces) is split into rectangles, plantings are ordered so companions
 * neighbour and combative plants stay apart, each gets a share of the free area
 * by ratio (in 1..3 pieces on one layer), and pieces snap to whole plant
 * spacings. A planting whose area would be smaller than its minimum side gets none.
 * The work depends on the number of plantings and fixed pieces, not on the number of plants.
 */
export function layoutAreas(request: AreaLayoutRequest): AreaLayoutResult {
  const byId = new Map<string, Planting>();
  for (const planting of request.plantings) {
    if (!byId.has(planting.plantingId)) byId.set(planting.plantingId, planting);
  }
  if (byId.size === 0) return { areas: [], shares: [] };

  const smallestSide = Math.min(...[...byId.values()].map((p) => minimumSideOf(p.traits)));
  const rectangles: FreeRectangle[] = request.layers
    .flatMap((layer, layerIndex) => freeRectangles(
      layer,
      request.fixed.filter((f) => f.layerIndex === layerIndex).map((f) => f.piece),
      smallestSide,
    ).map((piece) => ({ layerIndex, piece })))
    .sort((a, b) => a.layerIndex - b.layerIndex || areaOf(b.piece) - areaOf(a.piece) || a.piece.yCm - b.piece.yCm || a.piece.xCm - b.piece.xCm);
  const freeArea = sumOf(rectangles.map((r) => areaOf(r.piece)));

  const ratioOf = (id: string) => Math.max(0, byId.get(id)!.ratio);
  const totalRatio = sumOf([...byId.keys()].map(ratioOf));
  const targetShareOf = (id: string) => (totalRatio > 0 ? ratioOf(id) / totalRatio : 0);

  const order = orderForNeighbours([...byId.keys()], (a, b) => request.relations(byId.get(a)!.plantId, byId.get(b)!.plantId));
  const poured = pour(order, (id) => targetShareOf(id) * freeArea, rectangles);
  const kept = order.flatMap((id) => keptChunks(
    poured.filter((chunk) => chunk.plantingId === id),
    targetShareOf(id) * freeArea,
    rectangles,
  ));

  const piecesOf = new Map<string, AreaPiece[]>();
  rectangles.forEach((rectangle, index) => {
    const claims = order.flatMap((id) => kept
      .filter((chunk) => chunk.plantingId === id && chunk.rectangle === index)
      .map((chunk) => ({ plantingId: id, weight: chunk.volume })));
    if (claims.length === 0) return;
    for (const [id, piece] of partitionFitting(rectangle.piece, claims, byId)) {
      piecesOf.set(id, [...(piecesOf.get(id) ?? []), piece]);
    }
  });

  const layerOf = (id: string) => rectangles[kept.find((chunk) => chunk.plantingId === id)!.rectangle].layerIndex;
  const areas: LaidOutArea[] = order
    .filter((id) => piecesOf.has(id))
    .map((id) => ({ plantingId: id, plantId: byId.get(id)!.plantId, layerIndex: layerOf(id), pieces: piecesOf.get(id)! }));

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
