import type { PlacedPlantData, PlantData } from '../../types/plant.types.ts';
import { GrowingPeriod } from './GrowingPeriod.ts';
import type { GrowingPeriodData } from './GrowingPeriod.ts';

/** Axis-aligned rectangle in cm, measured from the top-left of the area */
export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Size and rotation of a broadcast-sown patch */
export interface PatchShape {
  readonly widthCm: number;
  readonly heightCm: number;
  readonly rotationDeg: number;
}

/** A footprint at a position during a period */
export interface PositionedFootprint {
  readonly footprint: PlantFootprint;
  readonly xCm: number;
  readonly yCm: number;
  readonly period: GrowingPeriodData;
}

/** The catalog fields that decide a plant's footprint */
export type FootprintTraits = Pick<PlantData, 'spacingRadiusCm' | 'plantingStyle'> & Partial<Pick<PlantData, 'sowingSpacingCm'>>;

/** Patch size fields, shared by placed plants and plants to plan */
export type PatchFields = Pick<PlacedPlantData, 'patchWidthInCm' | 'patchHeightInCm' | 'patchRotationDeg'>;

/** Spacing the canvas assumes for plants missing from the catalog */
const DEFAULT_SPACING_RADIUS_CM = 15;

/** Rounds away floating point noise such as cos(90deg) = 6e-17 */
function roundCm(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Patch and thinning plants are sown over an area that the user can resize */
function isSownOverArea(plant: Pick<PlantData, 'plantingStyle'>): boolean {
  return plant.plantingStyle === 'patch' || plant.plantingStyle === 'thinning';
}

/** The smallest side a patch can have: twice the sowing spacing, else twice the spacing radius */
export function minimumPatchSideCm(plant: Pick<PlantData, 'spacingRadiusCm'> & Partial<Pick<PlantData, 'sowingSpacingCm'>>): number {
  return 2 * (plant.sowingSpacingCm ?? plant.spacingRadiusCm);
}

/**
 * PlantFootprint is a value object for the space a plant claims: an
 * axis-aligned rectangle (width x length in cm) centred on the plant position.
 * It keeps the outline the canvas draws, which differs from the rectangle for a rotated patch.
 */
export class PlantFootprint {
  readonly widthCm: number;
  readonly lengthCm: number;
  /** The drawn rectangle before rotation, centred on the plant position */
  readonly outline: PatchShape;

  private constructor(widthCm: number, lengthCm: number, outline: PatchShape) {
    this.widthCm = widthCm;
    this.lengthCm = lengthCm;
    this.outline = outline;
  }

  /**
   * @throws Error when a side is not a positive number
   */
  static of(widthCm: number, lengthCm: number): PlantFootprint {
    if (!(widthCm > 0) || !(lengthCm > 0)) {
      throw new Error(`Ongeldige voetafdruk ${widthCm} x ${lengthCm} cm`);
    }
    return new PlantFootprint(widthCm, lengthCm, { widthCm, heightCm: lengthCm, rotationDeg: 0 });
  }

  /**
   * Individual plants claim a square of twice their spacing radius.
   * Patch and thinning plants claim their patch, each side at least the
   * minimum patch side (a missing size is that minimum); a rotated patch
   * claims the bounding box of the rotated rectangle.
   */
  static forPlant(plant: FootprintTraits, patch: Partial<PatchShape> = {}): PlantFootprint {
    if (!isSownOverArea(plant)) {
      return PlantFootprint.of(2 * plant.spacingRadiusCm, 2 * plant.spacingRadiusCm);
    }

    const minimum = minimumPatchSideCm(plant);
    const outline: PatchShape = {
      widthCm: Math.max(minimum, patch.widthCm ?? minimum),
      heightCm: Math.max(minimum, patch.heightCm ?? minimum),
      rotationDeg: patch.rotationDeg ?? 0,
    };
    const radians = (outline.rotationDeg * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    const box = PlantFootprint.of(
      roundCm(outline.widthCm * cos + outline.heightCm * sin),
      roundCm(outline.widthCm * sin + outline.heightCm * cos),
    );
    return new PlantFootprint(box.widthCm, box.lengthCm, outline);
  }

  get areaCm2(): number {
    return this.widthCm * this.lengthCm;
  }

  boundsAt(xCm: number, yCm: number): Bounds {
    return {
      left: xCm - this.widthCm / 2,
      top: yCm - this.lengthCm / 2,
      right: xCm + this.widthCm / 2,
      bottom: yCm + this.lengthCm / 2,
    };
  }

  /** The four corners of the outline, rotated clockwise (y points down) around the position */
  cornersAt(xCm: number, yCm: number): [number, number][] {
    const radians = (this.outline.rotationDeg * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const halfWidth = this.outline.widthCm / 2;
    const halfHeight = this.outline.heightCm / 2;
    return [[halfWidth, halfHeight], [halfWidth, -halfHeight], [-halfWidth, halfHeight], [-halfWidth, -halfHeight]].map(
      ([dx, dy]): [number, number] => [xCm + dx * cos - dy * sin, yCm + dx * sin + dy * cos],
    );
  }
}

/**
 * The footprint of a placed plant or plant to plan, from the catalog and its
 * stored patch fields. This is the one rule the canvas draws and auto-placement
 * uses. Plants missing from the catalog get the canvas default spacing.
 */
export function footprintOf(plant: FootprintTraits | undefined, patchFields: PatchFields): PlantFootprint {
  const known = plant !== undefined && plant.spacingRadiusCm > 0
    ? plant
    : { spacingRadiusCm: DEFAULT_SPACING_RADIUS_CM, plantingStyle: 'individual' as const };
  return PlantFootprint.forPlant(known, {
    widthCm: patchFields.patchWidthInCm,
    heightCm: patchFields.patchHeightInCm,
    rotationDeg: patchFields.patchRotationDeg,
  });
}

/** True when the rectangles share a positive area; touching edges do not count */
export function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Two plants conflict when their footprints overlap in space during a shared week */
export function footprintsConflict(a: PositionedFootprint, b: PositionedFootprint): boolean {
  return (
    GrowingPeriod.sharedWeeks(a.period, b.period) > 0 &&
    boundsOverlap(a.footprint.boundsAt(a.xCm, a.yCm), b.footprint.boundsAt(b.xCm, b.yCm))
  );
}

/** What conflict detection needs of a placed plant */
type PlantInPlace = Pick<PlacedPlantData, 'id' | 'positionX' | 'positionY' | 'growingPeriod'>;

/** The ids of the plants whose footprint conflicts with another plant's */
export function conflictingPlantIds<P extends PlantInPlace>(
  plants: readonly P[],
  footprintOfPlant: (plant: P) => PlantFootprint,
): Set<string> {
  const positioned = plants.map((plant) => ({
    id: plant.id,
    footprint: footprintOfPlant(plant),
    xCm: plant.positionX,
    yCm: plant.positionY,
    period: plant.growingPeriod,
  }));

  const ids = new Set<string>();
  positioned.forEach((a, index) => {
    for (const b of positioned.slice(index + 1)) {
      if (footprintsConflict(a, b)) {
        ids.add(a.id);
        ids.add(b.id);
      }
    }
  });
  return ids;
}
