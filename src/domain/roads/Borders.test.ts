import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bordersOf } from './Borders.ts';

const box = { widthCm: 100, lengthCm: 100 };

const sideBySide = [
  { id: 'a', pieces: [{ xCm: 0, yCm: 0, widthCm: 50, lengthCm: 100 }] },
  { id: 'b', pieces: [{ xCm: 50, yCm: 0, widthCm: 50, lengthCm: 100 }] },
];

describe('bordersOf', () => {
  test('two side-by-side areas share one between border and touch the box edges', () => {
    const borders = bordersOf(sideBySide, box, []);
    assert.deepEqual(borders.filter((b) => b.kind === 'between'), [
      { orientation: 'vertical', lineCm: 50, fromCm: 0, toCm: 100, kind: 'between' },
    ]);
    assert.deepEqual(borders.filter((b) => b.kind === 'edge'), [
      { orientation: 'vertical', lineCm: 0, fromCm: 0, toCm: 100, kind: 'edge', inside: 'after' },
      { orientation: 'vertical', lineCm: 100, fromCm: 0, toCm: 100, kind: 'edge', inside: 'before' },
      { orientation: 'horizontal', lineCm: 0, fromCm: 0, toCm: 100, kind: 'edge', inside: 'after' },
      { orientation: 'horizontal', lineCm: 100, fromCm: 0, toCm: 100, kind: 'edge', inside: 'before' },
    ]);
  });

  test('a between border only covers the shared stretch', () => {
    const borders = bordersOf(
      [
        { id: 'a', pieces: [{ xCm: 0, yCm: 0, widthCm: 50, lengthCm: 100 }] },
        { id: 'b', pieces: [{ xCm: 50, yCm: 50, widthCm: 50, lengthCm: 100 }] },
      ],
      { widthCm: 100, lengthCm: 150 },
      [],
    );
    assert.deepEqual(borders.filter((b) => b.kind === 'between'), [
      { orientation: 'vertical', lineCm: 50, fromCm: 50, toCm: 100, kind: 'between' },
    ]);
  });

  test('pieces of the same area have no border', () => {
    const borders = bordersOf(
      [{ id: 'a', pieces: [{ xCm: 0, yCm: 0, widthCm: 50, lengthCm: 100 }, { xCm: 50, yCm: 0, widthCm: 50, lengthCm: 100 }] }],
      box,
      [],
    );
    assert.equal(borders.filter((b) => b.kind === 'between').length, 0);
  });

  test('a border covered by a road is left out', () => {
    const borders = bordersOf(sideBySide, box, [{ xCm: 35, yCm: 0, widthCm: 30, lengthCm: 100 }]);
    assert.equal(borders.filter((b) => b.kind === 'between').length, 0);
  });

  test('a partly covered border keeps the uncovered stretch', () => {
    const borders = bordersOf(sideBySide, box, [{ xCm: 0, yCm: 0, widthCm: 100, lengthCm: 20 }]);
    assert.deepEqual(borders.filter((b) => b.kind === 'between'), [
      { orientation: 'vertical', lineCm: 50, fromCm: 20, toCm: 100, kind: 'between' },
    ]);
  });

  test('the order does not depend on the input order', () => {
    const areas = [
      { id: 'a', pieces: [{ xCm: 0, yCm: 0, widthCm: 50, lengthCm: 50 }] },
      { id: 'b', pieces: [{ xCm: 50, yCm: 0, widthCm: 50, lengthCm: 50 }] },
      { id: 'c', pieces: [{ xCm: 0, yCm: 50, widthCm: 100, lengthCm: 50 }] },
    ];
    assert.deepEqual(bordersOf([...areas].reverse(), box, []), bordersOf(areas, box, []));
  });
});
