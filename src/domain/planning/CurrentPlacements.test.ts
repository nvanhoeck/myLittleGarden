import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { placementsGrowingOn } from './CurrentPlacements.ts';
import { Planning } from './Planning.ts';
import type { Season } from '../../types/planning.types.ts';

const seasonsOf = (id: string): readonly Season[] => (id === 'tomaat' ? ['spring', 'summer'] : ['summer']);
const planning = Planning.empty(seasonsOf)
  .addPlants(['tomaat', 'boerenkool'])
  .applyPlacement('spring', [{ id: 't1', plantId: 'tomaat', positionX: 1, positionY: 1 }])
  .applyPlacement('summer', [{ id: 'b1', plantId: 'boerenkool', positionX: 2, positionY: 2 }]);
const component = { plannings: { '2026': planning.toData() } };

describe('placementsGrowingOn', () => {
  test('gives the carried and own placements of the season the day falls in', () => {
    assert.deepEqual(placementsGrowingOn(component, new Date(2026, 6, 1), () => seasonsOf).map((p) => p.id), ['t1', 'b1']);
    assert.deepEqual(placementsGrowingOn(component, new Date(2026, 3, 1), () => seasonsOf).map((p) => p.id), ['t1']);
  });

  test('given January, it looks at the winter of the planning year before', () => {
    assert.deepEqual(placementsGrowingOn(component, new Date(2027, 0, 5), () => seasonsOf), []);
  });

  test('given a year without planning, nothing', () => {
    assert.deepEqual(placementsGrowingOn(component, new Date(2030, 6, 1), () => seasonsOf), []);
  });
});
