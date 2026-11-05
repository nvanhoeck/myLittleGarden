import { PlantFootprint, minimumPatchSideCm } from './PlantFootprint.ts';
import type { FootprintTraits, PatchShape } from './PlantFootprint.ts';
import type { PlantingArea } from './PlantingArea.ts';
import type { PlantRelations } from './PlantRelations.ts';
import { areaLength, areaWidth, bestSpot } from './PositionSearch.ts';
import type { Occupant, Spot } from './PositionSearch.ts';

/** A plant that stays where it is: locked, or carried over from an earlier season */
export interface FixedPlacement {
  readonly plantId: string;
  readonly layerIndex: number;
  readonly footprint: PlantFootprint;
  readonly xCm: number;
  readonly yCm: number;
}

/** A plant starting in the season, with its share of the free area relative to the others */
export interface RatioPlant {
  readonly plantId: string;
  readonly ratio: number;
  readonly traits: FootprintTraits;
}

export interface SeasonPlacementRequest {
  /** One area per layer; index = layerIndex */
  readonly layers: readonly PlantingArea[];
  readonly fixed: readonly FixedPlacement[];
  readonly plants: readonly RatioPlant[];
  readonly relations: PlantRelations;
}

export interface NewPlacement {
  readonly plantId: string;
  readonly layerIndex: number;
  /** Centre of the footprint, from the top-left of the layer */
  readonly xCm: number;
  readonly yCm: number;
  /** Patch and thinning plants only */
  readonly patch?: PatchShape;
}

/** How much of the free area a plant got, against what its ratio asked for (both 0..1) */
export interface PlantShare {
  readonly plantId: string;
  readonly count: number;
  readonly actualShare: number;
  readonly targetShare: number;
}

export interface SeasonPlacementResult {
  readonly placements: readonly NewPlacement[];
  readonly shares: readonly PlantShare[];
}

/** Fixed plants count once in a neighbour's score; plants placed in this run gain and give, so twice */
const FIXED_WEIGHT = 1;
const PLACED_WEIGHT = 2;
const PATCH_SHRINK = 0.9;
const EPSILON = 1e-9;

/**
 * Fills the layers by ratio. The free area (layers minus fixed plants) is
 * shared by ratio; patch plants first get one patch close to their share,
 * then individual plants are placed one at a time, always the plant
 * furthest behind its share, until none fits anymore. Leftover space thus
 * goes to the plants that can still use it. Pure and deterministic.
 */
export function fillByRatio(request: SeasonPlacementRequest): SeasonPlacementResult {
  const plants = [...request.plants].sort((a, b) => compareText(a.plantId, b.plantId));
  // A fixed plant on a layer that does not exist takes no space at all
  const fixedOnLayers = request.fixed.filter((f) => f.layerIndex >= 0 && f.layerIndex < request.layers.length);
  const occupants: Occupant[][] = request.layers.map(() => []);
  for (const fixed of fixedOnLayers) {
    occupants[fixed.layerIndex].push({
      plantId: fixed.plantId,
      bounds: fixed.footprint.boundsAt(fixed.xCm, fixed.yCm),
      weight: FIXED_WEIGHT,
    });
  }

  const freeArea = Math.max(0, sum(request.layers.map(areaOf)) - sum(fixedOnLayers.map((f) => f.footprint.areaCm2)));
  const totalRatio = sum(plants.map((p) => p.ratio));
  const targetOf = new Map(plants.map((p) => [p.plantId, totalRatio > 0 ? (p.ratio / totalRatio) * freeArea : 0]));
  const placedAreaOf = new Map(plants.map((p) => [p.plantId, 0]));
  const countOf = new Map(plants.map((p) => [p.plantId, 0]));
  const placements: NewPlacement[] = [];

  const place = (plant: RatioPlant, footprint: PlantFootprint, patch?: PatchShape): boolean => {
    const spot = bestSpotOverLayers(plant.plantId, footprint, request.layers, occupants, request.relations);
    if (spot === null) {
      return false;
    }
    placements.push({ plantId: plant.plantId, layerIndex: spot.layerIndex, xCm: spot.xCm, yCm: spot.yCm, ...(patch ? { patch } : {}) });
    occupants[spot.layerIndex].push({ plantId: plant.plantId, bounds: footprint.boundsAt(spot.xCm, spot.yCm), weight: PLACED_WEIGHT });
    placedAreaOf.set(plant.plantId, (placedAreaOf.get(plant.plantId) ?? 0) + footprint.areaCm2);
    countOf.set(plant.plantId, (countOf.get(plant.plantId) ?? 0) + 1);
    return true;
  };

  if (freeArea > 0) {
    const target = (plant: RatioPlant): number => targetOf.get(plant.plantId) ?? 0;
    const patches = plants
      .filter((p) => isSownOverArea(p.traits))
      .sort((a, b) => target(b) - target(a) || compareText(a.plantId, b.plantId));
    for (const plant of patches) {
      placePatch(plant, target(plant), request.layers, place);
    }

    const footprintOf = new Map(plants.map((p) => [p.plantId, PlantFootprint.forPlant(p.traits)]));
    const active = plants.filter((p) => !isSownOverArea(p.traits));
    while (active.length > 0) {
      const plant = furthestBehind(active, placedAreaOf, targetOf, footprintOf);
      const footprint = footprintOf.get(plant.plantId);
      if (footprint === undefined || !place(plant, footprint)) {
        active.splice(active.indexOf(plant), 1);
      }
    }
  }

  return {
    placements,
    shares: plants.map((p) => ({
      plantId: p.plantId,
      count: countOf.get(p.plantId) ?? 0,
      actualShare: freeArea > 0 ? (placedAreaOf.get(p.plantId) ?? 0) / freeArea : 0,
      targetShare: totalRatio > 0 ? p.ratio / totalRatio : 0,
    })),
  };
}

/**
 * One patch with an area close to the target: square-ish within the widest
 * layer, shrunk step by step until it fits, never below the minimum side.
 */
function placePatch(
  plant: RatioPlant,
  targetArea: number,
  layers: readonly PlantingArea[],
  place: (plant: RatioPlant, footprint: PlantFootprint, patch: PatchShape) => boolean,
): void {
  const minimum = minimumPatchSideCm(plant.traits);
  const width = Math.min(Math.max(...layers.map(areaWidth)), Math.max(minimum, Math.sqrt(targetArea)));
  const length = Math.min(Math.max(...layers.map(areaLength)), Math.max(minimum, targetArea / width));

  for (let factor = 1; ; factor *= PATCH_SHRINK) {
    const patch: PatchShape = {
      widthCm: Math.max(minimum, Math.floor(width * factor)),
      heightCm: Math.max(minimum, Math.floor(length * factor)),
      rotationDeg: 0,
    };
    if (place(plant, PlantFootprint.forPlant(plant.traits, patch), patch)) {
      return;
    }
    if (patch.widthCm === minimum && patch.heightCm === minimum) {
      return;
    }
  }
}

/** Lowest placed area / target first; ties go to the larger footprint, then the plantId */
function furthestBehind(
  active: readonly RatioPlant[],
  placedAreaOf: ReadonlyMap<string, number>,
  targetOf: ReadonlyMap<string, number>,
  footprintOf: ReadonlyMap<string, PlantFootprint>,
): RatioPlant {
  const progress = (p: RatioPlant): number => (placedAreaOf.get(p.plantId) ?? 0) / Math.max(EPSILON, targetOf.get(p.plantId) ?? 0);
  const size = (p: RatioPlant): number => footprintOf.get(p.plantId)?.areaCm2 ?? 0;
  let best = active[0];
  for (const plant of active.slice(1)) {
    const difference = progress(plant) - progress(best);
    if (difference < -EPSILON || (Math.abs(difference) <= EPSILON && size(plant) > size(best))) {
      best = plant;
    }
  }
  return best;
}

/** The best spot over all layers; ties go to the lowest layer */
function bestSpotOverLayers(
  plantId: string,
  footprint: PlantFootprint,
  layers: readonly PlantingArea[],
  occupants: readonly (readonly Occupant[])[],
  relations: PlantRelations,
): (Spot & { readonly layerIndex: number }) | null {
  let best: (Spot & { readonly layerIndex: number }) | null = null;
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const spot = bestSpot(plantId, footprint, layers[layerIndex], occupants[layerIndex], relations);
    if (spot !== null && (best === null || spot.score > best.score + EPSILON)) {
      best = { ...spot, layerIndex };
    }
  }
  return best;
}

function isSownOverArea(traits: FootprintTraits): boolean {
  return traits.plantingStyle === 'patch' || traits.plantingStyle === 'thinning';
}

function areaOf(area: PlantingArea): number {
  return area.shape === 'circle' ? Math.PI * (area.diameterCm / 2) ** 2 : area.widthCm * area.lengthCm;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Locale-independent comparison, so the order is the same on every device */
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
