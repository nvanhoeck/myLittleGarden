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

/**
 * What the season canvas draws on one layer: each area with its label,
 * plant icons (only up to ICON_LIMIT plants, so a large area costs one
 * element), carried areas dimmed, and relation markers where areas touch.
 */
export function buildAreaCanvas(input: AreaCanvasInput): AreaCanvasView {
  const { layer, t } = input;
  const all = [...input.carried, ...input.own];
  const carriedIds = new Set(input.carried.map((a) => a.id));
  const edgeMarkers = edgeMarkersOf(all, input.relations);

  const areas = all.map((area): AreaView => {
    const plant = knownPlant(input.plantOf(area.plantId));
    const count = plantCountOf(area, plant, layer);
    const name = input.nameOf(area.plantId);
    const spacingCm = 2 * plant.spacingRadiusCm;
    const dimmed = carriedIds.has(area.id);
    return {
      id: area.id,
      plantingId: area.plantingId,
      plantId: area.plantId,
      category: plant.category ?? null,
      rects: area.pieces,
      label: count === null ? t('componentDetail.areaSown', { name }) : t('componentDetail.areaCount', { name, count }),
      count,
      icons: count !== null && count <= ICON_LIMIT ? area.pieces.flatMap((p) => gridPositions(p, spacingCm, layer)) : [],
      iconSizeCm: spacingCm,
      dimmed,
      carriedLabel: dimmed ? input.carriedLabelOf(area) : null,
      locked: area.locked === true,
      relationsAtEdges: relationsAt(area.id, edgeMarkers),
      resizeStepCm: stepOf(plant),
    };
  });

  return { areas, edgeMarkers };
}

/**
 * The size a resize drag ends at: whole steps of the plant spacing, at least
 * one step, inside the layer's bounding box. Null when that is the piece's
 * current size, so no change is stored (a stored change outdates later seasons).
 */
export function snappedResize(
  piece: AreaPiece,
  widthCm: number,
  lengthCm: number,
  stepCm: number,
  bounds: { readonly widthCm: number; readonly lengthCm: number },
): { widthCm: number; lengthCm: number } | null {
  const snap = (size: number, room: number): number => {
    const steps = Math.max(1, Math.round(size / stepCm));
    const maxSteps = Math.max(1, Math.floor(room / stepCm + EPSILON_CM));
    return Math.min(steps, maxSteps) * stepCm;
  };
  const snapped = {
    widthCm: snap(widthCm, bounds.widthCm - piece.xCm),
    lengthCm: snap(lengthCm, bounds.lengthCm - piece.yCm),
  };
  const unchanged = Math.abs(snapped.widthCm - piece.widthCm) < EPSILON_CM && Math.abs(snapped.lengthCm - piece.lengthCm) < EPSILON_CM;
  return unchanged ? null : snapped;
}
