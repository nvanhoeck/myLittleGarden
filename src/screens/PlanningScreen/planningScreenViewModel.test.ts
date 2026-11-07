import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlantList, buildSeasonSections, formatSquareMetres, plantingName } from './planningScreenViewModel.ts';
import { Planning } from '../../domain/planning/Planning.ts';
import type { PlantingCalendar } from '../../domain/planning/PlantCalendar.ts';
import { seasonMonthsLabel } from '../shared/seasonLabels.ts';
import type { AreaData, Season } from '../../types/planning.types.ts';

const t = (key: string, options?: Record<string, unknown>): string => (options ? `${key} ${JSON.stringify(options)}` : key);
const nameOf = (id: string): string => id.toUpperCase();
const REACH: Record<string, readonly Season[]> = { sla: ['spring', 'summer'], tomaat: ['spring'], knoflook: [] };
const GROW: Record<string, readonly Season[]> = { 'sla:spring': ['spring'], 'sla:summer': ['summer'], 'tomaat:spring': ['spring', 'summer'] };
const calendar: PlantingCalendar = {
  hasCalendar: (id) => id in REACH,
  reachableSeasons: (id) => REACH[id] ?? [],
  growingSeasons: (id, s) => GROW[`${id}:${s}`] ?? [],
};
const area = (id: string, plantingId: string, xCm = 0): AreaData => ({
  id,
  plantId: plantingId.split('-')[0],
  plantingId,
  pieces: [{ xCm, yCm: 0, widthCm: 100, lengthCm: 200 }],
});
/** A plant count of one per 100 cm², sown (null) for sla in this test */
const countOf = (a: AreaData): number | null => (a.plantId === 'sla' ? null : a.pieces.reduce((s, p) => s + (p.widthCm * p.lengthCm) / 100, 0));
const base = Planning.from(undefined, calendar).addPlants(['tomaat', 'sla', 'knoflook', 'appel']);
const placedSla = base.applyAreas('spring', [area('s1', 'sla-spring'), area('t1', 'tomaat-spring', 100)]);
const twoSla = placedSla.duplicatePlanting('sla-spring', 'summer');
const noShares = (): undefined => undefined;

describe('buildPlantList', () => {
  test('lists plantings by season, numbering extra ones, and flags plants without plantings', () => {
    assert.deepEqual(buildPlantList(twoSla, nameOf, t).map((i) => [i.plantId, i.detailKind, i.detail]), [
      ['tomaat', 'plantings', 'season.spring'],
      ['sla', 'plantings', 'season.spring · season.summer (2e teelt)'],
      ['knoflook', 'outsideYear', 'seasonPlanning.outsideYear'],
      ['appel', 'noCalendar', 'seasonPlanning.noCalendar'],
    ]);
  });
});

describe('plantingName', () => {
  test('the first planting is the plant name, later ones are numbered', () => {
    assert.equal(plantingName(twoSla, 'sla-spring', nameOf, t), 'SLA');
    assert.equal(plantingName(twoSla, 'sla-summer', nameOf, t), 'seasonPlanning.plantingNumber {"name":"SLA","number":2}');
  });

  test('after removing the first planting, the remaining one is not numbered', () => {
    assert.equal(plantingName(twoSla.removePlanting('sla-spring'), 'sla-summer', nameOf, t), 'SLA');
  });
});

describe('buildSeasonSections', () => {
  test('gives one row per planting starting in the season, with target percent', () => {
    const [spring, summer] = buildSeasonSections(twoSla, nameOf, noShares, countOf, t);
    assert.deepEqual(spring.ratioRows.map((r) => [r.plantingId, r.targetLabel]), [
      ['tomaat-spring', 'seasonPlanning.target {"percent":50}'],
      ['sla-spring', 'seasonPlanning.target {"percent":50}'],
    ]);
    assert.deepEqual(summer.ratioRows.map((r) => [r.plantingId, r.name]), [['sla-summer', 'seasonPlanning.plantingNumber {"name":"SLA","number":2}']]);
    assert.deepEqual(summer.carriedRows.map((r) => r.plantingId), ['tomaat-spring']);
  });

  test('a placed planting offers duplicate and move to available seasons and remove; an unplaced one only remove', () => {
    const [springPlaced] = buildSeasonSections(placedSla, nameOf, noShares, countOf, t);
    const sla = springPlaced.ratioRows.find((r) => r.plantingId === 'sla-spring');
    assert.deepEqual(sla?.menu.items.map((i) => [i.kind, i.season, i.testID]), [
      ['duplicate', 'summer', 'planting-action-duplicate-summer'],
      ['move', 'summer', 'planting-action-move-summer'],
      ['remove', 'spring', 'planting-action-remove'],
    ]);
    assert.deepEqual([sla?.menu.isPlaced, sla?.menu.isLastPlanting], [true, true]);
    const [springBase] = buildSeasonSections(base, nameOf, noShares, countOf, t);
    assert.deepEqual(springBase.ratioRows.find((r) => r.plantingId === 'sla-spring')?.menu.items.map((i) => i.kind), ['remove']);
  });

  test('shows results only for a planned season, matched by planting: plants of the area, or the sown m²', () => {
    const shares = [
      { plantId: 'tomaat', plantingId: 'tomaat-spring', plantCount: 200, fits: true, actualShare: 0.5, targetShare: 0.5 },
      { plantId: 'sla', plantingId: 'sla-spring', plantCount: null, fits: true, actualShare: 0.5, targetShare: 0.5 },
    ];
    const [spring] = buildSeasonSections(placedSla, nameOf, (s) => (s === 'spring' ? shares : undefined), countOf, t);
    const labelOf = (id: string): string | null | undefined => spring.ratioRows.find((r) => r.plantingId === id)?.resultLabel;
    assert.equal(labelOf('tomaat-spring'), 'seasonPlanning.result {"count":200,"actual":50,"target":50}');
    assert.equal(labelOf('sla-spring'), 'seasonPlanning.resultSown {"m2":"2"}');
  });

  test('a planting that did not fit says so', () => {
    const shares = [{ plantId: 'tomaat', plantingId: 'tomaat-spring', plantCount: 0, fits: false, actualShare: 0, targetShare: 0.5 }];
    const [spring] = buildSeasonSections(placedSla, nameOf, () => shares, countOf, t);
    const row = spring.ratioRows.find((r) => r.plantingId === 'tomaat-spring');
    assert.deepEqual([row?.resultLabel, row?.fits], ['seasonPlanning.doesNotFit', false]);
  });

  test('a planting with a locked area shows "vergrendeld" with the plants of its area instead of a share', () => {
    const locked = placedSla.toggleLock('spring', 't1').toggleLock('spring', 's1');
    const [spring] = buildSeasonSections(locked, nameOf, () => [], countOf, t);
    const labelOf = (id: string): string | null | undefined => spring.ratioRows.find((r) => r.plantingId === id)?.resultLabel;
    assert.equal(labelOf('tomaat-spring'), 'seasonPlanning.locked {"count":200}');
    assert.equal(labelOf('sla-spring'), 'seasonPlanning.lockedSown {"m2":"2"}');
  });
});

describe('buildSeasonSections coverage', () => {
  test('hides results when the season is not planned', () => {
    const shares = [{ plantId: 'sla', plantingId: 'sla-spring', plantCount: 3, fits: true, actualShare: 0.5, targetShare: 0.5 }];
    const outdated = placedSla.setRatio('spring', 'sla-spring', 2);
    assert.notEqual(outdated.statusOf('spring'), 'planned');
    const [spring] = buildSeasonSections(outdated, nameOf, () => shares, countOf, t);
    assert.equal(spring.ratioRows.find((r) => r.plantingId === 'sla-spring')?.resultLabel, null);
  });

  test('square metres: one decimal below 10 m², whole above', () => {
    assert.deepEqual([formatSquareMetres(4000), formatSquareMetres(125000), formatSquareMetres(20000)], ['0,4', '13', '2']);
  });

  test('labels winter months across the year end', () => {
    assert.equal(seasonMonthsLabel('winter', t), 'season.months {"first":"planning.month.short.12","last":"planning.month.short.2"}');
  });

  test('a plant with two plantings is not the last one and has no season left to duplicate or move to', () => {
    const [spring] = buildSeasonSections(twoSla, nameOf, noShares, countOf, t);
    const sla = spring.ratioRows.find((r) => r.plantingId === 'sla-spring');
    assert.equal(sla?.menu.isLastPlanting, false);
    assert.deepEqual(sla?.menu.items.map((i) => i.kind), ['remove']);
  });

  test('a planting in summer can be duplicated or moved to the earlier spring', () => {
    const inSummer = placedSla.movePlanting('sla-spring', 'summer').applyAreas('summer', [area('s2', 'sla-spring')]);
    const summer = buildSeasonSections(inSummer, nameOf, noShares, countOf, t)[1];
    const sla = summer.ratioRows.find((r) => r.plantingId === 'sla-spring');
    assert.deepEqual(sla?.menu.items.map((i) => [i.kind, i.season]), [['duplicate', 'spring'], ['move', 'spring'], ['remove', 'summer']]);
  });
});
