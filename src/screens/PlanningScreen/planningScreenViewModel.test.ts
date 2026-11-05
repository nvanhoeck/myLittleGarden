import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlantList, buildSeasonSections, seasonMonthsLabel } from './planningScreenViewModel.ts';
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

  test('given the last optimization, each row shows its count and shares; zero copies does not fit', () => {
    const shares = [
      { plantId: 'sla', count: 12, actualShare: 0.614, targetShare: 0.75 },
      { plantId: 'tomaat', count: 0, actualShare: 0, targetShare: 0.25 },
    ];
    const [spring] = buildSeasonSections(planning, nameOf, (season) => (season === 'spring' ? shares : undefined), t);
    assert.equal(spring.ratioRows[1].resultLabel, 'seasonPlanning.result {"count":12,"actual":61,"target":75}');
    assert.equal(spring.ratioRows[0].resultLabel, 'seasonPlanning.doesNotFit');
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
