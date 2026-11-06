import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { planningDataSchema } from './planningSchema.ts';

const emptySeason = { ratios: {}, placements: [], status: 'notPlanned' };
const valid = {
  plants: ['sla'],
  plantings: [
    { id: 'sla-spring', plantId: 'sla', startSeason: 'spring', fixedSeasons: ['spring'] },
    { id: 'sla-summer', plantId: 'sla', startSeason: 'summer' },
  ],
  seasons: {
    spring: {
      ratios: { 'sla-spring': 2 },
      placements: [{ id: 'p1', plantId: 'sla', plantingId: 'sla-spring', positionX: 25, positionY: 25 }],
      status: 'planned',
    },
    summer: { ...emptySeason, ratios: { 'sla-summer': 1 } },
    autumn: emptySeason,
    winter: emptySeason,
  },
};

describe('planningDataSchema', () => {
  test('accepts a planning with plantings', () => {
    assert.ok(planningDataSchema.safeParse(valid).success);
  });

  test('rejects a placement without planting id, a planting with an unknown season, and a missing plantings list', () => {
    const { plantingId: _p, ...placement } = valid.seasons.spring.placements[0];
    assert.equal(planningDataSchema.safeParse({ ...valid, seasons: { ...valid.seasons, spring: { ...valid.seasons.spring, placements: [placement] } } }).success, false);
    assert.equal(planningDataSchema.safeParse({ ...valid, plantings: [{ id: 'x', plantId: 'sla', startSeason: 'lente' }] }).success, false);
    const { plantings: _q, ...withoutPlantings } = valid;
    assert.equal(planningDataSchema.safeParse(withoutPlantings).success, false);
  });
});
