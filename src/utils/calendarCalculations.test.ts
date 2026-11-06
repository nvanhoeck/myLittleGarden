import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateGrowingCalendar, splitAtYearEnd } from './calendarCalculations.ts';
import type { PlantData } from '../types/plant.types.ts';

const day = (date: Date): string => date.toISOString().slice(0, 10);
const plant = (windows: Pick<PlantData, 'indoorStartWindow' | 'transplantWindow' | 'directSowWindow'>): PlantData =>
  ({ ...windows, daysToHarvest: { min: 60, max: 85 } }) as PlantData;

describe('calculateGrowingCalendar', () => {
  test('gives each window from its first to its last day, counted from the last frost', () => {
    const calendar = calculateGrowingCalendar(
      plant({ indoorStartWindow: { fromWeeks: -8, toWeeks: -6 }, transplantWindow: { fromWeeks: 2, toWeeks: 6 }, directSowWindow: null }),
      '2026-04-15',
    );
    assert.deepEqual(calendar.indoorStart && [day(calendar.indoorStart.start), day(calendar.indoorStart.end)], ['2026-02-18', '2026-03-04']);
    assert.deepEqual(calendar.transplant && [day(calendar.transplant.start), day(calendar.transplant.end)], ['2026-04-29', '2026-05-27']);
    assert.equal(calendar.directSow, null);
  });

  test('given no valid frost date, there are no ranges', () => {
    const calendar = calculateGrowingCalendar(plant({ indoorStartWindow: null, transplantWindow: { fromWeeks: 2, toWeeks: 6 }, directSowWindow: null }), '');
    assert.deepEqual(calendar, { indoorStart: null, transplant: null, directSow: null });
  });
});

describe('splitAtYearEnd', () => {
  test('keeps a range within one year and splits one that runs into the next year', () => {
    const inYear = { start: new Date(Date.UTC(2026, 2, 1)), end: new Date(Date.UTC(2026, 4, 31)) };
    assert.deepEqual(splitAtYearEnd(inYear), [inYear]);
    const parts = splitAtYearEnd({ start: new Date(Date.UTC(2026, 10, 1)), end: new Date(Date.UTC(2027, 1, 15)) });
    assert.deepEqual(parts.map((r) => [day(r.start), day(r.end)]), [['2026-11-01', '2026-12-31'], ['2027-01-01', '2027-02-15']]);
  });
});
