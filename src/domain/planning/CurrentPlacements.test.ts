import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { placementsGrowingOn } from './CurrentPlacements.ts';
import { Planning } from './Planning.ts';
import type { PlantingCalendar } from './PlantCalendar.ts';

const calendar: PlantingCalendar = {
  hasCalendar: () => true,
  reachableSeasons: (id) => (id === 'tomaat' ? ['spring'] : ['summer']),
  growingSeasons: (id, season) => (id === 'tomaat' ? (season === 'spring' ? ['spring', 'summer'] : []) : season === 'summer' ? ['summer'] : []),
};
const planning = Planning.from(undefined, calendar)
  .addPlants(['tomaat', 'boerenkool'])
  .applyPlacement('spring', [{ id: 't1', plantId: 'tomaat', plantingId: 'tomaat-spring', positionX: 1, positionY: 1 }])
  .applyPlacement('summer', [{ id: 'b1', plantId: 'boerenkool', plantingId: 'boerenkool-summer', positionX: 2, positionY: 2 }]);
const component = { plannings: { '2026': planning.toData() } };

describe('placementsGrowingOn', () => {
  test('gives the carried and own placements of the season the day falls in', () => {
    assert.deepEqual(placementsGrowingOn(component, new Date(2026, 6, 1), () => calendar).map((p) => p.id), ['t1', 'b1']);
    assert.deepEqual(placementsGrowingOn(component, new Date(2026, 3, 1), () => calendar).map((p) => p.id), ['t1']);
  });

  test('given January, it looks at the winter of the planning year before', () => {
    assert.deepEqual(placementsGrowingOn(component, new Date(2027, 0, 5), () => calendar), []);
  });

  test('given a year without planning, nothing', () => {
    assert.deepEqual(placementsGrowingOn(component, new Date(2030, 6, 1), () => calendar), []);
  });
});
