import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTowerLayerDimensions, TOWER_LAYER_REDUCTION_FACTOR } from './towerLayerGeometry.ts';

test('reduction factor is 0.85', () => {
  assert.equal(TOWER_LAYER_REDUCTION_FACTOR, 0.85);
});

test('bottom layer keeps base dimensions', () => {
  assert.deepEqual(getTowerLayerDimensions(100, 60, 0), { width: 100, height: 60 });
});

test('each layer shrinks by the reduction factor', () => {
  const second = getTowerLayerDimensions(100, 60, 1);
  assert.ok(Math.abs(second.width - 85) < 1e-9);
  assert.ok(Math.abs(second.height - 51) < 1e-9);
  const third = getTowerLayerDimensions(100, 60, 2);
  assert.ok(Math.abs(third.width - 72.25) < 1e-9);
});

test('never returns negative dimensions', () => {
  assert.deepEqual(getTowerLayerDimensions(-10, 0, 3), { width: 0, height: 0 });
});
