import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { growingPeriodSchema, placedPlantDataSchema, plantToPlanDataSchema } from './plantSchema.ts';

const placedPlant = {
  id: '6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b',
  plantId: 'tomaat',
  positionX: 20,
  positionY: 30,
  placedAt: '2026-05-04T08:00:00.000Z',
  growingPeriod: { year: 2026, startWeek: 19, endWeek: 30, method: 'transplant' },
};

describe('growingPeriodSchema', () => {
  test('given a period within one year, accepts it', () => {
    assert.ok(growingPeriodSchema.safeParse({ year: 2026, startWeek: 53, endWeek: 53, method: 'directSow' }).success);
  });

  test('given week 53 in a year with only 52 weeks, rejects it', () => {
    assert.equal(growingPeriodSchema.safeParse({ year: 2025, startWeek: 50, endWeek: 53, method: 'transplant' }).success, false);
  });

  test('given an end before the start, rejects it', () => {
    assert.equal(growingPeriodSchema.safeParse({ year: 2026, startWeek: 20, endWeek: 19, method: 'transplant' }).success, false);
  });

  test('given week 0, week 54, a fractional week or an unknown method, rejects it', () => {
    for (const period of [
      { year: 2026, startWeek: 0, endWeek: 3, method: 'transplant' },
      { year: 2026, startWeek: 1, endWeek: 54, method: 'transplant' },
      { year: 2026, startWeek: 1.5, endWeek: 3, method: 'transplant' },
      { year: 2026, startWeek: 1, endWeek: 3, method: 'cutting' },
    ]) {
      assert.equal(growingPeriodSchema.safeParse(period).success, false, JSON.stringify(period));
    }
  });
});

describe('placedPlantDataSchema', () => {
  test('given a placed plant with a growing period, accepts it', () => {
    assert.ok(placedPlantDataSchema.safeParse(placedPlant).success);
  });

  test('given a placed plant without a growing period, rejects it', () => {
    const { growingPeriod: _, ...withoutPeriod } = placedPlant;
    assert.equal(placedPlantDataSchema.safeParse(withoutPeriod).success, false);
  });
});

describe('plantToPlanDataSchema', () => {
  test('given a plant to plan with or without a layer, accepts it', () => {
    assert.ok(plantToPlanDataSchema.safeParse({ id: 'a', plantId: 'sla', year: 2026 }).success);
    assert.ok(plantToPlanDataSchema.safeParse({ id: 'a', plantId: 'sla', year: 2026, layerIndex: 2 }).success);
  });

  test('given a plant to plan that keeps a patch size, accepts it', () => {
    const item = { id: 'a', plantId: 'tarwe', year: 2026, patchWidthInCm: 40, patchHeightInCm: 20, patchRotationDeg: 90 };
    assert.deepEqual(plantToPlanDataSchema.parse(item), item);
  });

  test('given a negative layer or a missing year, rejects it', () => {
    assert.equal(plantToPlanDataSchema.safeParse({ id: 'a', plantId: 'sla', year: 2026, layerIndex: -1 }).success, false);
    assert.equal(plantToPlanDataSchema.safeParse({ id: 'a', plantId: 'sla' }).success, false);
  });
});
