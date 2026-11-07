import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { cutBack } from './CutBack.ts';

describe('cutBack', () => {
  test('cuts a piece back from a road', () => {
    assert.deepEqual(cutBack([{ xCm: 0, yCm: 0, widthCm: 50, lengthCm: 100 }], [{ xCm: 35, yCm: 0, widthCm: 30, lengthCm: 100 }], 10), [
      { xCm: 0, yCm: 0, widthCm: 35, lengthCm: 100 },
    ]);
  });

  test('a road through the middle leaves two pieces', () => {
    const result = cutBack([{ xCm: 0, yCm: 0, widthCm: 100, lengthCm: 100 }], [{ xCm: 0, yCm: 45, widthCm: 100, lengthCm: 10 }], 20);
    assert.equal(result?.length, 2);
  });

  test('a leftover thinner than the minimum side is dropped', () => {
    const result = cutBack([{ xCm: 0, yCm: 0, widthCm: 100, lengthCm: 100 }], [{ xCm: 10, yCm: 0, widthCm: 10, lengthCm: 100 }], 20);
    assert.deepEqual(result, [{ xCm: 20, yCm: 0, widthCm: 80, lengthCm: 100 }]);
  });

  test('keeps the three largest leftovers', () => {
    const pieces = [{ xCm: 0, yCm: 0, widthCm: 100, lengthCm: 100 }];
    const roads = [
      { xCm: 10, yCm: 0, widthCm: 5, lengthCm: 100 },
      { xCm: 40, yCm: 0, widthCm: 5, lengthCm: 100 },
      { xCm: 70, yCm: 0, widthCm: 5, lengthCm: 100 },
    ];
    const result = cutBack(pieces, roads, 5);
    assert.equal(result?.length, 3);
    assert.equal(result?.some((p) => p.widthCm === 10), false);
  });

  test('is null when nothing is large enough', () => {
    assert.equal(cutBack([{ xCm: 0, yCm: 0, widthCm: 50, lengthCm: 100 }], [{ xCm: 35, yCm: 0, widthCm: 30, lengthCm: 100 }], 40), null);
  });

  test('returns the same instance when no road overlaps', () => {
    const pieces = [{ xCm: 0, yCm: 0, widthCm: 50, lengthCm: 100 }];
    assert.equal(cutBack(pieces, [{ xCm: 60, yCm: 0, widthCm: 10, lengthCm: 100 }], 10), pieces);
  });
});
