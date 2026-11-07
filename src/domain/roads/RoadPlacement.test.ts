import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { automaticRoads, ringRoads, roadOnBorder, withWidth } from './RoadPlacement.ts';
import { overlaps } from './Rectangles.ts';
import type { AreaPiece } from '../../types/planning.types.ts';

const box = { widthCm: 100, lengthCm: 100 };

describe('roadOnBorder', () => {
  test('a between border gets a road centred on it', () => {
    assert.deepEqual(roadOnBorder({ orientation: 'vertical', lineCm: 50, fromCm: 0, toCm: 100, kind: 'between' }, 30, box), {
      xCm: 35, yCm: 0, widthCm: 30, lengthCm: 100,
    });
  });

  test('a horizontal between border gets a horizontal road', () => {
    assert.deepEqual(roadOnBorder({ orientation: 'horizontal', lineCm: 50, fromCm: 10, toCm: 90, kind: 'between' }, 20, box), {
      xCm: 10, yCm: 40, widthCm: 80, lengthCm: 20,
    });
  });

  test('an edge border gets a road on the inside', () => {
    assert.deepEqual(roadOnBorder({ orientation: 'vertical', lineCm: 0, fromCm: 0, toCm: 100, kind: 'edge', inside: 'after' }, 30, box), {
      xCm: 0, yCm: 0, widthCm: 30, lengthCm: 100,
    });
    assert.deepEqual(roadOnBorder({ orientation: 'vertical', lineCm: 100, fromCm: 0, toCm: 100, kind: 'edge', inside: 'before' }, 30, box), {
      xCm: 70, yCm: 0, widthCm: 30, lengthCm: 100,
    });
  });

  test('a road is clamped at the box edge', () => {
    assert.deepEqual(roadOnBorder({ orientation: 'vertical', lineCm: 10, fromCm: 0, toCm: 100, kind: 'between' }, 30, box), {
      xCm: 0, yCm: 0, widthCm: 30, lengthCm: 100,
    });
  });

  test('a road wider than the box is null', () => {
    assert.equal(roadOnBorder({ orientation: 'vertical', lineCm: 50, fromCm: 0, toCm: 100, kind: 'between' }, 150, box), null);
  });
});

describe('ringRoads', () => {
  test('makes four roads that do not overlap and fill the ring', () => {
    const roads = ringRoads(20, { widthCm: 100, lengthCm: 80 });
    assert.equal(roads.length, 4);
    roads.forEach((a, i) => roads.slice(i + 1).forEach((b) => assert.equal(overlaps(a, b), false)));
    assert.equal(roads.reduce((sum, r) => sum + r.widthCm * r.lengthCm, 0), 100 * 80 - 60 * 40);
    assert.deepEqual(roads[0], { xCm: 0, yCm: 0, widthCm: 100, lengthCm: 20 });
    assert.deepEqual(roads[1], { xCm: 0, yCm: 60, widthCm: 100, lengthCm: 20 });
  });

  test('a ring that does not fit is empty', () => {
    assert.deepEqual(ringRoads(60, box), []);
  });
});

describe('automaticRoads', () => {
  const sideBySide = [
    { id: 'a', pieces: [{ xCm: 0, yCm: 0, widthCm: 50, lengthCm: 100 }] },
    { id: 'b', pieces: [{ xCm: 50, yCm: 0, widthCm: 50, lengthCm: 100 }] },
  ];

  test('a ring and a road between two areas makes five roads', () => {
    const roads = automaticRoads({ areas: sideBySide, box, widthCm: 20, withRing: true, lockedRoads: [] });
    assert.equal(roads.length, 5);
  });

  test('without a ring only the road between the areas is made', () => {
    const roads = automaticRoads({ areas: sideBySide, box, widthCm: 20, withRing: false, lockedRoads: [] });
    assert.deepEqual(roads, [{ xCm: 40, yCm: 0, widthCm: 20, lengthCm: 100 }]);
  });

  test('a locked road on the shared border leaves only the ring', () => {
    const locked: AreaPiece[] = [{ xCm: 35, yCm: 0, widthCm: 30, lengthCm: 100 }];
    const roads = automaticRoads({ areas: sideBySide, box, widthCm: 20, withRing: true, lockedRoads: locked });
    assert.equal(roads.length, 4);
  });
});

describe('withWidth', () => {
  test('a centred road keeps its centre', () => {
    const road = { id: 'r', xCm: 35, yCm: 0, widthCm: 30, lengthCm: 100 };
    assert.deepEqual(withWidth(road, 50, box), { id: 'r', xCm: 25, yCm: 0, widthCm: 50, lengthCm: 100 });
  });

  test('a road on the box edge keeps the edge', () => {
    const left = { id: 'l', xCm: 0, yCm: 0, widthCm: 30, lengthCm: 100 };
    assert.deepEqual(withWidth(left, 50, box), { id: 'l', xCm: 0, yCm: 0, widthCm: 50, lengthCm: 100 });
    const right = { id: 'r', xCm: 70, yCm: 0, widthCm: 30, lengthCm: 100 };
    assert.deepEqual(withWidth(right, 50, box), { id: 'r', xCm: 50, yCm: 0, widthCm: 50, lengthCm: 100 });
  });

  test('a horizontal road changes its length side', () => {
    const road = { id: 'h', xCm: 0, yCm: 40, widthCm: 100, lengthCm: 20 };
    assert.deepEqual(withWidth(road, 40, box), { id: 'h', xCm: 0, yCm: 30, widthCm: 100, lengthCm: 40 });
  });
});
