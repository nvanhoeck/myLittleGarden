import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitScale, clampIconPosition } from './slideGeometry.ts';

test('fitScale scales the longest side to maxPx', () => {
  assert.equal(fitScale(200, 100, 280), 1.4);
  assert.equal(fitScale(100, 200, 280), 1.4);
});

test('fitScale returns 0 for non-positive dimensions', () => {
  assert.equal(fitScale(0, 100, 280), 0);
  assert.equal(fitScale(100, -5, 280), 0);
});

test('clampIconPosition centers the icon on the scaled position', () => {
  const pos = clampIconPosition(50, 25, 100, 100, 2, 20);
  assert.deepEqual(pos, { left: 90, top: 40 });
});

test('clampIconPosition keeps the icon inside the area', () => {
  const low = clampIconPosition(-30, -30, 100, 100, 2, 20);
  assert.deepEqual(low, { left: 0, top: 0 });
  const high = clampIconPosition(500, 500, 100, 100, 2, 20);
  assert.deepEqual(high, { left: 180, top: 180 });
});
