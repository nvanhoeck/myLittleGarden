import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { plantingAreasOf } from './ComponentArea.ts';
import type { ComponentData } from '../../types/component.types.ts';

const component = (data: Record<string, unknown>): ComponentData => data as unknown as ComponentData;

describe('plantingAreasOf', () => {
  test('given a garden box, one rectangle without the border', () => {
    assert.deepEqual(plantingAreasOf(component({ type: 'gardenBox', widthInCm: 120, lengthInCm: 100, borderWidthInCm: 5 })), [
      { shape: 'rectangle', widthCm: 110, lengthCm: 90 },
    ]);
  });

  test('given a pot, one circle', () => {
    assert.deepEqual(plantingAreasOf(component({ type: 'pot', diameterInCm: 40, borderWidthInCm: 2 })), [
      { shape: 'circle', diameterCm: 36 },
    ]);
  });

  test('given a tower, one area per layer, the bottom layer first', () => {
    const areas = plantingAreasOf(component({ type: 'circularTower', diameterInCm: 60, borderWidthInCm: 0, numberOfLayers: 3 }));
    assert.equal(areas.length, 3);
    assert.deepEqual(areas[0], { shape: 'circle', diameterCm: 60 });
    assert.ok(areas[1].shape === 'circle' && areas[1].diameterCm < 60);
  });
});
