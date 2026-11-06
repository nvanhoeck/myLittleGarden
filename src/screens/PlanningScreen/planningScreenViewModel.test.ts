import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlantList, buildSeasonSections, plantingName } from './planningScreenViewModel.ts';
import { Planning } from '../../domain/planning/Planning.ts';
import type { PlantingCalendar } from '../../domain/planning/PlantCalendar.ts';
import type { PlacementData, Season } from '../../types/planning.types.ts';

const t = (key: string, options?: Record<string, unknown>): string => (options ? `${key} ${JSON.stringify(options)}` : key);
const nameOf = (id: string): string => id.toUpperCase();
const REACH: Record<string, readonly Season[]> = { sla: ['spring', 'summer'], tomaat: ['spring'], knoflook: [] };
const GROW: Record<string, readonly Season[]> = { 'sla:spring': ['spring'], 'sla:summer': ['summer'], 'tomaat:spring': ['spring', 'summer'] };
const calendar: PlantingCalendar = {
  hasCalendar: (id) => id in REACH,
  reachableSeasons: (id) => REACH[id] ?? [],
  growingSeasons: (id, s) => GROW[`${id}:${s}`] ?? [],
};
const placement = (id: string, plantingId: string): PlacementData => ({ id, plantId: plantingId.split('-')[0], plantingId, positionX: 1, positionY: 1 });
const base = Planning.from(undefined, calendar).addPlants(['tomaat', 'sla', 'knoflook', 'appel']);
const placedSla = base.applyPlacement('spring', [placement('s1', 'sla-spring'), placement('t1', 'tomaat-spring')]);
const twoSla = placedSla.duplicatePlanting('sla-spring', 'summer');

describe('buildPlantList', () => {
  test('lists plantings by season, numbering extra ones, and flags plants without plantings', () => {
    assert.deepEqual(buildPlantList(twoSla, nameOf, t).map((i) => [i.plantId, i.detailKind, i.detail]), [
      ['tomaat', 'plantings', 'season.spring'],
      ['sla', 'plantings', 'season.spring · season.summer (2e)'],
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
    const [spring, summer] = buildSeasonSections(twoSla, nameOf, () => undefined, t);
    assert.deepEqual(spring.ratioRows.map((r) => [r.plantingId, r.targetLabel]), [
      ['tomaat-spring', 'seasonPlanning.target {"percent":50}'],
      ['sla-spring', 'seasonPlanning.target {"percent":50}'],
    ]);
    assert.deepEqual(summer.ratioRows.map((r) => [r.plantingId, r.name]), [['sla-summer', 'seasonPlanning.plantingNumber {"name":"SLA","number":2}']]);
    assert.deepEqual(summer.carriedRows.map((r) => r.plantingId), ['tomaat-spring']);
  });

  test('a placed planting offers duplicate and move to available seasons and remove; an unplaced one only remove', () => {
    const [springPlaced] = buildSeasonSections(placedSla, nameOf, () => undefined, t);
    const sla = springPlaced.ratioRows.find((r) => r.plantingId === 'sla-spring');
    assert.deepEqual(sla?.menu.items.map((i) => [i.kind, i.season, i.testID]), [
      ['duplicate', 'summer', 'planting-action-duplicate-summer'],
      ['move', 'summer', 'planting-action-move-summer'],
      ['remove', 'spring', 'planting-action-remove'],
    ]);
    assert.deepEqual([sla?.menu.isPlaced, sla?.menu.isLastPlanting], [true, true]);
    const [springBase] = buildSeasonSections(base, nameOf, () => undefined, t);
    assert.deepEqual(springBase.ratioRows.find((r) => r.plantingId === 'sla-spring')?.menu.items.map((i) => i.kind), ['remove']);
  });

  test('shows results only for a planned season, matched by planting', () => {
    const shares = [{ plantId: 'sla', plantingId: 'sla-spring', count: 3, actualShare: 0.5, targetShare: 0.5 }];
    const [spring] = buildSeasonSections(placedSla, nameOf, (s) => (s === 'spring' ? shares : undefined), t);
    assert.equal(spring.ratioRows.find((r) => r.plantingId === 'sla-spring')?.resultLabel, 'seasonPlanning.result {"count":3,"actual":50,"target":50}');
  });
});
