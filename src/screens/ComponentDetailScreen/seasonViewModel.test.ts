import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeasonTabs, defaultSeasonFor, optimizeResultMessage, planningYearRange } from './seasonViewModel.ts';
import { Planning } from '../../domain/planning/Planning.ts';
import type { Season } from '../../types/planning.types.ts';

const t = (key: string, options?: Record<string, unknown>): string => (options ? `${key} ${JSON.stringify(options)}` : key);
const seasonsOf = (id: string): readonly Season[] => (id === 'tomaat' ? ['spring', 'summer'] : ['spring']);

describe('defaultSeasonFor', () => {
  test('in the current planning year, today\'s season; in another year, spring', () => {
    assert.equal(defaultSeasonFor(2026, { year: 2026, season: 'autumn' }), 'autumn');
    assert.equal(defaultSeasonFor(2027, { year: 2026, season: 'autumn' }), 'spring');
  });
});

describe('planningYearRange', () => {
  test('spans one year around today and every planned year', () => {
    assert.deepEqual(planningYearRange(2026, []), { first: 2025, last: 2027 });
    assert.deepEqual(planningYearRange(2026, [2023, 2029]), { first: 2023, last: 2029 });
  });
});

describe('buildSeasonTabs', () => {
  test('gives each season its label, months, status and the number of plants to place', () => {
    const planning = Planning.empty(seasonsOf).addPlants(['tomaat', 'sla']);
    const [spring, summer] = buildSeasonTabs(planning, t);
    assert.deepEqual([spring.season, spring.label, spring.status, spring.startingCount], ['spring', 'season.spring', 'notPlanned', 2]);
    assert.deepEqual([summer.startingCount, summer.carriedCount], [0, 1]);
    assert.match(spring.a11yLabel, /^componentDetail\.tabA11y /);
  });
});

describe('optimizeResultMessage', () => {
  test('counts the placed plants and names the plants that did not fit', () => {
    const shares = [
      { plantId: 'sla', count: 12, actualShare: 0.6, targetShare: 0.5 },
      { plantId: 'tomaat', count: 0, actualShare: 0, targetShare: 0.5 },
    ];
    assert.equal(
      optimizeResultMessage(shares, (id) => id.toUpperCase(), t),
      'componentDetail.optimized {"count":12} · componentDetail.doesNotFit {"names":"TOMAAT"}',
    );
    assert.equal(optimizeResultMessage(shares.slice(0, 1), (id) => id, t), 'componentDetail.optimized {"count":12}');
  });
});
