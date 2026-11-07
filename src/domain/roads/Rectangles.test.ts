import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { overlaps, subtractAll, subtractRectangle } from './Rectangles.ts';
import type { AreaPiece } from '../../types/planning.types.ts';

const square: AreaPiece = { xCm: 0, yCm: 0, widthCm: 100, lengthCm: 100 };

function totalArea(pieces: readonly AreaPiece[]): number {
  return pieces.reduce((sum, p) => sum + p.widthCm * p.lengthCm, 0);
}

describe('subtractRectangle', () => {
  test('a cut across the full length leaves a left and a right piece', () => {
    const result = subtractRectangle(square, { xCm: 40, yCm: 0, widthCm: 20, lengthCm: 100 });
    assert.deepEqual(result, [
      { xCm: 0, yCm: 0, widthCm: 40, lengthCm: 100 },
      { xCm: 60, yCm: 0, widthCm: 40, lengthCm: 100 },
    ]);
    assert.equal(totalArea(result), 8000);
  });

  test('a cut in the middle leaves four disjoint pieces', () => {
    const result = subtractRectangle(square, { xCm: 40, yCm: 40, widthCm: 20, lengthCm: 20 });
    assert.equal(result.length, 4);
    assert.equal(totalArea(result), 9600);
    result.forEach((a, i) => result.slice(i + 1).forEach((b) => assert.equal(overlaps(a, b), false)));
  });

  test('a cut that does not overlap leaves the piece', () => {
    assert.deepEqual(subtractRectangle(square, { xCm: 100, yCm: 0, widthCm: 20, lengthCm: 100 }), [square]);
    assert.deepEqual(subtractRectangle(square, { xCm: 200, yCm: 200, widthCm: 20, lengthCm: 20 }), [square]);
  });

  test('a covering cut leaves nothing', () => {
    assert.deepEqual(subtractRectangle(square, { xCm: -10, yCm: -10, widthCm: 120, lengthCm: 120 }), []);
  });
});

describe('subtractAll', () => {
  test('removes every cut', () => {
    const result = subtractAll(square, [
      { xCm: 20, yCm: 0, widthCm: 10, lengthCm: 100 },
      { xCm: 60, yCm: 0, widthCm: 10, lengthCm: 100 },
    ]);
    assert.equal(totalArea(result), 8000);
    assert.equal(result.length, 3);
  });

  test('without cuts it returns the piece', () => {
    assert.deepEqual(subtractAll(square, []), [square]);
  });
});

describe('overlaps', () => {
  test('is true for a positive overlap area only', () => {
    assert.equal(overlaps(square, { xCm: 50, yCm: 50, widthCm: 100, lengthCm: 100 }), true);
    assert.equal(overlaps(square, { xCm: 100, yCm: 0, widthCm: 10, lengthCm: 100 }), false);
  });
});
