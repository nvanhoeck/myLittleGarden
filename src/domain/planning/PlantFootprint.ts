import type { PlantData } from '../../types/plant.types.ts';
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

/** Rounds away floating point noise such as cos(90deg) = 6e-17 */
function roundCm(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * PlantFootprint is a value object for the space a plant claims: an
 * axis-aligned rectangle (width x length in cm) centred on the plant position.
 */
export class PlantFootprint {
  readonly widthCm: number;
  readonly lengthCm: number;

  private constructor(widthCm: number, lengthCm: number) {
    this.widthCm = widthCm;
    this.lengthCm = lengthCm;
  }

  /**
   * @throws Error when a side is not a positive number
   */
  static of(widthCm: number, lengthCm: number): PlantFootprint {
    if (!(widthCm > 0) || !(lengthCm > 0)) {
      throw new Error(`Ongeldige voetafdruk ${widthCm} x ${lengthCm} cm`);
    }
    return new PlantFootprint(widthCm, lengthCm);
  }

  /**
   * Individual and thinning plants claim a square of twice their spacing radius.
   * Patches claim their patch size; a rotated patch claims the bounding box
   * of the rotated rectangle. A patch without a shape falls back to the square.
   */
  static forPlant(plant: Pick<PlantData, 'spacingRadiusCm' | 'plantingStyle'>, patch?: PatchShape): PlantFootprint {
    if (plant.plantingStyle !== 'patch' || patch === undefined) {
      const side = 2 * plant.spacingRadiusCm;
      return PlantFootprint.of(side, side);
    }

    const radians = (patch.rotationDeg * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    return PlantFootprint.of(
      roundCm(patch.widthCm * cos + patch.heightCm * sin),
      roundCm(patch.widthCm * sin + patch.heightCm * cos),
    );
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
