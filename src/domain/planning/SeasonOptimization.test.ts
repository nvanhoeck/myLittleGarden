import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { optimizeSeason } from './SeasonOptimization.ts';
import { Planning } from './Planning.ts';
import type { PlantData } from '../../types/plant.types.ts';
import type { AreaData, AreaPiece, Season } from '../../types/planning.types.ts';
import type { PlantingCalendar } from './PlantCalendar.ts';
import type { PlantingArea } from './PlantingArea.ts';

const plant = (id: string, overrides: Partial<PlantData> = {}): PlantData =>
  ({ id, nameNl: id, spacingRadiusCm: 10, plantingStyle: 'individual', companions: [], combatives: [], ...overrides }) as PlantData;

const CATALOG = new Map<string, PlantData>([
  ['tomaat', plant('tomaat', { spacingRadiusCm: 25 })],
  ['sla', plant('sla')],
  ['boerenkool', plant('boerenkool')],
  ['snijsla', plant('snijsla', { plantingStyle: 'patch', spacingRadiusCm: 2, sowingSpacingCm: 5 })],
]);
const TABLE: Record<string, readonly Season[]> = {
  tomaat: ['spring', 'summer'],
  sla: ['spring'],
  boerenkool: ['summer'],
  snijsla: ['spring'],
  onbekend: ['spring'],
};
const calendar: PlantingCalendar = {
  hasCalendar: (id) => id in TABLE,
  reachableSeasons: (id) => (TABLE[id] ? [TABLE[id][0]] : []),
  growingSeasons: (id, s) => (TABLE[id]?.[0] === s ? TABLE[id] : []),
};
const box: readonly PlantingArea[] = [{ shape: 'rectangle', widthCm: 200, lengthCm: 200 }];

function ids(): () => string {
  let next = 0;
  return () => `id-${++next}`;
}

const input = (planning: Planning, season: Season, extra: { hasLayers?: boolean; areas?: readonly PlantingArea[] } = {}) => ({
  planning,
  season,
  areas: extra.areas ?? box,
  hasLayers: extra.hasLayers ?? false,
  plantOf: (id: string) => CATALOG.get(id),
  newId: ids(),
});

function overlap(a: AreaPiece, b: AreaPiece): boolean {
  const eps = 1e-6;
  return a.xCm + eps < b.xCm + b.widthCm && b.xCm + eps < a.xCm + a.widthCm
    && a.yCm + eps < b.yCm + b.lengthCm && b.yCm + eps < a.yCm + a.lengthCm;
}

function areasOverlap(a: AreaData, b: AreaData): boolean {
  return (a.layerIndex ?? 0) === (b.layerIndex ?? 0) && a.pieces.some((p) => b.pieces.some((q) => overlap(p, q)));
}

describe('optimizeSeason', () => {
  test('gives the plantings starting in the season an area by ratio and marks the season planned', () => {
    const planning = Planning.from(undefined, calendar).addPlants(['tomaat', 'sla']).setRatio('spring', 'sla-spring', 2);
    const outcome = optimizeSeason(input(planning, 'spring'));
    const areas = outcome.planning.areasIn('spring');
    assert.deepEqual(areas.map((a) => a.plantingId).sort(), ['sla-spring', 'tomaat-spring']);
    assert.deepEqual(areas.map((a) => a.id).sort(), ['id-1', 'id-2']);
    assert.ok(areas.every((a) => a.layerIndex === undefined && a.plantId === a.plantingId.split('-')[0]));
    assert.equal(outcome.planning.statusOf('spring'), 'planned');
    assert.deepEqual(outcome.shares.map((s) => [s.plantingId, s.plantId]).sort(), [['sla-spring', 'sla'], ['tomaat-spring', 'tomaat']]);
    const sla = outcome.shares.find((s) => s.plantingId === 'sla-spring');
    assert.ok(Math.abs((sla?.targetShare ?? 0) - 2 / 3) < 1e-9);
  });

  test('keeps carried areas where they are and lays out around them', () => {
    // Lettuce only grows in spring: its space is free again in summer
    const spring = optimizeSeason(input(Planning.from(undefined, calendar).addPlants(['tomaat', 'sla', 'boerenkool']), 'spring')).planning;
    const summer = optimizeSeason(input(spring, 'summer')).planning;
    const carried = summer.carriedAreasIn('summer');
    assert.deepEqual(carried, spring.areasIn('spring').filter((a) => a.plantId === 'tomaat'));
    assert.ok(summer.areasIn('summer').length > 0);
    for (const own of summer.areasIn('summer')) {
      for (const fixed of carried) {
        assert.ok(!areasOverlap(own, fixed));
      }
    }
  });

  test('keeps a locked area, lays out the others around it and gives its planting no second area', () => {
    const locked: AreaData = { id: 'locked', plantId: 'sla', plantingId: 'sla-spring', pieces: [{ xCm: 0, yCm: 0, widthCm: 40, lengthCm: 40 }], locked: true };
    const planning = Planning.from(undefined, calendar).addPlants(['sla', 'tomaat']).applyAreas('spring', [locked]);
    const areas = optimizeSeason(input(planning, 'spring')).planning.areasIn('spring');
    assert.equal(areas[0], locked);
    assert.deepEqual(areas.slice(1).map((a) => a.plantingId), ['tomaat-spring']);
    assert.ok(!areasOverlap(areas[1], locked));
  });

  test('given layers, areas name their layer', () => {
    const areas: PlantingArea[] = [{ shape: 'rectangle', widthCm: 40, lengthCm: 40 }, { shape: 'rectangle', widthCm: 20, lengthCm: 20 }];
    const planning = Planning.from(undefined, calendar).addPlants(['sla']);
    const [area] = optimizeSeason(input(planning, 'spring', { hasLayers: true, areas })).planning.areasIn('spring');
    assert.equal(typeof area.layerIndex, 'number');
  });

  test('a patch plant gets the whole free space and no plant count', () => {
    const planning = Planning.from(undefined, calendar).addPlants(['snijsla']);
    const outcome = optimizeSeason(input(planning, 'spring'));
    assert.deepEqual(outcome.planning.areasIn('spring')[0].pieces, [{ xCm: 0, yCm: 0, widthCm: 200, lengthCm: 200 }]);
    assert.equal(outcome.shares[0].plantCount, null);
  });

  test('skips plants missing from the catalog', () => {
    const planning = Planning.from(undefined, calendar).addPlants(['onbekend', 'sla']);
    const outcome = optimizeSeason(input(planning, 'spring'));
    assert.ok(outcome.planning.areasIn('spring').every((a) => a.plantId === 'sla'));
    assert.deepEqual(outcome.shares.map((s) => [s.plantingId, s.plantId]), [['sla-spring', 'sla']]);
  });

  test('lays out two plantings of one plant in different seasons independently, keeping the carried one fixed', () => {
    const calendar2: PlantingCalendar = {
      hasCalendar: () => true,
      reachableSeasons: (id) => (id === 'sla' ? ['spring', 'summer'] : []),
      growingSeasons: (_id, s) => (s === 'spring' ? ['spring', 'summer'] : s === 'summer' ? ['summer'] : []),
    };
    const spring: AreaData = { id: 'spring-1', plantId: 'sla', plantingId: 'sla-spring', pieces: [{ xCm: 0, yCm: 0, widthCm: 60, lengthCm: 100 }] };
    const planning = Planning.from(undefined, calendar2).addPlants(['sla']).applyAreas('spring', [spring]).duplicatePlanting('sla-spring', 'summer');
    const summer = optimizeSeason(input(planning, 'summer')).planning;
    assert.deepEqual(summer.areasIn('summer').map((a) => [a.plantingId, a.plantId]), [['sla-summer', 'sla']]);
    assert.deepEqual(summer.carriedAreasIn('summer'), [spring]);
    assert.ok(!areasOverlap(summer.areasIn('summer')[0], spring));
  });
});
