import { gridPositions, plantCountOf } from '../../domain/planning/AreaGrid.ts';
import { minimumPatchSideCm } from '../../domain/planning/PlantFootprint.ts';
import type { FootprintTraits } from '../../domain/planning/PlantFootprint.ts';
import type { PlantingArea } from '../../domain/planning/PlantingArea.ts';
import type { PlantRelations } from '../../domain/planning/PlantRelations.ts';
import type { AreaData, AreaPiece } from '../../types/planning.types.ts';
import type { AreaCanvasView, AreaRelationView, AreaView, EdgeMarkerView } from '../../types/planningViews.types.ts';
import type { Translate } from '../shared/seasonLabels.ts';

/** Above this many plants an area shows its count instead of one icon per plant */
export const ICON_LIMIT = 50;
/** At most this many plant icons on the whole canvas */
export const ICON_TOTAL_LIMIT = 300;
/** Icons smaller than this (px) are not drawn */
const ICON_MIN_PX = 6;
const ICON_MAX_PX = 22;
/** An icon fills this part of a plant's square */
const ICON_FILL = 0.8;
/** Pieces whose edges are at most this far apart touch */
const TOUCH_TOLERANCE_CM = 5;
/** Tolerance for rounding of lengths (cm) */
const EPSILON_CM = 1e-6;
/** Spacing the canvas assumes for plants missing from the catalog */
const UNKNOWN_PLANT: AreaCanvasPlant = { spacingRadiusCm: 15, plantingStyle: 'individual' };

/** What the canvas needs to know of a plant */
export type AreaCanvasPlant = FootprintTraits & { readonly category?: string };

export interface AreaCanvasInput {
  /** Areas of the plantings starting in the season, on the shown layer */
  readonly own: readonly AreaData[];
  /** Areas carried into the season, on the shown layer */
  readonly carried: readonly AreaData[];
  readonly layer: PlantingArea;
  readonly plantOf: (plantId: string) => AreaCanvasPlant | undefined;
  readonly nameOf: (plantId: string) => string;
  readonly relations: PlantRelations;
  readonly carriedLabelOf: (area: AreaData) => string;
  readonly t: Translate;
}

function isSown(plant: AreaCanvasPlant): boolean {
  return plant.plantingStyle === 'patch' || plant.plantingStyle === 'thinning';
}

/** Plant spacing (individual) or the smallest patch side (sown) */
function stepOf(plant: AreaCanvasPlant): number {
  return isSown(plant) ? minimumPatchSideCm(plant) : 2 * plant.spacingRadiusCm;
}

function knownPlant(plant: AreaCanvasPlant | undefined): AreaCanvasPlant {
  return plant !== undefined && plant.spacingRadiusCm > 0 ? plant : UNKNOWN_PLANT;
}

/** The midpoint of the edge two pieces share (gap at most the tolerance, overlap longer than a point), or null */
function sharedEdgeMidpoint(a: AreaPiece, b: AreaPiece): { xCm: number; yCm: number } | null {
  const overlap = (from1: number, to1: number, from2: number, to2: number): [number, number] | null => {
    const from = Math.max(from1, from2);
    const to = Math.min(to1, to2);
    return to - from > EPSILON_CM ? [from, to] : null;
  };
  const near = (p: number, q: number): boolean => Math.abs(p - q) <= TOUCH_TOLERANCE_CM + EPSILON_CM;

  const ys = overlap(a.yCm, a.yCm + a.lengthCm, b.yCm, b.yCm + b.lengthCm);
  if (ys !== null) {
    const middle = (ys[0] + ys[1]) / 2;
    if (near(a.xCm + a.widthCm, b.xCm)) return { xCm: (a.xCm + a.widthCm + b.xCm) / 2, yCm: middle };
    if (near(b.xCm + b.widthCm, a.xCm)) return { xCm: (b.xCm + b.widthCm + a.xCm) / 2, yCm: middle };
  }
  const xs = overlap(a.xCm, a.xCm + a.widthCm, b.xCm, b.xCm + b.widthCm);
  if (xs !== null) {
    const middle = (xs[0] + xs[1]) / 2;
    if (near(a.yCm + a.lengthCm, b.yCm)) return { xCm: middle, yCm: (a.yCm + a.lengthCm + b.yCm) / 2 };
    if (near(b.yCm + b.lengthCm, a.yCm)) return { xCm: middle, yCm: (b.yCm + b.lengthCm + a.yCm) / 2 };
  }
  return null;
}

function touchPoint(a: AreaData, b: AreaData): { xCm: number; yCm: number } | null {
  for (const pa of a.pieces) {
    for (const pb of b.pieces) {
      const point = sharedEdgeMidpoint(pa, pb);
      if (point !== null) return point;
    }
  }
  return null;
}

/** One marker per pair of touching areas with a companion or combative relation */
function edgeMarkersOf(areas: readonly AreaData[], relations: PlantRelations): EdgeMarkerView[] {
  const markers: EdgeMarkerView[] = [];
  for (let i = 0; i < areas.length; i++) {
    for (let j = i + 1; j < areas.length; j++) {
      const kind = relations(areas[i].plantId, areas[j].plantId);
      if (kind === 'neutral') continue;
      const point = touchPoint(areas[i], areas[j]);
      if (point !== null) markers.push({ key: `${areas[i].id}|${areas[j].id}`, kind, ...point });
    }
  }
  return markers;
}

function relationsAt(areaId: string, markers: readonly EdgeMarkerView[]): AreaRelationView[] {
  return markers.flatMap((marker) => {
    const [first, second] = marker.key.split('|');
    if (first === areaId) return [{ otherAreaId: second, kind: marker.kind }];
    if (second === areaId) return [{ otherAreaId: first, kind: marker.kind }];
    return [];
  });
}

/** True when the pieces share a positive area; touching edges do not count */
function piecesOverlap(a: AreaPiece, b: AreaPiece): boolean {
  return a.xCm < b.xCm + b.widthCm - EPSILON_CM && b.xCm < a.xCm + a.widthCm - EPSILON_CM
    && a.yCm < b.yCm + b.lengthCm - EPSILON_CM && b.yCm < a.yCm + a.lengthCm - EPSILON_CM;
}

/** The indexes of the areas with a piece overlapping a piece of another area */
function overlappingAreas(areas: readonly AreaData[]): Set<number> {
  const flagged = new Set<number>();
  for (let i = 0; i < areas.length; i++) {
    for (let j = i + 1; j < areas.length; j++) {
      if (areas[i].pieces.some((p) => areas[j].pieces.some((q) => piecesOverlap(p, q)))) {
        flagged.add(i);
        flagged.add(j);
      }
    }
  }
  return flagged;
}

/** True when a piece leaves the layer's bounding box (pieces of a round layer lie in its bounding square) */
function isOutside(pieces: readonly AreaPiece[], layer: PlantingArea): boolean {
  const widthCm = layer.shape === 'rectangle' ? layer.widthCm : layer.diameterCm;
  const lengthCm = layer.shape === 'rectangle' ? layer.lengthCm : layer.diameterCm;
  return pieces.some((p) => p.xCm < -EPSILON_CM || p.yCm < -EPSILON_CM
    || p.xCm + p.widthCm > widthCm + EPSILON_CM || p.yCm + p.lengthCm > lengthCm + EPSILON_CM);
}

/**
 * What the season canvas draws on one layer: each area with its label,
 * plant icons (only up to ICON_LIMIT plants per area and ICON_TOTAL_LIMIT on
 * the canvas, so a large area costs one element), carried areas dimmed,
 * relation markers where areas touch, and a warning on areas that overlap
 * another (carried ones included) or leave the layer.
 */
export function buildAreaCanvas(input: AreaCanvasInput): AreaCanvasView {
  const { layer, t } = input;
  const all = [...input.carried, ...input.own];
  const carriedIds = new Set(input.carried.map((a) => a.id));
  const edgeMarkers = edgeMarkersOf(all, input.relations);

  const plants = all.map((area) => knownPlant(input.plantOf(area.plantId)));
  const counts = all.map((area, i) => plantCountOf(area, plants[i], layer));
  const drawn = areasWithIcons(counts);
  const overlapping = overlappingAreas(all);

  const areas = all.map((area, i): AreaView => {
    const plant = plants[i];
    const count = counts[i];
    const name = input.nameOf(area.plantId);
    const spacingCm = 2 * plant.spacingRadiusCm;
    const dimmed = carriedIds.has(area.id);
    const overlaps = overlapping.has(i);
    const outsideLayer = isOutside(area.pieces, layer);
    const warnings = [
      ...(overlaps ? [t('componentDetail.areaWarningOverlap')] : []),
      ...(outsideLayer ? [t('componentDetail.areaWarningOutside')] : []),
    ];
    return {
      id: area.id,
      plantingId: area.plantingId,
      plantId: area.plantId,
      category: plant.category ?? null,
      rects: area.pieces,
      label: count === null ? t('componentDetail.areaSown', { name }) : t('componentDetail.areaCount', { name, count }),
      count,
      icons: drawn.has(i) ? area.pieces.flatMap((p) => gridPositions(p, spacingCm, layer)) : [],
      iconSizeCm: spacingCm,
      dimmed,
      carriedLabel: dimmed ? input.carriedLabelOf(area) : null,
      locked: area.locked === true,
      relationsAtEdges: relationsAt(area.id, edgeMarkers),
      resizeStepCm: stepOf(plant),
      overlaps,
      outsideLayer,
      warningLabel: warnings.length > 0 ? warnings.join(' · ') : null,
    };
  });

  return { areas, edgeMarkers };
}

/**
 * The indexes of the areas that get one icon per plant: at most ICON_LIMIT
 * plants each and ICON_TOTAL_LIMIT together; the areas with the most plants
 * lose their icons first.
 */
function areasWithIcons(counts: readonly (number | null)[]): Set<number> {
  const candidates = counts
    .map((count, index) => ({ count, index }))
    .filter((c): c is { count: number; index: number } => c.count !== null && c.count > 0 && c.count <= ICON_LIMIT)
    .sort((a, b) => a.count - b.count || a.index - b.index);
  const drawn = new Set<number>();
  let total = 0;
  for (const { count, index } of candidates) {
    if (total + count > ICON_TOTAL_LIMIT) break;
    total += count;
    drawn.add(index);
  }
  return drawn;
}

/** The size (px) a plant icon is drawn at, or null when it would be at the floor (too small to draw) */
export function iconPxFor(iconSizeCm: number, pxPerCm: number): number | null {
  const px = iconSizeCm * pxPerCm * ICON_FILL;
  return px <= ICON_MIN_PX ? null : Math.min(ICON_MAX_PX, px);
}

/**
 * The size a resize drag ends at: the current size plus whole steps of the
 * plant spacing (the drag rounded to steps), never below one step and inside
 * the layer's bounding box. Null when nothing changes, so no change is stored
 * (a stored change outdates later seasons).
 */
export function snappedResize(
  piece: AreaPiece,
  deltaWidthCm: number,
  deltaLengthCm: number,
  stepCm: number,
  bounds: { readonly widthCm: number; readonly lengthCm: number },
): { widthCm: number; lengthCm: number } | null {
  const snap = (current: number, delta: number, room: number): number => {
    let steps = Math.round(delta / stepCm);
    // Not past the layer's edge
    if (steps > 0) steps = Math.min(steps, Math.max(0, Math.floor((room - current) / stepCm + EPSILON_CM)));
    // Not below one step (a piece already smaller keeps its size)
    if (steps < 0) steps = Math.max(steps, -Math.max(0, Math.floor((current - stepCm) / stepCm + EPSILON_CM)));
    return current + steps * stepCm;
  };
  const snapped = {
    widthCm: snap(piece.widthCm, deltaWidthCm, bounds.widthCm - piece.xCm),
    lengthCm: snap(piece.lengthCm, deltaLengthCm, bounds.lengthCm - piece.yCm),
  };
  const unchanged = Math.abs(snapped.widthCm - piece.widthCm) < EPSILON_CM && Math.abs(snapped.lengthCm - piece.lengthCm) < EPSILON_CM;
  return unchanged ? null : snapped;
}

/**
 * Where the resize handle sits (cm in the layer box): the piece's
 * bottom-right corner; in a circular layer, when that corner is outside the
 * circle (less than marginCm inside), the first point on the way to the
 * piece's centre that is inside, else the piece corner nearest the circle's centre.
 */
export function resizeHandlePoint(piece: AreaPiece, layer: PlantingArea, marginCm: number): { xCm: number; yCm: number } {
  const corner = { xCm: piece.xCm + piece.widthCm, yCm: piece.yCm + piece.lengthCm };
  if (layer.shape === 'rectangle') return corner;
  const radius = layer.diameterCm / 2;
  const inside = (p: { xCm: number; yCm: number }): boolean => Math.hypot(p.xCm - radius, p.yCm - radius) <= radius - marginCm + EPSILON_CM;
  const centre = { xCm: piece.xCm + piece.widthCm / 2, yCm: piece.yCm + piece.lengthCm / 2 };
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const point = { xCm: corner.xCm + (centre.xCm - corner.xCm) * f, yCm: corner.yCm + (centre.yCm - corner.yCm) * f };
    if (inside(point)) return point;
  }
  const corners = [
    { xCm: piece.xCm, yCm: piece.yCm },
    { xCm: piece.xCm + piece.widthCm, yCm: piece.yCm },
    { xCm: piece.xCm, yCm: piece.yCm + piece.lengthCm },
    corner,
  ];
  const distance = (p: { xCm: number; yCm: number }): number => Math.hypot(p.xCm - radius, p.yCm - radius);
  return corners.reduce((best, p) => (distance(p) < distance(best) ? p : best));
}
