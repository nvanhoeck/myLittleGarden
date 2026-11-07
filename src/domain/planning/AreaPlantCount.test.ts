import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { plantCountOfArea, plantCountOfAreas } from './AreaPlantCount.ts';
import type { ComponentData } from '../../types/component.types.ts';
import type { AreaData } from '../../types/planning.types.ts';
import type { FootprintTraits } from './PlantFootprint.ts';

const box: ComponentData = {
  id: 'box',
  name: 'Bak',
  type: 'gardenBox',
  sunDirection: 'S',
  createdAt: '2026-01-01T00:00:00.000Z',
  borderWidthInCm: 0,
  plannings: {},
  widthInCm: 200,
  lengthInCm: 100,
};
const PLANTS: Record<string, FootprintTraits> = {
  ui: { spacingRadiusCm: 5, plantingStyle: 'individual' },
  spinazie: { spacingRadiusCm: 5, plantingStyle: 'patch' },
};
const area = (plantId: string, xCm: number): AreaData => ({
  id: plantId,
  plantingId: `${plantId}-spring`,
  plantId,
  pieces: [{ xCm, yCm: 0, widthCm: 100, lengthCm: 50 }],
});

describe('plantCountOfArea', () => {
  test('counts the grid of an individual planting; a sown one has no count', () => {
    assert.equal(plantCountOfArea(box, area('ui', 0), PLANTS.ui), 50);
    assert.equal(plantCountOfArea(box, area('spinazie', 100), PLANTS.spinazie), null);
  });

  test('a plant missing from the catalog counts nothing', () => {
    assert.equal(plantCountOfArea(box, area('appel', 0), undefined), 0);
  });
});

describe('plantCountOfAreas', () => {
  test('sums the plant counts of the areas; sown areas add nothing', () => {
    assert.equal(plantCountOfAreas(box, [area('ui', 0), area('spinazie', 100)], (id) => PLANTS[id]), 50);
  });
});
