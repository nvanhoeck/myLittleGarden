import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGardenSnapshot, snapshotPlantsOf } from './buildGardenSnapshot.ts';
import type { ComponentData } from '../../types/component.types.ts';
import type { AreaData } from '../../types/planning.types.ts';

const area = (overrides: Partial<AreaData> = {}): AreaData => ({
  id: 'area-1',
  plantingId: 'sla-spring',
  plantId: 'sla',
  pieces: [{ xCm: 10, yCm: 20, widthCm: 40, lengthCm: 60 }],
  ...overrides,
});

describe('snapshotPlantsOf', () => {
  test('given one piece, one plant at its centre with the piece as patch size', () => {
    assert.deepEqual(snapshotPlantsOf(area()), [{
      id: 'area-1-0',
      plantId: 'sla',
      positionXInCm: 30,
      positionYInCm: 50,
      layerIndex: null,
      locked: false,
      patchWidthInCm: 40,
      patchHeightInCm: 60,
      patchRotationDeg: null,
    }]);
  });

  test('given several pieces, one plant per piece with its own centre, size, layer and lock', () => {
    const plants = snapshotPlantsOf(area({
      layerIndex: 1,
      locked: true,
      pieces: [{ xCm: 0, yCm: 0, widthCm: 20, lengthCm: 20 }, { xCm: 50, yCm: 0, widthCm: 30, lengthCm: 10 }],
    }));
    assert.deepEqual(plants.map((p) => [p.id, p.positionXInCm, p.positionYInCm, p.patchWidthInCm, p.patchHeightInCm, p.layerIndex, p.locked]), [
      ['area-1-0', 10, 10, 20, 20, 1, true],
      ['area-1-1', 65, 5, 30, 10, 1, true],
    ]);
  });

  test('given an area without pieces, no plants', () => {
    assert.deepEqual(snapshotPlantsOf(area({ pieces: [] })), []);
  });
});

describe('buildGardenSnapshot', () => {
  test('lists a plant per piece per component and skips areas without pieces', () => {
    const component = { id: 'box', name: 'Bak', type: 'gardenBox', widthInCm: 100, lengthInCm: 100, borderWidthInCm: 5, createdAt: '2026-01-01' } as unknown as ComponentData;
    const areas = [
      area({ pieces: [{ xCm: 0, yCm: 0, widthCm: 20, lengthCm: 20 }, { xCm: 20, yCm: 0, widthCm: 20, lengthCm: 20 }] }),
      area({ id: 'empty', pieces: [] }),
    ];
    const snapshot = buildGardenSnapshot({ sunDirection: null, springFrostDate: null, fallFrostDate: null }, [component], () => areas);
    assert.deepEqual(snapshot.components[0].plants.map((p) => p.id), ['area-1-0', 'area-1-1']);
  });
});
