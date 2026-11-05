import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SEASONS, seasonContaining, seasonMonths, seasonRange, seasonsAfter } from './Season.ts';

const day = (date: Date): string => date.toISOString().slice(0, 10);

describe('seasonRange', () => {
  test('given spring and summer, the range covers their three months', () => {
    assert.deepEqual([day(seasonRange(2026, 'spring').start), day(seasonRange(2026, 'spring').end)], ['2026-03-01', '2026-05-31']);
    assert.deepEqual([day(seasonRange(2026, 'summer').start), day(seasonRange(2026, 'summer').end)], ['2026-06-01', '2026-08-31']);
  });

  test('given winter, the range runs into February of the next year, leap years included', () => {
    assert.deepEqual([day(seasonRange(2026, 'winter').start), day(seasonRange(2026, 'winter').end)], ['2026-12-01', '2027-02-28']);
    assert.equal(day(seasonRange(2027, 'winter').end), '2028-02-29');
  });
});

describe('seasonMonths', () => {
  test('gives the first and last month of each season', () => {
    assert.deepEqual(SEASONS.map(seasonMonths), [
      { first: 3, last: 5 },
      { first: 6, last: 8 },
      { first: 9, last: 11 },
      { first: 12, last: 2 },
    ]);
  });
});

describe('seasonsAfter', () => {
  test('gives the later seasons of the same planning year', () => {
    assert.deepEqual(seasonsAfter('spring'), ['summer', 'autumn', 'winter']);
    assert.deepEqual(seasonsAfter('winter'), []);
  });
});

describe('seasonContaining', () => {
  test('given a day from March to December, it is in that year', () => {
    assert.deepEqual(seasonContaining(new Date(2026, 2, 1)), { year: 2026, season: 'spring' });
    assert.deepEqual(seasonContaining(new Date(2026, 5, 1)), { year: 2026, season: 'summer' });
    assert.deepEqual(seasonContaining(new Date(2026, 8, 30)), { year: 2026, season: 'autumn' });
    assert.deepEqual(seasonContaining(new Date(2026, 11, 5)), { year: 2026, season: 'winter' });
  });

  test('given January or February, it is the winter of the year before', () => {
    assert.deepEqual(seasonContaining(new Date(2027, 0, 10)), { year: 2026, season: 'winter' });
    assert.deepEqual(seasonContaining(new Date(2027, 1, 28)), { year: 2026, season: 'winter' });
  });
});
