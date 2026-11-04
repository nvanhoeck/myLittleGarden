import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { fitsInArea, plantsOutsideArea } from './PlantingArea.ts';
import { PlantFootprint } from './PlantFootprint.ts';

const rectangle = { shape: 'rectangle', widthCm: 100, lengthCm: 50 } as const;
const circle = { shape: 'circle', diameterCm: 60 } as const;
const square20 = PlantFootprint.of(20, 20);

/** A 40 x 10 patch, optionally rotated */
const patch = (rotationDeg: number): PlantFootprint =>
  PlantFootprint.forPlant({ spacingRadiusCm: 2, plantingStyle: 'patch' }, { widthCm: 40, heightCm: 10, rotationDeg });

describe('fitsInArea', () => {
  test('given a rectangle, a footprint fits when it lies inside; touching the wall is allowed', () => {
    assert.ok(fitsInArea(rectangle, square20, 10, 10));
    assert.ok(fitsInArea(rectangle, square20, 90, 40));
    assert.ok(!fitsInArea(rectangle, square20, 9, 10));
    assert.ok(!fitsInArea(rectangle, square20, 50, 41));
  });

  test('given a circle, a footprint fits when all four corners are inside the circle', () => {
    assert.ok(fitsInArea(circle, square20, 30, 30));
    // A 50 cm square has corners outside a 60 cm circle
    assert.ok(!fitsInArea(circle, PlantFootprint.of(50, 50), 30, 30));
  });

  test('given a circle, a rotated patch is checked with its real corners, not its bounding box', () => {
    // The 45 degree bounding box (35.4 cm square) does not fit at this spot, the patch itself does
    const rotated = patch(45);
    assert.ok(!fitsInArea(circle, PlantFootprint.of(rotated.widthCm, rotated.lengthCm), 38, 22));
    assert.ok(fitsInArea(circle, rotated, 38, 22));
  });
});

describe('plantsOutsideArea', () => {
  test('gives the plants whose footprint does not fit in the area', () => {
    const plants = [
      { id: 'in', positionX: 50, positionY: 25 },
      { id: 'out', positionX: 5, positionY: 25 },
    ];
    assert.deepEqual([...plantsOutsideArea(plants, () => square20, rectangle)], ['out']);
  });
});
