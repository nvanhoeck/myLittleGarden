import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { optimizeSeason } from './SeasonOptimization.ts';
import { Planning } from './Planning.ts';
import { PlantFootprint, boundsOverlap, footprintOf } from './PlantFootprint.ts';
import type { PlantData } from '../../types/plant.types.ts';
import type { PlacementData, Season } from '../../types/planning.types.ts';

const plant = (id: string, overrides: Partial<PlantData> = {}): PlantData =>
  ({ id, nameNl: id, spacingRadiusCm: 10, plantingStyle: 'individual', companions: [], combatives: [], ...overrides }) as PlantData;

const CATALOG = new Map<string, PlantData>([
  ['tomaat', plant('tomaat', { spacingRadiusCm: 25 })],
  ['sla', plant('sla')],
  ['boerenkool', plant('boerenkool')],
  ['snijsla', plant('snijsla', { plantingStyle: 'patch', spacingRadiusCm: 2, sowingSpacingCm: 5 })],
]);
const SEASONS_BY_PLANT: Record<string, readonly Season[]> = {
  tomaat: ['spring', 'summer'],
  sla: ['spring'],
  boerenkool: ['summer'],
  snijsla: ['spring'],
  onbekend: ['spring'],
};
const seasonsOf = (id: string): readonly Season[] => SEASONS_BY_PLANT[id] ?? [];
const box = [{ shape: 'rectangle', widthCm: 100, lengthCm: 100 } as const];

function ids(): () => string {
  let next = 0;
  return () => `id-${++next}`;
}

const input = (planning: Planning, season: Season, extra: { hasLayers?: boolean; areas?: typeof box } = {}) => ({
  planning,
  season,
  areas: extra.areas ?? box,
  hasLayers: extra.hasLayers ?? false,
  plantOf: (id: string) => CATALOG.get(id),
  newId: ids(),
});

const boundsOf = (p: PlacementData) => footprintOf(CATALOG.get(p.plantId), p).boundsAt(p.positionX, p.positionY);

describe('optimizeSeason', () => {
  test('places the plants starting in the season by their ratio and marks the season planned', () => {
    const planning = Planning.empty(seasonsOf).addPlants(['tomaat', 'sla']).setRatio('spring', 'sla', 2);
    const outcome = optimizeSeason(input(planning, 'spring'));
    const placements = outcome.planning.placementsIn('spring');
    assert.ok(placements.some((p) => p.plantId === 'tomaat'));
    assert.ok(placements.some((p) => p.plantId === 'sla'));
    assert.equal(placements[0].id, 'id-1');
    assert.equal(placements[0].layerIndex, undefined);
    assert.equal(outcome.planning.statusOf('spring'), 'planned');
    assert.deepEqual(outcome.shares.map((s) => s.plantId), ['sla', 'tomaat']);
  });

  test('keeps carried plants where they are and places around them', () => {
    const spring = optimizeSeason(input(Planning.empty(seasonsOf).addPlants(['tomaat', 'boerenkool']), 'spring')).planning;
    const summer = optimizeSeason(input(spring, 'summer')).planning;
    const carried = summer.carriedPlacementsIn('summer');
    assert.deepEqual(carried, spring.placementsIn('spring').filter((p) => p.plantId === 'tomaat'));
    for (const own of summer.placementsIn('summer')) {
      for (const fixed of carried) {
        assert.ok(!boundsOverlap(boundsOf(own), boundsOf(fixed)));
      }
    }
  });

  test('keeps locked placements and does not overlap them', () => {
    const locked: PlacementData = { id: 'locked', plantId: 'sla', positionX: 50, positionY: 50, locked: true };
    const planning = Planning.empty(seasonsOf).addPlants(['sla']).applyPlacement('spring', [locked]);
    const placements = optimizeSeason(input(planning, 'spring')).planning.placementsIn('spring');
    assert.equal(placements[0], locked);
    for (const other of placements.slice(1)) {
      assert.ok(!boundsOverlap(boundsOf(other), boundsOf(locked)));
    }
  });

  test('given layers, placements name their layer', () => {
    const areas = [{ shape: 'rectangle', widthCm: 40, lengthCm: 40 } as const, { shape: 'rectangle', widthCm: 20, lengthCm: 20 } as const];
    const planning = Planning.empty(seasonsOf).addPlants(['sla']);
    const placements = optimizeSeason(input(planning, 'spring', { hasLayers: true, areas: areas as unknown as typeof box })).planning.placementsIn('spring');
    assert.deepEqual([...new Set(placements.map((p) => p.layerIndex))], [0, 1]);
  });

  test('gives a patch plant its patch size', () => {
    const planning = Planning.empty(seasonsOf).addPlants(['snijsla']);
    const [patch] = optimizeSeason(input(planning, 'spring')).planning.placementsIn('spring');
    assert.deepEqual([patch.patchWidthInCm, patch.patchHeightInCm, patch.patchRotationDeg], [100, 100, 0]);
    assert.equal(PlantFootprint.forPlant(CATALOG.get('snijsla')!, { widthCm: 100, heightCm: 100 }).areaCm2, 10000);
  });

  test('skips plants missing from the catalog', () => {
    const planning = Planning.empty(seasonsOf).addPlants(['onbekend', 'sla']);
    const outcome = optimizeSeason(input(planning, 'spring'));
    assert.ok(outcome.planning.placementsIn('spring').every((p) => p.plantId === 'sla'));
    assert.deepEqual(outcome.shares.map((s) => s.plantId), ['sla']);
  });
});
