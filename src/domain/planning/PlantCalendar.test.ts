import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  earliestPlantingDate,
  frostDayOf,
  growingSeasonsFrom,
  plantingWindowOf,
  reachableSeasonsOf,
  seasonsLookup,
  sowingDatesOf,
} from './PlantCalendar.ts';
import type { PlantTiming } from './PlantCalendar.ts';

const day = (date: Date | null | undefined): string | null => (date ? date.toISOString().slice(0, 10) : null);
const frost = { month: 4, day: 15 };

const timing = (overrides: Partial<PlantTiming>): PlantTiming => ({
  indoorStartWindow: null,
  transplantWindow: null,
  directSowWindow: null,
  daysToHarvest: { min: 1, max: 60 },
  ...overrides,
});

// Tomato: plant out 29 April – 27 May, harvest up to 85 days later
const tomato = timing({
  indoorStartWindow: { fromWeeks: -8, toWeeks: -6 },
  transplantWindow: { fromWeeks: 2, toWeeks: 6 },
  daysToHarvest: { min: 60, max: 85 },
});
// Lettuce: sow outside 4 March – 5 August, harvest up to 60 days later
const lettuce = timing({ directSowWindow: { fromWeeks: -6, toWeeks: 16 }, daysToHarvest: { min: 25, max: 60 } });

describe('frostDayOf', () => {
  test('reads month and day from a stored date; null for none or invalid', () => {
    assert.deepEqual(frostDayOf('2026-04-15'), { month: 4, day: 15 });
    assert.equal(frostDayOf(null), null);
    assert.equal(frostDayOf('2026-02-30'), null);
  });
});

describe('sowingDatesOf', () => {
  test('turns each window into dates around the last frost; a method without window is null', () => {
    const dates = sowingDatesOf(tomato, frost, 2026);
    assert.deepEqual([day(dates.indoorStart?.start), day(dates.indoorStart?.end)], ['2026-02-18', '2026-03-04']);
    assert.deepEqual([day(dates.transplant?.start), day(dates.transplant?.end)], ['2026-04-29', '2026-05-27']);
    assert.equal(dates.directSow, null);
  });
});

describe('plantingWindowOf', () => {
  test('is the transplant window when there is one, else the direct sow window, else null', () => {
    assert.equal(day(plantingWindowOf(tomato, frost, 2026)?.start), '2026-04-29');
    assert.equal(day(plantingWindowOf(lettuce, frost, 2026)?.end), '2026-08-05');
    assert.equal(plantingWindowOf(timing({}), frost, 2026), null);
  });
});

describe('earliestPlantingDate', () => {
  test('is the window start inside its own season, else the first day of a later season inside the window', () => {
    assert.equal(day(earliestPlantingDate(lettuce, frost, 2026, 'spring')), '2026-03-04');
    assert.equal(day(earliestPlantingDate(lettuce, frost, 2026, 'summer')), '2026-06-01');
    assert.equal(earliestPlantingDate(lettuce, frost, 2026, 'autumn'), null);
  });
});

describe('reachableSeasonsOf', () => {
  test('gives every season the window reaches', () => {
    assert.deepEqual(reachableSeasonsOf(tomato, frost, 2026), ['spring']);
    assert.deepEqual(reachableSeasonsOf(lettuce, frost, 2026), ['spring', 'summer']);
  });

  test('given a window starting in February, the plant starts in spring on 1 March', () => {
    const early = timing({ directSowWindow: { fromWeeks: -9, toWeeks: 2 } }); // 11 Feb – 29 Apr
    assert.deepEqual(reachableSeasonsOf(early, frost, 2026), ['spring']);
    assert.equal(day(earliestPlantingDate(early, frost, 2026, 'spring')), '2026-03-01');
  });

  test('given a window ending in late May, summer is not reached; ending in early June it is', () => {
    const endsMay = timing({ directSowWindow: { fromWeeks: 0, toWeeks: 6 } }); // 15 Apr – 27 May
    const endsJune = timing({ directSowWindow: { fromWeeks: 0, toWeeks: 7 } }); // 15 Apr – 3 June
    assert.deepEqual(reachableSeasonsOf(endsMay, frost, 2026), ['spring']);
    assert.deepEqual(reachableSeasonsOf(endsJune, frost, 2026), ['spring', 'summer']);
  });

  test('given a window entirely before March of the planning year, no season is reached', () => {
    const autumnBefore = timing({ directSowWindow: { fromWeeks: -26, toWeeks: -22 } }); // Oct – Nov of the year before
    assert.deepEqual(reachableSeasonsOf(autumnBefore, frost, 2026), []);
  });

  test('given no planting window, no season is reached', () => {
    assert.deepEqual(reachableSeasonsOf(timing({ indoorStartWindow: { fromWeeks: -8, toWeeks: -6 } }), frost, 2026), []);
  });

  test('given an autumn-sown crop (garlic, end of September to end of March), it is planted in autumn, not in spring', () => {
    const garlic = timing({ directSowWindow: { fromWeeks: 24, toWeeks: 50 }, daysToHarvest: { min: 210, max: 240 } });
    assert.deepEqual(reachableSeasonsOf(garlic, frost, 2026), ['autumn', 'winter']);
    assert.deepEqual(growingSeasonsFrom(garlic, frost, 2026, 'autumn'), ['autumn', 'winter']);
  });
});

describe('growingSeasonsFrom', () => {
  test('runs from the earliest planting date in the start season until the latest harvest', () => {
    assert.deepEqual(growingSeasonsFrom(tomato, frost, 2026, 'spring'), ['spring', 'summer']);
    assert.deepEqual(growingSeasonsFrom(lettuce, frost, 2026, 'spring'), ['spring']);
    assert.deepEqual(growingSeasonsFrom(lettuce, frost, 2026, 'summer'), ['summer']);
  });

  test('gives no seasons for a season the window does not reach or without harvest time', () => {
    assert.deepEqual(growingSeasonsFrom(lettuce, frost, 2026, 'autumn'), []);
    assert.deepEqual(growingSeasonsFrom(timing({ directSowWindow: { fromWeeks: 0, toWeeks: 4 }, daysToHarvest: { min: 0, max: 0 } }), frost, 2026, 'spring'), []);
  });

  test('ends at the latest at the end of the planning year\'s winter', () => {
    const late = timing({ transplantWindow: { fromWeeks: 15, toWeeks: 20 }, daysToHarvest: { min: 200, max: 300 } });
    assert.deepEqual(growingSeasonsFrom(late, frost, 2026, 'summer'), ['summer', 'autumn', 'winter']);
  });
});

describe('seasonsLookup', () => {
  test('gives the growing seasons of the first planting; unknown plants or no frost date give none', () => {
    const catalog = new Map([['tomaat', tomato]]);
    assert.deepEqual(seasonsLookup(2026, frost, (id) => catalog.get(id))('tomaat'), ['spring', 'summer']);
    assert.deepEqual(seasonsLookup(2026, frost, (id) => catalog.get(id))('onbekend'), []);
    assert.deepEqual(seasonsLookup(2026, null, (id) => catalog.get(id))('tomaat'), []);
  });
});
