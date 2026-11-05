import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { periodOptionsFor } from './GrowingPeriodOptions.ts';
import type { FrostDay, PlantTiming } from './GrowingPeriod.ts';

const lettuce: PlantTiming = {
  transplantWeeks: 0,
  directSowWeeks: -3,
  daysToHarvest: { min: 30, max: 42 }, // 6 weeks
};

// 27 April 2026 = week 18
const summarize = (plant: PlantTiming, lastSpringFrost: FrostDay = { month: 4, day: 27 }): string[] =>
  periodOptionsFor(plant, { year: 2026, lastSpringFrost }).map((p) => `${p.method}:${p.startWeek}-${p.endWeek}`);

describe('periodOptionsFor', () => {
  test('given a plant that can be transplanted and direct sown, offers the calculated week -1, 0 and +1 for each, transplant first', () => {
    assert.deepEqual(summarize(lettuce), [
      'transplant:17-23',
      'transplant:18-24',
      'transplant:19-25',
      'directSow:14-20',
      'directSow:15-21',
      'directSow:16-22',
    ]);
  });

  test('given a plant that can only be transplanted, offers only transplant options', () => {
    assert.deepEqual(summarize({ ...lettuce, directSowWeeks: null }), [
      'transplant:17-23',
      'transplant:18-24',
      'transplant:19-25',
    ]);
  });

  test('given a plant without any timing, offers no options', () => {
    assert.deepEqual(summarize({ ...lettuce, transplantWeeks: null, directSowWeeks: null }), []);
  });

  test('given a plant without a valid harvest time, offers no options', () => {
    assert.deepEqual(summarize({ ...lettuce, daysToHarvest: { min: 0, max: 0 } }), []);
  });

  test('given a calculated week in the last week of the year, drops the option that falls in the next year', () => {
    // 28 December 2026 = week 53; transplant at week 53 itself
    const options = summarize({ ...lettuce, directSowWeeks: null }, { month: 12, day: 28 });
    assert.deepEqual(options, ['transplant:52-53', 'transplant:53-53']);
  });

  test('given a calculated week in week 1, drops the option that falls in the previous year', () => {
    const options = summarize({ ...lettuce, directSowWeeks: null }, { month: 1, day: 1 });
    assert.deepEqual(options, ['transplant:1-7', 'transplant:2-8']);
  });
});
