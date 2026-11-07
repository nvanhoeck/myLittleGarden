import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitScale } from './slideGeometry.ts';

test('fitScale scales the longest side to maxPx', () => {
  assert.equal(fitScale(200, 100, 280), 1.4);
  assert.equal(fitScale(100, 200, 280), 1.4);
});

test('fitScale returns 0 for non-positive dimensions', () => {
  assert.equal(fitScale(0, 100, 280), 0);
  assert.equal(fitScale(100, -5, 280), 0);
});
