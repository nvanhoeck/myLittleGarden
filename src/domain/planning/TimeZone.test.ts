import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTimeZones } from './TimeZone.ts';
import type { GrowingPeriodData } from './GrowingPeriod.ts';

const plant = (id: string, startWeek: number, endWeek: number, year = 2026): { id: string; period: GrowingPeriodData } => ({
  id,
  period: { year, startWeek, endWeek, method: 'transplant' },
});

describe('calculateTimeZones', () => {
  test('given no plants, the whole year is one empty zone', () => {
    assert.deepEqual(calculateTimeZones([], 2025), [{ startWeek: 1, endWeek: 52, plantIds: [] }]);
  });

  test('given overlapping plants, splits the year into runs with the same active plants, including empty weeks', () => {
    const zones = calculateTimeZones([plant('b', 10, 20), plant('a', 15, 30)], 2026);
    assert.deepEqual(zones, [
      { startWeek: 1, endWeek: 9, plantIds: [] },
      { startWeek: 10, endWeek: 14, plantIds: ['b'] },
      { startWeek: 15, endWeek: 20, plantIds: ['a', 'b'] },
      { startWeek: 21, endWeek: 30, plantIds: ['a'] },
      { startWeek: 31, endWeek: 53, plantIds: [] },
    ]);
  });

  test('given one plant replacing another in the next week, they form separate zones', () => {
    const zones = calculateTimeZones([plant('a', 1, 10), plant('b', 11, 53)], 2026);
    assert.deepEqual(zones, [
      { startWeek: 1, endWeek: 10, plantIds: ['a'] },
      { startWeek: 11, endWeek: 53, plantIds: ['b'] },
    ]);
  });

  test('given plants of another year, ignores them', () => {
    assert.deepEqual(calculateTimeZones([plant('a', 10, 20, 2027)], 2026), [
      { startWeek: 1, endWeek: 53, plantIds: [] },
    ]);
  });

  test('given any plants, the zones cover every week of the year without gaps', () => {
    const zones = calculateTimeZones([plant('a', 3, 7), plant('b', 5, 40), plant('c', 52, 53)], 2026);
    assert.equal(zones[0].startWeek, 1);
    assert.equal(zones[zones.length - 1].endWeek, 53);
    for (let i = 1; i < zones.length; i++) {
      assert.equal(zones[i].startWeek, zones[i - 1].endWeek + 1);
    }
  });
});
