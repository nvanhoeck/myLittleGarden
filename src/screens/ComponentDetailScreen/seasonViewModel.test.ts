import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeasonTabs, defaultSeasonFor, optimizeResultMessage, planningYearRange } from './seasonViewModel.ts';
import { Planning } from '../../domain/planning/Planning.ts';
import type { PlantingCalendar } from '../../domain/planning/PlantCalendar.ts';
import type { Season } from '../../types/planning.types.ts';

const t = (key: string, options?: Record<string, unknown>): string => (options ? `${key} ${JSON.stringify(options)}` : key);
const growingOf = (id: string): readonly Season[] => (id === 'tomaat' ? ['spring', 'summer'] : ['spring']);
const calendar: PlantingCalendar = {
  hasCalendar: () => true,
  reachableSeasons: () => ['spring'],
  growingSeasons: (id) => growingOf(id),
};

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
    const planning = Planning.from(undefined, calendar).addPlants(['tomaat', 'sla']);
    const [spring, summer] = buildSeasonTabs(planning, t);
    assert.deepEqual([spring.season, spring.label, spring.status, spring.startingCount], ['spring', 'season.spring', 'notPlanned', 2]);
    assert.deepEqual([summer.startingCount, summer.carriedCount], [0, 1]);
    assert.match(spring.a11yLabel, /^componentDetail\.tabA11y /);
  });
});

describe('optimizeResultMessage', () => {
  test('counts the plants of the areas and names the plants that did not fit', () => {
    const shares = [
      { plantId: 'sla', plantingId: 'sla-spring', plantCount: 12, fits: true, actualShare: 0.4, targetShare: 0.3 },
      { plantId: 'ui', plantingId: 'ui-spring', plantCount: 780, fits: true, actualShare: 0.3, targetShare: 0.3 },
      { plantId: 'tomaat', plantingId: 'tomaat-spring', plantCount: 0, fits: false, actualShare: 0, targetShare: 0.4 },
    ];
    assert.equal(
      optimizeResultMessage(shares, (id) => id.toUpperCase(), t),
      'componentDetail.optimized {"count":792} · componentDetail.doesNotFit {"names":"TOMAAT"}',
    );
    assert.equal(optimizeResultMessage(shares.slice(0, 1), (id) => id, t), 'componentDetail.optimized {"count":12}');
  });

  test('mentions the sown areas, which have no plant count', () => {
    const shares = [
      { plantId: 'sla', plantingId: 'sla-spring', plantCount: 12, fits: true, actualShare: 0.5, targetShare: 0.5 },
      { plantId: 'spinazie', plantingId: 'spinazie-spring', plantCount: null, fits: true, actualShare: 0.5, targetShare: 0.5 },
    ];
    assert.equal(
      optimizeResultMessage(shares, (id) => id, t),
      'componentDetail.optimized {"count":12} · componentDetail.sownAreas {"count":1}',
    );
  });

  test('says nothing new was placed when no planting was laid out (all locked, or none starts in the season)', () => {
    assert.equal(optimizeResultMessage([], (id) => id, t), 'componentDetail.nothingToPlace');
  });
});
