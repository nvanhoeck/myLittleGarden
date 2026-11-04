import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { plantingAreaOf, rearrangePlanting, startPlantingOver } from './ComponentPlanning.ts';
import type { ComponentPlanningInput } from './ComponentPlanning.ts';
import type { ComponentData, GardenBoxData } from '../../types/component.types.ts';
import type { PlacedPlantData, PlantData } from '../../types/plant.types.ts';
import type { GrowingPeriodData, PlantToPlanData } from '../../types/planning.types.ts';

const plant = (id: string, fields: Partial<PlantData>): PlantData =>
  ({
    id,
    spacingRadiusCm: 15,
    plantingStyle: 'individual',
    transplantWeeks: 0,
    directSowWeeks: null,
    daysToHarvest: { min: 30, max: 42 }, // 6 weeks
    companions: [],
    combatives: [],
    ...fields,
  }) as unknown as PlantData;

const catalog: Record<string, PlantData> = {
  sla: plant('sla', {}),
  tarwe: plant('tarwe', { plantingStyle: 'patch', spacingRadiusCm: 10 }),
};

// 130 x 70 box with a 5 cm border: the inner area is 120 x 60
const box = (fields: Partial<GardenBoxData> = {}): GardenBoxData => ({
  id: 'box-1',
  name: 'Bak',
  type: 'gardenBox',
  sunDirection: 'S',
  createdAt: '2026-01-01T00:00:00.000Z',
  borderWidthInCm: 5,
  widthInCm: 130,
  lengthInCm: 70,
  plants: [],
  plantsToPlan: [],
  ...fields,
});

const period = (startWeek: number, endWeek: number, year = 2026): GrowingPeriodData => ({
  year,
  startWeek,
  endWeek,
  method: 'transplant',
});

const placed = (id: string, xCm: number, yCm: number, fields: Partial<PlacedPlantData> = {}): PlacedPlantData => ({
  id,
  plantId: 'sla',
  positionX: xCm,
  positionY: yCm,
  placedAt: '2026-04-01T10:00:00.000Z',
  growingPeriod: period(18, 24),
  ...fields,
});

const toPlan = (id: string, fields: Partial<PlantToPlanData> = {}): PlantToPlanData => ({
  id,
  plantId: 'sla',
  year: 2026,
  ...fields,
});

const NOW = new Date('2026-11-04T09:00:00.000Z');

// Last spring frost 27 April = week 18, so lettuce is transplanted in week 17, 18 or 19
const input = (component: ComponentData, fields: Partial<ComponentPlanningInput> = {}): ComponentPlanningInput => ({
  component,
  year: 2026,
  plantOf: (plantId) => catalog[plantId],
  lastSpringFrost: { month: 4, day: 27 },
  now: NOW,
  ...fields,
});

describe('plantingAreaOf', () => {
  test('given a garden box, the area is the box minus its border on each side', () => {
    assert.deepEqual(plantingAreaOf(box()), { shape: 'rectangle', widthCm: 120, lengthCm: 60 });
  });

  test('given a pot, the area is a circle of the inner diameter', () => {
    const pot: ComponentData = { ...box(), type: 'pot', diameterInCm: 50 } as unknown as ComponentData;
    assert.deepEqual(plantingAreaOf(pot), { shape: 'circle', diameterCm: 40 });
  });

  test('given a layer of a rectangular tower, the area shrinks per layer like the canvas', () => {
    const tower = { ...box(), type: 'rectangularTower', widthInCm: 110, lengthInCm: 110, numberOfLayers: 3 } as unknown as ComponentData;
    const area = plantingAreaOf(tower, 1);
    assert.equal(area.shape, 'rectangle');
    assert.ok(area.shape === 'rectangle' && Math.abs(area.widthCm - 85) < 1e-9 && Math.abs(area.lengthCm - 85) < 1e-9);
  });

  test('given a layer of a circular tower, the area is a shrunken circle', () => {
    const tower = { ...box(), type: 'circularTower', diameterInCm: 110, numberOfLayers: 3 } as unknown as ComponentData;
    const area = plantingAreaOf(tower, 2);
    assert.ok(area.shape === 'circle' && Math.abs(area.diameterCm - 72.25) < 1e-9);
  });

  test('given a border wider than the component, the area is empty instead of negative', () => {
    assert.deepEqual(plantingAreaOf(box({ borderWidthInCm: 80 })), { shape: 'rectangle', widthCm: 0, lengthCm: 0 });
  });
});

describe('rearrangePlanting', () => {
  test('given two plants to plan, places them side by side in inner-area coordinates and empties the list', () => {
    const outcome = rearrangePlanting(input(box({ plantsToPlan: [toPlan('a'), toPlan('b')] })));
    assert.deepEqual(outcome.plantsToPlan, []);
    assert.deepEqual(
      outcome.plants.map((p) => [p.id, p.positionX, p.positionY]),
      [['a', 15, 15], ['b', 45, 15]],
    );
    assert.deepEqual(outcome.unplaced, []);
  });

  test('given a plant to plan, the new placed plant keeps its id and gets its period, placing time and layer', () => {
    const outcome = rearrangePlanting(input(box({ plantsToPlan: [toPlan('a', { layerIndex: undefined })] })));
    assert.deepEqual(outcome.plants[0], {
      id: 'a',
      plantId: 'sla',
      positionX: 15,
      positionY: 15,
      placedAt: NOW.toISOString(),
      growingPeriod: { year: 2026, startWeek: 17, endWeek: 23, method: 'transplant' },
    });
  });

  test('given a patch plant to plan, the new placed plant gets the patch size it was planned with', () => {
    const outcome = rearrangePlanting(input(box({ plantsToPlan: [toPlan('w', { plantId: 'tarwe' })] })));
    assert.deepEqual(
      [outcome.plants[0].patchWidthInCm, outcome.plants[0].patchHeightInCm, outcome.plants[0].patchRotationDeg],
      [20, 20, 0],
    );
  });

  test('given an unlocked placed plant, it may move but keeps its current period', () => {
    const existing = placed('old', 100, 40, { growingPeriod: period(30, 40) });
    const outcome = rearrangePlanting(input(box({ plants: [existing] })));
    assert.deepEqual(outcome.plants, [{ ...existing, positionX: 15, positionY: 15 }]);
  });

  test('given a locked plant, it never moves and the plants to plan go around it', () => {
    const locked = placed('locked', 15, 15, { locked: true });
    const outcome = rearrangePlanting(input(box({ plants: [locked], plantsToPlan: [toPlan('a')] })));
    assert.deepEqual(outcome.plants[0], locked);
    assert.deepEqual([outcome.plants[1].positionX, outcome.plants[1].positionY], [45, 15]);
  });

  test('given plants and plants to plan of another year or layer, leaves them untouched', () => {
    const lastYear = placed('last-year', 100, 40, { growingPeriod: period(18, 24, 2025) });
    const upstairs = placed('upstairs', 100, 40, { layerIndex: 1 });
    const nextYear = toPlan('next-year', { year: 2027 });
    const otherLayer = toPlan('other-layer', { layerIndex: 2 });
    const outcome = rearrangePlanting(
      input(box({ plants: [lastYear, upstairs], plantsToPlan: [nextYear, otherLayer] })),
    );
    assert.deepEqual(outcome.plants, [lastYear, upstairs]);
    assert.deepEqual(outcome.plantsToPlan, [nextYear, otherLayer]);
  });

  test('given a plant to plan that does not fit, it stays on the list with the reason', () => {
    const fullBox = box({ widthInCm: 40, lengthInCm: 40, plants: [placed('locked', 15, 15, { locked: true })] });
    const outcome = rearrangePlanting(input({ ...fullBox, plantsToPlan: [toPlan('a', { plantId: 'sla' })] }));
    assert.deepEqual(outcome.plantsToPlan, [toPlan('a')]);
    assert.deepEqual(outcome.unplaced, [{ id: 'a', reason: 'noSpace', weeks: { startWeek: 17, endWeek: 25 } }]);
  });

  test('given an unlocked placed plant that no longer fits, it goes back to the list of plants to plan', () => {
    const fullBox = box({
      widthInCm: 40,
      lengthInCm: 40,
      plants: [placed('locked', 15, 15, { locked: true }), placed('loose', 15, 15, { layerIndex: undefined })],
    });
    const outcome = rearrangePlanting(input(fullBox));
    assert.deepEqual(outcome.plants.map((p) => p.id), ['locked']);
    assert.deepEqual(outcome.plantsToPlan, [{ id: 'loose', plantId: 'sla', year: 2026 }]);
    assert.equal(outcome.unplaced[0].reason, 'noSpace');
  });

  test('given an unlocked placed plant with an invalid stored period, leaves it exactly as it is', () => {
    const broken = placed('broken', 100, 40, { growingPeriod: { year: 2026, startWeek: 30, endWeek: 20, method: 'transplant' } });
    const outcome = rearrangePlanting(input(box({ plants: [broken] })));
    assert.deepEqual(outcome.plants, [broken]);
    assert.deepEqual(outcome.plantsToPlan, []);
    assert.deepEqual(outcome.unplaced, []);
  });

  test('given a placed patch plant that goes back to the list, it keeps its patch size and rotation', () => {
    const patch = placed('patch', 15, 15, {
      plantId: 'tarwe',
      patchWidthInCm: 30,
      patchHeightInCm: 30,
      patchRotationDeg: 90,
    });
    const fullBox = box({ widthInCm: 40, lengthInCm: 40, plants: [placed('locked', 15, 15, { locked: true }), patch] });
    const outcome = rearrangePlanting(input(fullBox));
    assert.deepEqual(outcome.plantsToPlan, [
      { id: 'patch', plantId: 'tarwe', year: 2026, patchWidthInCm: 30, patchHeightInCm: 30, patchRotationDeg: 90 },
    ]);
  });

  test('given a patch plant on the list with a patch size, places it with that size and rotation', () => {
    const item = toPlan('w', { plantId: 'tarwe', patchWidthInCm: 40, patchHeightInCm: 20, patchRotationDeg: 90 });
    const outcome = rearrangePlanting(input(box({ plantsToPlan: [item] })));
    const plantedPatch = outcome.plants[0];
    assert.deepEqual(
      [plantedPatch.patchWidthInCm, plantedPatch.patchHeightInCm, plantedPatch.patchRotationDeg, plantedPatch.positionX, plantedPatch.positionY],
      [40, 20, 90, 10, 20], // rotated 90 degrees the patch claims 20 x 40
    );
  });

  test('given a plant unknown to the catalog or no frost date, it stays on the list without a planting window', () => {
    const unknown = rearrangePlanting(input(box({ plantsToPlan: [toPlan('x', { plantId: 'verdwenen' })] })));
    assert.deepEqual(unknown.unplaced, [{ id: 'x', reason: 'noPlantingWindow' }]);
    const noFrost = rearrangePlanting(input(box({ plantsToPlan: [toPlan('a')] }), { lastSpringFrost: null }));
    assert.deepEqual(noFrost.unplaced, [{ id: 'a', reason: 'noPlantingWindow' }]);
    assert.deepEqual(noFrost.plantsToPlan, [toPlan('a')]);
  });

  test('given a tower layer, only plans that layer and gives new plants that layer', () => {
    const tower = {
      ...box({ plantsToPlan: [toPlan('ground', { layerIndex: 0 }), toPlan('top', { layerIndex: 1 })] }),
      type: 'rectangularTower',
      numberOfLayers: 2,
    } as unknown as ComponentData;
    const outcome = rearrangePlanting(input(tower, { layerIndex: 1 }));
    assert.deepEqual(outcome.plants.map((p) => [p.id, p.layerIndex]), [['top', 1]]);
    assert.deepEqual(outcome.plantsToPlan.map((p) => p.id), ['ground']);
  });
});

describe('startPlantingOver', () => {
  test('given an unlocked placed plant, it gets a new period from the catalog options', () => {
    const existing = placed('old', 100, 40, { growingPeriod: period(30, 40) });
    const outcome = startPlantingOver(input(box({ plants: [existing] })));
    assert.deepEqual(outcome.plants[0].growingPeriod, { year: 2026, startWeek: 17, endWeek: 23, method: 'transplant' });
    assert.deepEqual([outcome.plants[0].positionX, outcome.plants[0].positionY], [15, 15]);
    assert.equal(outcome.plants[0].placedAt, existing.placedAt);
  });

  test('given an unlocked placed plant unknown to the catalog, keeps it in place and plans around it', () => {
    const unknown = placed('unknown', 15, 15, { plantId: 'verdwenen', growingPeriod: period(15, 30) });
    const outcome = startPlantingOver(input(box({ plants: [unknown], plantsToPlan: [toPlan('a')] })));
    assert.deepEqual(outcome.plants[0], unknown);
    assert.deepEqual([outcome.plants[1].id, outcome.plants[1].positionX, outcome.plants[1].positionY], ['a', 45, 15]);
    assert.deepEqual(outcome.plantsToPlan, []);
  });

  test('given no frost date, placed plants are not destroyed', () => {
    const existing = placed('old', 100, 40);
    const outcome = startPlantingOver(input(box({ plants: [existing] }), { lastSpringFrost: null }));
    assert.deepEqual(outcome.plants, [existing]);
    assert.deepEqual(outcome.plantsToPlan, []);
  });

  test('given a locked plant, it keeps its place and period', () => {
    const locked = placed('locked', 100, 40, { locked: true, growingPeriod: period(30, 40) });
    const outcome = startPlantingOver(input(box({ plants: [locked] })));
    assert.deepEqual(outcome.plants, [locked]);
  });
});
