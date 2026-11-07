import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { freeRectangles } from './FreeSpace.ts';
import type { AreaPiece } from '../../types/planning.types.ts';
import type { PlantingArea } from './PlantingArea.ts';

const square100: PlantingArea = { shape: 'rectangle', widthCm: 100, lengthCm: 100 };

function areaOf(pieces: readonly AreaPiece[]): number {
  return pieces.reduce((sum, p) => sum + p.widthCm * p.lengthCm, 0);
}

function overlap(a: AreaPiece, b: AreaPiece): boolean {
  return a.xCm < b.xCm + b.widthCm && b.xCm < a.xCm + a.widthCm && a.yCm < b.yCm + b.lengthCm && b.yCm < a.yCm + a.lengthCm;
}

function assertDisjoint(pieces: readonly AreaPiece[], fixed: readonly AreaPiece[]): void {
  pieces.forEach((a, i) => {
    pieces.slice(i + 1).forEach((b) => assert.equal(overlap(a, b), false, `${JSON.stringify(a)} overlaps ${JSON.stringify(b)}`));
    fixed.forEach((f) => assert.equal(overlap(a, f), false, `${JSON.stringify(a)} overlaps fixed ${JSON.stringify(f)}`));
  });
}

describe('freeRectangles', () => {
  test('given no fixed pieces, the whole layer is one free rectangle', () => {
    assert.deepEqual(freeRectangles(square100, [], 10), [{ xCm: 0, yCm: 0, widthCm: 100, lengthCm: 100 }]);
  });

  test('given a fixed corner piece, two rectangles cover exactly the L', () => {
    const fixed = [{ xCm: 0, yCm: 0, widthCm: 40, lengthCm: 40 }];
    const free = freeRectangles(square100, fixed, 10);
    assert.equal(free.length, 2);
    assert.equal(areaOf(free), 8400);
    assertDisjoint(free, fixed);
  });

  test('given a fixed piece in the middle, at most 4 rectangles cover the rest', () => {
    const fixed = [{ xCm: 40, yCm: 40, widthCm: 20, lengthCm: 20 }];
    const free = freeRectangles(square100, fixed, 10);
    assert.ok(free.length <= 4, `${free.length} rectangles`);
    assert.equal(areaOf(free), 9600);
    assertDisjoint(free, fixed);
  });

  test('given a rectangle thinner than the minimum side, it is dropped', () => {
    const fixed = [{ xCm: 0, yCm: 0, widthCm: 95, lengthCm: 100 }];
    assert.deepEqual(freeRectangles(square100, fixed, 10), []);
    assert.deepEqual(freeRectangles(square100, fixed, 5), [{ xCm: 95, yCm: 0, widthCm: 5, lengthCm: 100 }]);
  });

  test('given a circle, the free space is its bounding square', () => {
    assert.deepEqual(freeRectangles({ shape: 'circle', diameterCm: 60 }, [], 10), [{ xCm: 0, yCm: 0, widthCm: 60, lengthCm: 60 }]);
  });
});
