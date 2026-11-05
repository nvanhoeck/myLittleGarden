import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  frostDayOf,
  growingSeasonsOf,
  outdoorPeriodOf,
  plantingDatesOf,
  seasonsLookup,
} from './PlantCalendar.ts';
import type { PlantTiming } from './PlantCalendar.ts';

const day = (date: Date | null | undefined): string | null => (date ? date.toISOString().slice(0, 10) : null);
const frost = { month: 4, day: 15 };

const timing = (overrides: Partial<PlantTiming>): PlantTiming => ({
  indoorStartWeeks: null,
  transplantWeeks: null,
  directSowWeeks: null,
  daysToHarvest: { min: 1, max: 60 },
  ...overrides,
});

const tomato = timing({ indoorStartWeeks: -8, transplantWeeks: 2, daysToHarvest: { min: 60, max: 85 } });
const lettuce = timing({ transplantWeeks: -6, directSowWeeks: -4, daysToHarvest: { min: 25, max: 60 } });
const carrot = timing({ directSowWeeks: -4, daysToHarvest: { min: 60, max: 80 } });
const garlic = timing({ directSowWeeks: -24, daysToHarvest: { min: 210, max: 240 } });

describe('frostDayOf', () => {
  test('reads month and day from a stored date', () => {
    assert.deepEqual(frostDayOf('2026-04-15'), { month: 4, day: 15 });
  });

  test('gives null for no date or an invalid date', () => {
    assert.equal(frostDayOf(null), null);
    assert.equal(frostDayOf('2026-02-30'), null);
    assert.equal(frostDayOf('15/04/2026'), null);
  });
});

describe('plantingDatesOf', () => {
  test('adds the catalog weeks to the last frost of the planning year', () => {
    const dates = plantingDatesOf(tomato, frost, 2026);
    assert.equal(day(dates.indoorStart), '2026-02-18');
    assert.equal(day(dates.transplant), '2026-04-29');
    assert.equal(dates.directSow, null);
  });
});

describe('outdoorPeriodOf', () => {
  test('starts at the transplant date when there is one and lasts until the latest harvest', () => {
    const period = outdoorPeriodOf(tomato, frost, 2026);
    assert.deepEqual([day(period?.start), day(period?.end)], ['2026-04-29', '2026-07-23']);
  });

  test('starts at the direct sow date when there is no transplant date', () => {
    const period = outdoorPeriodOf(carrot, frost, 2026);
    assert.deepEqual([day(period?.start), day(period?.end)], ['2026-03-18', '2026-06-06']);
  });

  test('ends at the latest at the end of the planning year\'s winter', () => {
    const late = timing({ transplantWeeks: 15, daysToHarvest: { min: 200, max: 300 } });
    assert.equal(day(outdoorPeriodOf(late, frost, 2026)?.end), '2027-02-28');
  });

  test('gives null without planting weeks or without a harvest time', () => {
    assert.equal(outdoorPeriodOf(timing({}), frost, 2026), null);
    assert.equal(outdoorPeriodOf(timing({ transplantWeeks: 2, daysToHarvest: { min: 0, max: 0 } }), frost, 2026), null);
  });
});

describe('growingSeasonsOf', () => {
  test('gives every season the outdoor period overlaps, in order', () => {
    assert.deepEqual(growingSeasonsOf(tomato, frost, 2026), ['spring', 'summer']);
    assert.deepEqual(growingSeasonsOf(lettuce, frost, 2026), ['spring']);
    assert.deepEqual(growingSeasonsOf(carrot, frost, 2026), ['spring', 'summer']);
  });

  test('given a plant sown in the autumn before, it counts from spring of the planning year', () => {
    assert.deepEqual(growingSeasonsOf(garlic, frost, 2026), ['spring', 'summer']);
  });

  test('given a long harvest from late July, it reaches winter', () => {
    const late = timing({ transplantWeeks: 15, daysToHarvest: { min: 200, max: 300 } });
    assert.deepEqual(growingSeasonsOf(late, frost, 2026), ['summer', 'autumn', 'winter']);
  });

  test('given no calendar, it gives no seasons', () => {
    assert.deepEqual(growingSeasonsOf(timing({}), frost, 2026), []);
  });
});

describe('seasonsLookup', () => {
  test('looks plants up in the catalog; unknown plants or no frost date give no seasons', () => {
    const catalog = new Map([['tomaat', tomato]]);
    const seasonsOf = seasonsLookup(2026, frost, (id) => catalog.get(id));
    assert.deepEqual(seasonsOf('tomaat'), ['spring', 'summer']);
    assert.deepEqual(seasonsOf('onbekend'), []);
    assert.deepEqual(seasonsLookup(2026, null, (id) => catalog.get(id))('tomaat'), []);
  });
});
