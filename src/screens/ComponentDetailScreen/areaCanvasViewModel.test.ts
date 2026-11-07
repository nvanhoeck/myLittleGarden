import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAreaCanvas, iconPxFor, resizeHandlePoint, roadWidthFrom, snappedResize } from './areaCanvasViewModel.ts';
import type { AreaCanvasInput, AreaCanvasPlant } from './areaCanvasViewModel.ts';
import type { AreaData, AreaPiece } from '../../types/planning.types.ts';
import type { RoadData } from '../../types/component.types.ts';
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

describe('buildAreaCanvas warnings', () => {
  test('areas that overlap each other, also a carried one, are flagged; touching ones are not', () => {
    const { areas } = canvasOf(
      [area('a', 'ui', [piece(0, 0, 100, 100)]), area('b', 'tomaat', [piece(50, 50, 100, 100)]), area('c', 'ui', [piece(150, 0, 50, 50)])],
      [area('old', 'spinazie', [piece(400, 0, 100, 100)]), area('d', 'ui', [piece(0, 300, 10, 10)])],
    );
    const own = canvasOf([area('e', 'ui', [piece(410, 10, 20, 20)])], [area('old', 'spinazie', [piece(400, 0, 100, 100)])]).areas;
    assert.deepEqual(areas.map((a) => [a.id, a.overlaps, a.outsideLayer]), [
      ['old', false, false],
      ['d', false, false],
      ['a', true, false],
      ['b', true, false],
      ['c', false, false],
    ]);
    assert.deepEqual(own.map((a) => [a.id, a.overlaps]), [['old', true], ['e', true]]);
    assert.equal(areas[2].warningLabel, 'componentDetail.areaWarningOverlap');
    assert.equal(areas[4].warningLabel, null);
  });

  test('an area with a piece outside the layer, e.g. after shrinking the component, is flagged', () => {
    const { areas } = canvasOf([area('a', 'ui', [piece(0, 0, 100, 100), piece(950, 0, 100, 100)]), area('b', 'ui', [piece(900, 900, 100, 100)])]);
    assert.deepEqual(areas.map((a) => [a.id, a.overlaps, a.outsideLayer, a.warningLabel]), [
      ['a', false, true, 'componentDetail.areaWarningOutside'],
      ['b', false, false, null],
    ]);
  });

  test('overlapping and outside: both reasons in the warning', () => {
    const { areas } = canvasOf([area('a', 'ui', [piece(-10, 0, 100, 100)]), area('b', 'ui', [piece(50, 0, 100, 100)])]);
    assert.equal(areas[0].warningLabel, 'componentDetail.areaWarningOverlap · componentDetail.areaWarningOutside');
  });
});

describe('snappedResize', () => {
  const bounds = { widthCm: 300, lengthCm: 200 };

  test('adds the drag rounded to whole steps to the current size, at least one step', () => {
    assert.deepEqual(snappedResize(piece(0, 0, 100, 100), 74, -80, 50, bounds), { widthCm: 150, lengthCm: 50 });
  });

  test('stays inside the layer', () => {
    assert.deepEqual(snappedResize(piece(120, 0, 100, 100), 300, 300, 50, bounds), { widthCm: 150, lengthCm: 200 });
  });

  test('is null when the drag rounds to no step', () => {
    assert.equal(snappedResize(piece(0, 0, 100, 100), 10, -10, 50, bounds), null);
  });

  test('a size that is not a whole number of steps is kept when the drag is zero', () => {
    assert.equal(snappedResize(piece(0, 0, 130, 70), 0, 0, 50, bounds), null);
  });

  test('a drag of one step adds one step to a size that is not a whole number of steps', () => {
    assert.deepEqual(snappedResize(piece(0, 0, 130, 70), 50, 0, 50, bounds), { widthCm: 180, lengthCm: 70 });
  });
});

describe('icon cap and floor', () => {
  test('at most 300 icons on the canvas; the areas with the most plants lose theirs first', () => {
    // 7 areas of 50 ui (100 x 50 cm, spacing 10) and one of 25 tomaten
    const own = Array.from({ length: 7 }, (_, i) => area(`u${i}`, 'ui', [piece(0, i * 60, 100, 50)]));
    const { areas } = canvasOf([...own, area('t', 'tomaat', [piece(200, 0, 250, 250)])]);
    const total = areas.reduce((sum, a) => sum + a.icons.length, 0);
    assert.ok(total <= 300);
    assert.equal(areas.find((a) => a.id === 't')?.icons.length, 25);
    assert.equal(areas.filter((a) => a.plantId === 'ui' && a.icons.length === 50).length, 5);
    assert.deepEqual(areas.filter((a) => a.plantId === 'ui' && a.icons.length === 0).map((a) => a.id), ['u5', 'u6']);
  });

  test('icons are drawn 0.8 of a plant square, at most 22 px, and not at all at the 6 px floor', () => {
    assert.equal(iconPxFor(50, 0.5), 20);
    assert.equal(iconPxFor(50, 2), 22);
    assert.equal(iconPxFor(10, 0.75), null);
    assert.equal(iconPxFor(10, 0.5), null);
  });
});

describe('resizeHandlePoint', () => {
  test('in a rectangle, the bottom-right corner of the piece', () => {
    assert.deepEqual(resizeHandlePoint(piece(10, 20, 30, 40), { shape: 'rectangle', widthCm: 100, lengthCm: 100 }, 5), { xCm: 40, yCm: 60 });
  });

  test('in a circle, moves towards the piece centre when the corner is outside', () => {
    const point = resizeHandlePoint(piece(50, 50, 50, 50), { shape: 'circle', diameterCm: 100 }, 5);
    assert.ok(Math.hypot(point.xCm - 50, point.yCm - 50) <= 45 + 1e-6);
    assert.ok(point.xCm > 50 && point.yCm > 50);
  });

  test('in a circle, the corner nearest the centre when the whole piece is outside', () => {
    assert.deepEqual(resizeHandlePoint(piece(90, 90, 10, 10), { shape: 'circle', diameterCm: 100 }, 5), { xCm: 90, yCm: 90 });
  });
});

describe('buildAreaCanvas roads', () => {
  const left = (): AreaData => area('a', 'ui', [piece(0, 0, 100, 100)]);
  const right = (): AreaData => area('b', 'tomaat', [piece(100, 0, 100, 100)]);
  const road = (id: string, xCm: number, yCm: number, widthCm: number, lengthCm: number, locked?: boolean, orientation?: RoadData['orientation']): RoadData => ({
    id,
    xCm,
    yCm,
    widthCm,
    lengthCm,
    orientation: orientation ?? (widthCm <= lengthCm ? 'vertical' : 'horizontal'),
    ...(locked === undefined ? {} : { locked }),
  });

  function roadCanvasOf(options: {
    own: AreaData[];
    carried?: AreaData[];
    roads?: RoadData[];
    isEditMode: boolean;
  }): ReturnType<typeof buildAreaCanvas> {
    return buildAreaCanvas({
      own: options.own,
      carried: options.carried ?? [],
      layer: { shape: 'rectangle', widthCm: 200, lengthCm: 100 },
      plantOf: (id) => PLANTS[id],
      nameOf: (id) => id.toUpperCase(),
      relations,
      carriedLabelOf: () => 'uit lente',
      t,
      gardenBoxRoads: options.roads,
      isEditMode: options.isEditMode,
    });
  }

  test('maps each road of a garden box to its rectangle, width and lock', () => {
    const { roads } = roadCanvasOf({
      own: [left()],
      roads: [road('r1', 95, 0, 10, 100, true), road('r2', 0, 0, 200, 10)],
      isEditMode: false,
    });
    assert.deepEqual(roads, [
      { id: 'r1', rect: piece(95, 0, 10, 100), widthCm: 10, locked: true },
      { id: 'r2', rect: piece(0, 0, 200, 10), widthCm: 10, locked: false },
    ]);
  });

  test('the width of a road comes from its orientation, not from its short side', () => {
    const { roads } = roadCanvasOf({ own: [left()], roads: [road('e', 0, 50, 30, 20, false, 'vertical')], isEditMode: false });
    assert.equal(roads[0].widthCm, 30);
  });

  test('a component that is not a garden box has no roads and no slots', () => {
    const { roads, roadSlots } = roadCanvasOf({ own: [left(), right()], isEditMode: true });
    assert.deepEqual(roads, []);
    assert.deepEqual(roadSlots, []);
  });

  test('slots only in edit mode', () => {
    assert.deepEqual(roadCanvasOf({ own: [left(), right()], roads: [], isEditMode: false }).roadSlots, []);
    assert.ok(roadCanvasOf({ own: [left(), right()], roads: [], isEditMode: true }).roadSlots.length > 0);
  });

  test('one slot per border, at its midpoint, in border order', () => {
    const { roadSlots } = roadCanvasOf({ own: [left(), right()], roads: [], isEditMode: true });
    assert.deepEqual(roadSlots.map((s) => [s.border.orientation, s.border.kind, s.xCm, s.yCm]), [
      ['vertical', 'edge', 0, 50],
      ['vertical', 'between', 100, 50],
      ['vertical', 'edge', 200, 50],
      ['horizontal', 'edge', 100, 0],
      ['horizontal', 'edge', 100, 100],
    ]);
    assert.deepEqual(roadSlots[1].border, { orientation: 'vertical', lineCm: 100, fromCm: 0, toCm: 100, kind: 'between' });
    assert.equal(new Set(roadSlots.map((s) => s.key)).size, roadSlots.length);
  });

  test('no slot for a border a road already covers', () => {
    const { roadSlots } = roadCanvasOf({ own: [left(), right()], roads: [road('r1', 95, 0, 10, 100)], isEditMode: true });
    assert.ok(!roadSlots.some((s) => s.border.kind === 'between'));
    assert.ok(!roadSlots.some((s) => s.border.orientation === 'vertical' && s.border.lineCm === 100));
  });

  test('borders with carried areas count too', () => {
    const { roadSlots } = roadCanvasOf({ own: [right()], carried: [left()], roads: [], isEditMode: true });
    assert.deepEqual(roadSlots.filter((s) => s.border.kind === 'between').map((s) => [s.xCm, s.yCm]), [[100, 50]]);
  });
});

describe('roadWidthFrom', () => {
  test('a whole number of cm from 10 to 200 is a width', () => {
    assert.equal(roadWidthFrom('30'), 30);
    assert.equal(roadWidthFrom(' 10 '), 10);
    assert.equal(roadWidthFrom('200'), 200);
  });

  test('anything else is no width', () => {
    for (const text of ['', '9', '201', '30.5', '30,5', 'abc', '-30', '3e1']) assert.equal(roadWidthFrom(text), null, text);
  });
});
