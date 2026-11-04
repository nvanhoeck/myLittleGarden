import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { GrowingPeriod } from './GrowingPeriod.ts';
import { PlantingWeek } from './PlantingWeek.ts';
import type { FrostDay, PlanningContext, PlantTiming } from './GrowingPeriod.ts';

// 27 April 2026 is the Monday of week 18
const context = (lastSpringFrost: FrostDay = { month: 4, day: 27 }, year = 2026): PlanningContext => ({
  year,
  lastSpringFrost,
});

const tomato: PlantTiming = {
  transplantWeeks: 2,
  directSowWeeks: -2,
  daysToHarvest: { min: 50, max: 70 }, // 10 weeks
};

const period = (startWeek: number, endWeek: number, year = 2026): GrowingPeriod =>
  GrowingPeriod.create({ year, startWeek, endWeek, method: 'transplant' });

describe('GrowingPeriod', () => {
  test('given a start and end week, knows its length and which weeks it includes', () => {
    const p = period(10, 14);
    assert.equal(p.lengthInWeeks, 5);
    assert.ok(p.includes(PlantingWeek.of(2026, 10)));
    assert.ok(p.includes(PlantingWeek.of(2026, 14)));
    assert.ok(!p.includes(PlantingWeek.of(2026, 15)));
    assert.ok(!p.includes(PlantingWeek.of(2027, 12)));
  });

  test('given an end before the start or a week outside the year, refuses to create it', () => {
    assert.throws(() => period(14, 10));
    assert.throws(() => period(0, 10));
    assert.throws(() => period(10, 53, 2025));
  });

  test('given two periods sharing only their boundary week, they overlap by one week', () => {
    assert.ok(period(10, 14).overlaps(period(14, 20)));
    assert.equal(period(10, 14).overlappingWeeks(period(14, 20)), 1);
  });

  test('given two consecutive periods, they do not overlap', () => {
    assert.ok(!period(10, 14).overlaps(period(15, 20)));
    assert.equal(period(10, 14).overlappingWeeks(period(15, 20)), 0);
  });

  test('given the same weeks in different years, they do not overlap', () => {
    assert.ok(!period(10, 14, 2026).overlaps(period(10, 14, 2027)));
  });

  test('given plain stored period data, the same overlap and week rules apply', () => {
    const a = { year: 2026, startWeek: 10, endWeek: 14, method: 'directSow' } as const;
    const b = { year: 2026, startWeek: 14, endWeek: 20, method: 'transplant' } as const;
    assert.equal(GrowingPeriod.sharedWeeks(a, b), 1);
    assert.equal(GrowingPeriod.sharedWeeks(a, { ...b, year: 2027 }), 0);
    assert.ok(GrowingPeriod.covers(a, PlantingWeek.of(2026, 14)));
    assert.ok(!GrowingPeriod.covers(a, PlantingWeek.of(2026, 15)));
  });

  test('given a transplanted plant, starts transplantWeeks after the frost week and lasts the harvest days', () => {
    const p = GrowingPeriod.fromCatalog(tomato, 'transplant', context());
    assert.deepEqual(p?.toData(), { year: 2026, startWeek: 20, endWeek: 30, method: 'transplant' });
  });

  test('given a direct-sown plant, starts directSowWeeks from the frost week and lasts the harvest days counted from sowing', () => {
    const p = GrowingPeriod.fromCatalog(tomato, 'directSow', context());
    assert.deepEqual(p?.toData(), { year: 2026, startWeek: 16, endWeek: 26, method: 'directSow' });
  });

  test('given harvest days that are not a multiple of 7, rounds the duration up to whole weeks', () => {
    const p = GrowingPeriod.fromCatalog({ ...tomato, daysToHarvest: { min: 40, max: 64 } }, 'transplant', context());
    assert.equal(p?.endWeek, 30); // 20 + ceil(64 / 7) = 20 + 10
  });

  test('given a shift of one week, moves the start by that week', () => {
    assert.equal(GrowingPeriod.fromCatalog(tomato, 'transplant', context(), -1)?.startWeek, 19);
    assert.equal(GrowingPeriod.fromCatalog(tomato, 'transplant', context(), 1)?.startWeek, 21);
  });

  test('given a frost day of 29 February in a non-leap year, uses 28 February', () => {
    const atFrost: PlantTiming = { ...tomato, transplantWeeks: 0 };
    // 28 February 2027 is a Sunday in week 8; 1 March 2027 would be week 9
    const p = GrowingPeriod.fromCatalog(atFrost, 'transplant', context({ month: 2, day: 29 }, 2027));
    assert.equal(p?.startWeek, 8);
  });

  test('given a frost day of 29 February in a leap year, keeps it', () => {
    const atFrost: PlantTiming = { ...tomato, transplantWeeks: 0 };
    // 29 February 2028 is a Tuesday in week 9
    const p = GrowingPeriod.fromCatalog(atFrost, 'transplant', context({ month: 2, day: 29 }, 2028));
    assert.equal(p?.startWeek, 9);
  });

  test('given a frost month outside 1-12, refuses to derive a period', () => {
    assert.throws(() => GrowingPeriod.fromCatalog(tomato, 'transplant', context({ month: 13, day: 1 })));
  });

  test('given a long harvest time, caps the end at the last week of the year', () => {
    const late: PlantTiming = { ...tomato, transplantWeeks: 22, daysToHarvest: { min: 150, max: 200 } };
    const p = GrowingPeriod.fromCatalog(late, 'transplant', context());
    assert.deepEqual([p?.startWeek, p?.endWeek], [40, 53]);
  });

  test('given a start that falls in the next year, there is no period', () => {
    const p = GrowingPeriod.fromCatalog(tomato, 'transplant', context({ month: 12, day: 21 }));
    assert.equal(p, null);
  });

  test('given a start that falls in the previous year, there is no period', () => {
    const early: PlantTiming = { ...tomato, directSowWeeks: -4 };
    const p = GrowingPeriod.fromCatalog(early, 'directSow', context({ month: 1, day: 10 }));
    assert.equal(p, null);
  });

  test('given a plant without weeks for a method, there is no period for that method', () => {
    const p = GrowingPeriod.fromCatalog({ ...tomato, directSowWeeks: null }, 'directSow', context());
    assert.equal(p, null);
  });

  test('given harvest days that are not a positive finite number, there is no period', () => {
    for (const max of [0, -7, Number.NaN, Number.POSITIVE_INFINITY]) {
      const p = GrowingPeriod.fromCatalog({ ...tomato, daysToHarvest: { min: 0, max } }, 'transplant', context());
      assert.equal(p, null, `max ${max}`);
    }
  });

  test('given stored data, restores an equal period', () => {
    const p = period(10, 14);
    assert.ok(GrowingPeriod.create(p.toData()).equals(p));
    assert.ok(!p.equals(GrowingPeriod.create({ ...p.toData(), method: 'directSow' })));
  });
});
