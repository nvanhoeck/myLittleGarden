import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { planningDataSchema } from './planningSchema.ts';

const emptySeason = { ratios: {}, placements: [], status: 'notPlanned' };
const valid = {
  plants: ['tomaat'],
  seasons: {
    spring: { ratios: { tomaat: 2 }, placements: [{ id: 'p1', plantId: 'tomaat', positionX: 25, positionY: 25, locked: true }], status: 'planned' },
    summer: emptySeason,
    autumn: emptySeason,
    winter: emptySeason,
  },
};

describe('planningDataSchema', () => {
  test('accepts a valid planning', () => {
    assert.ok(planningDataSchema.safeParse(valid).success);
  });

  test('rejects a ratio below 1 or not whole, an unknown status and a missing season', () => {
    const withRatio = (ratio: number) => ({ ...valid, seasons: { ...valid.seasons, spring: { ...valid.seasons.spring, ratios: { tomaat: ratio } } } });
    assert.equal(planningDataSchema.safeParse(withRatio(0)).success, false);
    assert.equal(planningDataSchema.safeParse(withRatio(1.5)).success, false);
    assert.equal(planningDataSchema.safeParse({ ...valid, seasons: { ...valid.seasons, summer: { ...emptySeason, status: 'done' } } }).success, false);
    const { winter: _winter, ...threeSeasons } = valid.seasons;
    assert.equal(planningDataSchema.safeParse({ ...valid, seasons: threeSeasons }).success, false);
  });
});
