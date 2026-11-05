import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateGrowingCalendar } from './calendarCalculations.ts';
import type { PlantData } from '../types/plant.types.ts';

const day = (date: Date): string => date.toISOString().slice(0, 10);
const plant = (weeks: Pick<PlantData, 'indoorStartWeeks' | 'transplantWeeks' | 'directSowWeeks'>): PlantData =>
  ({ ...weeks, daysToHarvest: { min: 60, max: 85 } }) as PlantData;

describe('calculateGrowingCalendar', () => {
  test('gives a two-week range around each catalog date, counted from the last frost', () => {
    const calendar = calculateGrowingCalendar(plant({ indoorStartWeeks: -8, transplantWeeks: 2, directSowWeeks: null }), '2026-04-15');
    assert.deepEqual(calendar.indoorStart && [day(calendar.indoorStart.start), day(calendar.indoorStart.end)], ['2026-02-11', '2026-02-25']);
    assert.deepEqual(calendar.transplant && [day(calendar.transplant.start), day(calendar.transplant.end)], ['2026-04-22', '2026-05-06']);
    assert.equal(calendar.directSow, null);
  });

  test('given no valid frost date, there are no ranges', () => {
    const calendar = calculateGrowingCalendar(plant({ indoorStartWeeks: -8, transplantWeeks: 2, directSowWeeks: 1 }), '');
    assert.deepEqual(calendar, { indoorStart: null, transplant: null, directSow: null });
  });
});
