import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAreaCanvas, snappedResize } from './areaCanvasViewModel.ts';
import type { AreaCanvasInput, AreaCanvasPlant } from './areaCanvasViewModel.ts';
import type { AreaData, AreaPiece } from '../../types/planning.types.ts';
import type { PlantRelations } from '../../domain/planning/PlantRelations.ts';

const t = (key: string, options?: Record<string, unknown>): string => (options ? `${key} ${JSON.stringify(options)}` : key);
const PLANTS: Record<string, AreaCanvasPlant> = {
  ui: { spacingRadiusCm: 5, plantingStyle: 'individual', category: 'wortelgroenten' },
  tomaat: { spacingRadiusCm: 25, plantingStyle: 'individual', category: 'vruchtgroenten' },
  spinazie: { spacingRadiusCm: 5, plantingStyle: 'patch', sowingSpacingCm: 10, category: 'bladgroenten' },
  basilicum: { spacingRadiusCm: 10, plantingStyle: 'individual', category: 'kruiden' },
};
const relations: PlantRelations = (a, b) => {
  const pair = [a, b].sort().join('|');
  if (pair === 'basilicum|tomaat') return 'companion';
  if (pair === 'tomaat|ui') return 'combative';
  return 'neutral';
};
const piece = (xCm: number, yCm: number, widthCm: number, lengthCm: number): AreaPiece => ({ xCm, yCm, widthCm, lengthCm });
const area = (id: string, plantId: string, pieces: AreaPiece[], locked?: boolean): AreaData => ({
  id,
  plantingId: `${plantId}-spring`,
  plantId,
  pieces,
  ...(locked === undefined ? {} : { locked }),
});

function canvasOf(own: AreaData[], carried: AreaData[] = []): ReturnType<typeof buildAreaCanvas> {
  const input: AreaCanvasInput = {
    own,
    carried,
    layer: { shape: 'rectangle', widthCm: 1000, lengthCm: 1000 },
    plantOf: (id) => PLANTS[id],
    nameOf: (id) => id.toUpperCase(),
    relations,
    carriedLabelOf: () => 'uit lente',
    t,
  };
  return buildAreaCanvas(input);
}

describe('buildAreaCanvas labels', () => {
  test('an individual planting shows its name and plant count, a sown one "zaaivlak"', () => {
    const { areas } = canvasOf([area('a', 'ui', [piece(0, 0, 100, 100)]), area('b', 'spinazie', [piece(200, 0, 100, 100)])]);
    assert.equal(areas[0].count, 100);
    assert.equal(areas[0].label, 'componentDetail.areaCount {"name":"UI","count":100}');
    assert.equal(areas[1].count, null);
    assert.equal(areas[1].label, 'componentDetail.areaSown {"name":"SPINAZIE"}');
  });

  test('counts over every piece of an area', () => {
    const { areas } = canvasOf([area('a', 'tomaat', [piece(0, 0, 100, 100), piece(100, 0, 50, 100)])]);
    assert.equal(areas[0].count, 4 + 2);
    assert.deepEqual(areas[0].rects, [piece(0, 0, 100, 100), piece(100, 0, 50, 100)]);
  });
});

describe('buildAreaCanvas icons', () => {
  test('draws one icon per plant when the area holds at most 50 plants', () => {
    const { areas } = canvasOf([area('a', 'tomaat', [piece(0, 0, 250, 250)])]);
    assert.equal(areas[0].count, 25);
    assert.equal(areas[0].icons.length, 25);
    assert.deepEqual(areas[0].icons[0], { xCm: 25, yCm: 25 });
    assert.equal(areas[0].iconSizeCm, 50);
  });

  test('draws no icons above 50 plants, and none for a sown area', () => {
    const { areas } = canvasOf([area('a', 'ui', [piece(0, 0, 100, 60)]), area('b', 'spinazie', [piece(0, 100, 40, 40)])]);
    assert.equal(areas[0].count, 60);
    assert.deepEqual(areas[0].icons, []);
    assert.deepEqual(areas[1].icons, []);
  });

  test('exactly 50 plants are still drawn', () => {
    const { areas } = canvasOf([area('a', 'ui', [piece(0, 0, 100, 50)])]);
    assert.equal(areas[0].icons.length, 50);
  });
});

describe('buildAreaCanvas carried and locked', () => {
  test('carried areas come first, dimmed with their label; own areas are not', () => {
    const { areas } = canvasOf([area('own', 'ui', [piece(0, 0, 50, 50)], true)], [area('old', 'tomaat', [piece(100, 0, 100, 100)])]);
    assert.deepEqual(areas.map((a) => [a.id, a.dimmed, a.carriedLabel, a.locked]), [
      ['old', true, 'uit lente', false],
      ['own', false, null, true],
    ]);
  });

  test('resizing snaps to the plant spacing: twice the spacing radius, or the minimum patch side', () => {
    const { areas } = canvasOf([area('a', 'tomaat', [piece(0, 0, 100, 100)]), area('b', 'spinazie', [piece(200, 0, 40, 40)])]);
    assert.deepEqual(areas.map((a) => a.resizeStepCm), [50, 20]);
  });
});

describe('buildAreaCanvas relations at edges', () => {
  test('areas sharing an edge (within 5 cm) show their companion or combative relation once', () => {
    const { areas, edgeMarkers } = canvasOf([
      area('t', 'tomaat', [piece(0, 0, 100, 100)]),
      area('b', 'basilicum', [piece(100, 0, 60, 100)]),
      area('u', 'ui', [piece(0, 104, 100, 50)]),
    ]);
    const byId = new Map(areas.map((a) => [a.id, a.relationsAtEdges]));
    assert.deepEqual(byId.get('t'), [{ otherAreaId: 'b', kind: 'companion' }, { otherAreaId: 'u', kind: 'combative' }]);
    assert.deepEqual(byId.get('b'), [{ otherAreaId: 't', kind: 'companion' }]);
    assert.deepEqual(byId.get('u'), [{ otherAreaId: 't', kind: 'combative' }]);
    assert.deepEqual(edgeMarkers, [
      { key: 't|b', kind: 'companion', xCm: 100, yCm: 50 },
      { key: 't|u', kind: 'combative', xCm: 50, yCm: 102 },
    ]);
  });

  test('areas further apart than 5 cm, touching only at a corner, or neutral show nothing', () => {
    const { areas, edgeMarkers } = canvasOf([
      area('t', 'tomaat', [piece(0, 0, 100, 100)]),
      area('b', 'basilicum', [piece(106, 0, 60, 100)]),
      area('u', 'ui', [piece(100, 100, 50, 50)]),
      area('s', 'spinazie', [piece(0, 100, 100, 50)]),
    ]);
    assert.ok(areas.every((a) => a.relationsAtEdges.length === 0));
    assert.deepEqual(edgeMarkers, []);
  });

  test('a carried area next to an own area shows its relation too', () => {
    const { edgeMarkers } = canvasOf([area('b', 'basilicum', [piece(100, 0, 60, 100)])], [area('t', 'tomaat', [piece(0, 0, 100, 100)])]);
    assert.deepEqual(edgeMarkers.map((m) => [m.key, m.kind]), [['t|b', 'companion']]);
  });
});

describe('snappedResize', () => {
  const bounds = { widthCm: 300, lengthCm: 200 };

  test('rounds the dragged size to whole steps, at least one step', () => {
    assert.deepEqual(snappedResize(piece(0, 0, 100, 100), 174, 20, 50, bounds), { widthCm: 150, lengthCm: 50 });
  });

  test('stays inside the layer', () => {
    assert.deepEqual(snappedResize(piece(120, 0, 100, 100), 400, 400, 50, bounds), { widthCm: 150, lengthCm: 200 });
  });

  test('is null when the snapped size is the current size', () => {
    assert.equal(snappedResize(piece(0, 0, 100, 100), 110, 90, 50, bounds), null);
  });
});
