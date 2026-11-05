import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlantList, buildSeasonSections } from './planningScreenViewModel.ts';
import { seasonMonthsLabel } from '../shared/seasonLabels.ts';
import { Planning } from '../../domain/planning/Planning.ts';
import type { Season } from '../../types/planning.types.ts';

/** Echoes the key and options, so tests read what the screen would ask for */
const t = (key: string, options?: Record<string, unknown>): string => (options ? `${key} ${JSON.stringify(options)}` : key);
const seasonsOf = (id: string): readonly Season[] =>
  ({ tomaat: ['spring', 'summer'], sla: ['spring'], knoflook: [] } as Record<string, readonly Season[]>)[id] ?? [];
const nameOf = (id: string): string => id.toUpperCase();
const planning = Planning.empty(seasonsOf).addPlants(['tomaat', 'sla', 'knoflook']).setRatio('spring', 'sla', 3);

describe('buildPlantList', () => {
  test('lists every plant with its season labels; a plant without calendar is flagged', () => {
    assert.deepEqual(buildPlantList(planning, nameOf, t), [
      { plantId: 'tomaat', name: 'TOMAAT', seasonLabels: ['season.spring', 'season.summer'], hasCalendar: true },
      { plantId: 'sla', name: 'SLA', seasonLabels: ['season.spring'], hasCalendar: true },
      { plantId: 'knoflook', name: 'KNOFLOOK', seasonLabels: [], hasCalendar: false },
    ]);
  });
});

describe('buildSeasonSections', () => {
  test('gives the starting plants with ratio and target percent, and the carried plants', () => {
    const [spring, summer, autumn] = buildSeasonSections(planning, nameOf, () => undefined, t);
    assert.deepEqual(
      spring.ratioRows.map((r) => [r.plantId, r.ratio, r.targetLabel, r.resultLabel]),
      [['tomaat', 1, 'seasonPlanning.target {"percent":25}', null], ['sla', 3, 'seasonPlanning.target {"percent":75}', null]],
    );
    assert.deepEqual(summer.carriedRows, [{ plantId: 'tomaat', name: 'TOMAAT', label: 'seasonPlanning.carried {"season":"season.spring"}' }]);
    assert.equal(autumn.isEmpty, true);
    assert.equal(spring.status, 'notPlanned');
  });

  test('given the last optimization of a planned season, each row shows its count and shares; zero copies does not fit', () => {
    const shares = [
      { plantId: 'sla', count: 12, actualShare: 0.614, targetShare: 0.75 },
      { plantId: 'tomaat', count: 0, actualShare: 0, targetShare: 0.25 },
    ];
    const planned = planning.applyPlacement('spring', [{ id: 'a', plantId: 'sla', positionX: 5, positionY: 5 }]);
    const [spring] = buildSeasonSections(planned, nameOf, (season) => (season === 'spring' ? shares : undefined), t);
    assert.equal(spring.ratioRows[1].resultLabel, 'seasonPlanning.result {"count":12,"actual":61,"target":75}');
    assert.equal(spring.ratioRows[0].resultLabel, 'seasonPlanning.doesNotFit');
  });
});

describe('buildSeasonSections with a stale result', () => {
  test('a season that is not planned shows no result, even when the last run has shares', () => {
    const shares = [{ plantId: 'sla', count: 12, actualShare: 0.614, targetShare: 0.75 }];
    const [spring] = buildSeasonSections(planning, nameOf, () => shares, t);
    assert.deepEqual(spring.ratioRows.map((r) => [r.resultLabel, r.fits]), [[null, true], [null, true]]);
  });

  test('a season that became outdated shows no result either', () => {
    const shares = [{ plantId: 'sla', count: 12, actualShare: 0.614, targetShare: 0.75 }];
    const outdated = planning.applyPlacement('spring', [{ id: 'a', plantId: 'sla', positionX: 5, positionY: 5 }]).setRatio('spring', 'sla', 2);
    const [spring] = buildSeasonSections(outdated, nameOf, () => shares, t);
    assert.equal(spring.status, 'outdated');
    assert.equal(spring.ratioRows[1].resultLabel, null);
  });
});

describe('seasonMonthsLabel', () => {
  test('uses the short month names', () => {
    assert.equal(
      seasonMonthsLabel('winter', t),
      'season.months {"first":"planning.month.short.12","last":"planning.month.short.2"}',
    );
  });
});
