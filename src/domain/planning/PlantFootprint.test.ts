import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PlantFootprint, footprintsConflict } from './PlantFootprint.ts';
import { GrowingPeriod } from './GrowingPeriod.ts';

const period = (startWeek: number, endWeek: number): GrowingPeriod =>
  GrowingPeriod.create({ year: 2026, startWeek, endWeek, method: 'transplant' });

const square30 = PlantFootprint.of(30, 30);

describe('PlantFootprint', () => {
  test('given an individual plant, the footprint is a square of twice its spacing radius', () => {
    const footprint = PlantFootprint.forPlant({ spacingRadiusCm: 15, plantingStyle: 'individual' });
    assert.deepEqual([footprint.widthCm, footprint.lengthCm], [30, 30]);
    assert.equal(footprint.areaCm2, 900);
  });

  test('given a thinning plant, the footprint is a square of twice its spacing radius', () => {
    const footprint = PlantFootprint.forPlant({ spacingRadiusCm: 5, plantingStyle: 'thinning' });
    assert.deepEqual([footprint.widthCm, footprint.lengthCm], [10, 10]);
  });

  test('given a patch plant, the footprint is the patch size', () => {
    const footprint = PlantFootprint.forPlant(
      { spacingRadiusCm: 5, plantingStyle: 'patch' },
      { widthCm: 60, heightCm: 20, rotationDeg: 0 },
    );
    assert.deepEqual([footprint.widthCm, footprint.lengthCm], [60, 20]);
  });

  test('given a patch rotated 90 degrees, width and length swap', () => {
    const footprint = PlantFootprint.forPlant(
      { spacingRadiusCm: 5, plantingStyle: 'patch' },
      { widthCm: 60, heightCm: 20, rotationDeg: 90 },
    );
    assert.deepEqual([footprint.widthCm, footprint.lengthCm], [20, 60]);
  });

  test('given a patch rotated 45 degrees, the footprint is the bounding box of the rotated rectangle', () => {
    const footprint = PlantFootprint.forPlant(
      { spacingRadiusCm: 5, plantingStyle: 'patch' },
      { widthCm: 40, heightCm: 20, rotationDeg: 45 },
    );
    const expected = Math.round(60 * Math.SQRT1_2 * 1000) / 1000; // (40 + 20) * cos 45
    assert.equal(footprint.widthCm, expected);
    assert.equal(footprint.lengthCm, expected);
  });

  test('given a patch plant without a patch size, falls back to the spacing square', () => {
    const footprint = PlantFootprint.forPlant({ spacingRadiusCm: 10, plantingStyle: 'patch' });
    assert.deepEqual([footprint.widthCm, footprint.lengthCm], [20, 20]);
  });

  test('given a position, the footprint is centred on it', () => {
    assert.deepEqual(square30.boundsAt(50, 20), { left: 35, top: 5, right: 65, bottom: 35 });
  });

  test('given two footprints that overlap in space and time, they conflict', () => {
    assert.ok(
      footprintsConflict(
        { footprint: square30, xCm: 15, yCm: 15, period: period(10, 20) },
        { footprint: square30, xCm: 40, yCm: 15, period: period(20, 30) },
      ),
    );
  });

  test('given two footprints whose edges only touch, they do not conflict', () => {
    assert.ok(
      !footprintsConflict(
        { footprint: square30, xCm: 15, yCm: 15, period: period(10, 20) },
        { footprint: square30, xCm: 45, yCm: 15, period: period(10, 20) },
      ),
    );
  });

  test('given two footprints at the same spot in consecutive periods, they do not conflict', () => {
    assert.ok(
      !footprintsConflict(
        { footprint: square30, xCm: 15, yCm: 15, period: period(10, 20) },
        { footprint: square30, xCm: 15, yCm: 15, period: period(21, 30) },
      ),
    );
  });

  test('given a footprint size that is not positive, refuses to create it', () => {
    assert.throws(() => PlantFootprint.of(0, 10));
    assert.throws(() => PlantFootprint.of(10, Number.NaN));
  });
});
