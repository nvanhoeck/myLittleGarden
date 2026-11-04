import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasAnythingToPlan,
  plannedYearsOf,
  plantsGrowingIn,
  plantsInScope,
  plantsSharingWeeksWith,
  plantsToPlanIn,
  timeZonesOf,
} from './PlanningQueries.ts';
import { PlantingWeek } from './PlantingWeek.ts';
import type { GardenBoxData } from '../../types/component.types.ts';
import type { PlacedPlantData } from '../../types/plant.types.ts';
import type { PlantToPlanData } from '../../types/planning.types.ts';

const placed = (id: string, year: number, startWeek: number, endWeek: number, fields: Partial<PlacedPlantData> = {}): PlacedPlantData => ({
  id,
  plantId: 'sla',
  positionX: 15,
  positionY: 15,
  placedAt: '2026-04-01T10:00:00.000Z',
  growingPeriod: { year, startWeek, endWeek, method: 'transplant' },
  ...fields,
});

const toPlan = (id: string, year: number, layerIndex?: number): PlantToPlanData => ({
  id,
  plantId: 'sla',
  year,
  ...(layerIndex !== undefined ? { layerIndex } : {}),
});

const box = (plants: PlacedPlantData[], plantsToPlan: PlantToPlanData[] = []): GardenBoxData => ({
  id: 'box-1',
  name: 'Bak',
  type: 'gardenBox',
  sunDirection: 'S',
  createdAt: '2026-01-01T00:00:00.000Z',
  borderWidthInCm: 5,
  widthInCm: 130,
  lengthInCm: 70,
  plants,
  plantsToPlan,
});

const ids = (items: readonly { id: string }[]): string[] => items.map((item) => item.id);

describe('plantsInScope', () => {
  test('given plants of several years and layers, returns the plants of the year on the layer', () => {
    const component = box([
      placed('this-year', 2026, 10, 20),
      placed('last-year', 2025, 10, 20),
      placed('ground-explicit', 2026, 10, 20, { layerIndex: 0 }),
      placed('upstairs', 2026, 10, 20, { layerIndex: 1 }),
    ]);
    assert.deepEqual(ids(plantsInScope(component, 2026)), ['this-year', 'ground-explicit']);
    assert.deepEqual(ids(plantsInScope(component, 2026, 1)), ['upstairs']);
  });
});

describe('plantsGrowingIn', () => {
  test('given a week, returns the plants of that layer whose period includes it', () => {
    const component = box([
      placed('spring', 2026, 10, 20),
      placed('summer', 2026, 21, 30),
      placed('upstairs', 2026, 10, 20, { layerIndex: 1 }),
    ]);
    assert.deepEqual(ids(plantsGrowingIn(component, PlantingWeek.of(2026, 20))), ['spring']);
    assert.deepEqual(ids(plantsGrowingIn(component, PlantingWeek.of(2026, 21))), ['summer']);
    assert.deepEqual(ids(plantsGrowingIn(component, PlantingWeek.of(2027, 15))), []);
  });
});

describe('timeZonesOf', () => {
  test('given plants on two layers, the zones of one layer only follow its own plants', () => {
    const component = box([placed('spring', 2026, 10, 20), placed('upstairs', 2026, 15, 30, { layerIndex: 1 })]);
    assert.deepEqual(timeZonesOf(component, 2026), [
      { startWeek: 1, endWeek: 9, plantIds: [] },
      { startWeek: 10, endWeek: 20, plantIds: ['spring'] },
      { startWeek: 21, endWeek: 53, plantIds: [] },
    ]);
  });
});

describe('plantsToPlanIn', () => {
  test('given plants to plan of several years and layers, returns those of the year on the layer', () => {
    const component = box([], [toPlan('a', 2026), toPlan('b', 2027), toPlan('c', 2026, 1), toPlan('d', 2026, 0)]);
    assert.deepEqual(ids(plantsToPlanIn(component, 2026)), ['a', 'd']);
    assert.deepEqual(ids(plantsToPlanIn(component, 2026, 1)), ['c']);
  });
});

describe('hasAnythingToPlan', () => {
  test('given an empty year, there is nothing to plan', () => {
    assert.equal(hasAnythingToPlan(box([placed('last-year', 2025, 10, 20)]), 2026), false);
  });

  test('given only locked plants, there is nothing to plan', () => {
    assert.equal(hasAnythingToPlan(box([placed('locked', 2026, 10, 20, { locked: true })]), 2026), false);
  });

  test('given an unlocked plant or a plant to plan in the year, there is something to plan', () => {
    assert.equal(hasAnythingToPlan(box([placed('loose', 2026, 10, 20)]), 2026), true);
    assert.equal(hasAnythingToPlan(box([], [toPlan('a', 2026)]), 2026), true);
  });
});

describe('plannedYearsOf', () => {
  test('gives every year with placed plants or plants to plan, sorted and once each', () => {
    const component = box(
      [placed('a', 2026, 10, 20), placed('b', 2024, 10, 20), placed('c', 2026, 30, 40, { layerIndex: 1 })],
      [toPlan('x', 2027), toPlan('y', 2024)],
    );
    assert.deepEqual(plannedYearsOf(component), [2024, 2026, 2027]);
  });
});

describe('plantsSharingWeeksWith', () => {
  test('gives the other plants on the layer that are in the ground during a week of the given plants', () => {
    const scope = placed('scope', 2026, 18, 24);
    const component = box([
      scope,
      placed('before', 2026, 10, 17),
      placed('overlapping', 2026, 24, 30),
      placed('upstairs', 2026, 18, 24, { layerIndex: 1 }),
      placed('last-year', 2025, 18, 24),
    ]);
    assert.deepEqual(ids(plantsSharingWeeksWith(component, [scope])), ['overlapping']);
  });
});
