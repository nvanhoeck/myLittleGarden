import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { areasGrowingOn } from './CurrentAreas.ts';
import { Planning } from './Planning.ts';
import type { PlantingCalendar } from './PlantCalendar.ts';

const calendar: PlantingCalendar = {
  hasCalendar: () => true,
  reachableSeasons: (id) => (id === 'tomaat' ? ['spring'] : ['summer']),
  growingSeasons: (id, season) => (id === 'tomaat' ? (season === 'spring' ? ['spring', 'summer'] : []) : season === 'summer' ? ['summer'] : []),
};
const piece = { xCm: 0, yCm: 0, widthCm: 10, lengthCm: 10 };
const planning = Planning.from(undefined, calendar)
  .addPlants(['tomaat', 'boerenkool'])
  .applyAreas('spring', [{ id: 't1', plantId: 'tomaat', plantingId: 'tomaat-spring', pieces: [piece] }])
  .applyAreas('summer', [{ id: 'b1', plantId: 'boerenkool', plantingId: 'boerenkool-summer', pieces: [{ ...piece, xCm: 20 }] }]);
const component = { plannings: { '2026': planning.toData() } };

describe('areasGrowingOn', () => {
  test('gives the carried and own areas of the season the day falls in', () => {
    assert.deepEqual(areasGrowingOn(component, new Date(2026, 6, 1), () => calendar).map((a) => a.id), ['t1', 'b1']);
    assert.deepEqual(areasGrowingOn(component, new Date(2026, 3, 1), () => calendar).map((a) => a.id), ['t1']);
  });

  test('given January, it looks at the winter of the planning year before', () => {
    assert.deepEqual(areasGrowingOn(component, new Date(2027, 0, 5), () => calendar), []);
  });

  test('given a year without planning, nothing', () => {
    assert.deepEqual(areasGrowingOn(component, new Date(2030, 6, 1), () => calendar), []);
  });
});
