import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getComponentTypeIcon,
  getComponentDimensionsLabel,
  getComponentColor,
  isTowerComponent,
} from './componentSummary.ts';

const base = {
  id: 'c',
  name: 'n',
  sunDirection: 'S',
  createdAt: '2026-01-01T00:00:00.000Z',
  borderWidthInCm: 5,
  plants: [],
} as const;

const box = { ...base, type: 'gardenBox', widthInCm: 120, lengthInCm: 80 } as const;
const pot = { ...base, type: 'pot', diameterInCm: 40 } as const;
const rectTower = { ...base, type: 'rectangularTower', widthInCm: 60, lengthInCm: 60, numberOfLayers: 3 } as const;
const roundTower = { ...base, type: 'circularTower', diameterInCm: 50, numberOfLayers: 2 } as const;

test('dimensions label shows width x length for rectangular shapes', () => {
  assert.equal(getComponentDimensionsLabel(box as never), '120 x 80 cm');
  assert.equal(getComponentDimensionsLabel(rectTower as never), '60 x 60 cm');
});

test('dimensions label shows diameter for round shapes', () => {
  assert.equal(getComponentDimensionsLabel(pot as never), 'Ø 40 cm');
  assert.equal(getComponentDimensionsLabel(roundTower as never), 'Ø 50 cm');
});

test('each type has a distinct icon and color', () => {
  const all = [box, pot, rectTower, roundTower] as const;
  assert.equal(new Set(all.map((c) => getComponentTypeIcon(c as never))).size, 4);
  assert.equal(new Set(all.map((c) => getComponentColor(c as never))).size, 4);
});

test('only towers are towers', () => {
  assert.equal(isTowerComponent(box as never), false);
  assert.equal(isTowerComponent(pot as never), false);
  assert.equal(isTowerComponent(rectTower as never), true);
  assert.equal(isTowerComponent(roundTower as never), true);
});
