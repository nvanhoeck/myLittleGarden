import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { planningDataSchema } from './planningSchema.ts';

const emptySeason = { ratios: {}, areas: [], status: 'notPlanned' };
const slaArea = { id: 'a1', plantId: 'sla', plantingId: 'sla-spring', pieces: [{ xCm: 0, yCm: 0, widthCm: 50, lengthCm: 40 }] };
const valid = {
  plants: ['sla'],
  plantings: [
    { id: 'sla-spring', plantId: 'sla', startSeason: 'spring', fixedSeasons: ['spring'] },
    { id: 'sla-summer', plantId: 'sla', startSeason: 'summer' },
  ],
  seasons: {
    spring: {
      ratios: { 'sla-spring': 2 },
      areas: [slaArea],
      status: 'planned',
    },
    summer: { ...emptySeason, ratios: { 'sla-summer': 1 } },
    autumn: emptySeason,
    winter: emptySeason,
  },
};

const withSpringAreas = (areas: unknown[]) => ({ ...valid, seasons: { ...valid.seasons, spring: { ...valid.seasons.spring, areas } } });

describe('planningDataSchema', () => {
  test('accepts a planning with plantings', () => {
    assert.ok(planningDataSchema.safeParse(valid).success);
  });

  test('accepts an area on a layer with up to three pieces, locked or not', () => {
    const tower = { ...slaArea, layerIndex: 1, locked: true, pieces: [slaArea.pieces[0], slaArea.pieces[0], slaArea.pieces[0]] };
    assert.ok(planningDataSchema.safeParse(withSpringAreas([tower])).success);
  });

  test('rejects an area without pieces, with four pieces, with a piece without positive size, or without planting id', () => {
    const p = slaArea.pieces[0];
    const { plantingId: _p, ...withoutPlanting } = slaArea;
    for (const area of [
      { ...slaArea, pieces: [] },
      { ...slaArea, pieces: [p, p, p, p] },
      { ...slaArea, pieces: [{ ...p, widthCm: 0 }] },
      { ...slaArea, pieces: [{ ...p, lengthCm: -1 }] },
      withoutPlanting,
    ]) {
      assert.equal(planningDataSchema.safeParse(withSpringAreas([area])).success, false);
    }
  });

  test('rejects a season with placements instead of areas', () => {
    const { areas: _a, ...spring } = valid.seasons.spring;
    assert.equal(planningDataSchema.safeParse({ ...valid, seasons: { ...valid.seasons, spring: { ...spring, placements: [] } } }).success, false);
  });

  test('rejects a planting with an unknown season, and a missing plantings list', () => {
    assert.equal(planningDataSchema.safeParse({ ...valid, plantings: [{ id: 'x', plantId: 'sla', startSeason: 'lente' }] }).success, false);
    const { plantings: _q, ...withoutPlantings } = valid;
    assert.equal(planningDataSchema.safeParse(withoutPlantings).success, false);
  });
});
