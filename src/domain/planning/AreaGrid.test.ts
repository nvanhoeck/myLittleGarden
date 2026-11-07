import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { gridPositions, plantCountOf } from './AreaGrid.ts';
import type { PlantingArea } from './PlantingArea.ts';

const square100: PlantingArea = { shape: 'rectangle', widthCm: 100, lengthCm: 100 };
const circle60: PlantingArea = { shape: 'circle', diameterCm: 60 };

describe('gridPositions', () => {
  test('given a 100 x 100 piece with spacing 20, 25 plants fit', () => {
    const positions = gridPositions({ xCm: 0, yCm: 0, widthCm: 100, lengthCm: 100 }, 20, square100);
    assert.equal(positions.length, 25);
    assert.deepEqual(positions[0], { xCm: 10, yCm: 10 });
    assert.ok(positions.every((p) => p.xCm >= 10 && p.xCm <= 90 && p.yCm >= 10 && p.yCm <= 90));
  });

  test('given a circle of 60, only positions whose footprint lies in the circle count', () => {
    const positions = gridPositions({ xCm: 0, yCm: 0, widthCm: 60, lengthCm: 60 }, 20, circle60);
    assert.equal(positions.length, 4);
    for (const { xCm, yCm } of positions) {
      for (const [dx, dy] of [[-10, -10], [-10, 10], [10, -10], [10, 10]]) {
        assert.ok(Math.hypot(xCm + dx - 30, yCm + dy - 30) <= 30 + 1e-6);
      }
    }
  });

  test('given a limit, at most that many positions are returned', () => {
    const positions = gridPositions({ xCm: 0, yCm: 0, widthCm: 1000, lengthCm: 1000 }, 20, { shape: 'rectangle', widthCm: 1000, lengthCm: 1000 }, 50);
    assert.equal(positions.length, 50);
  });
});

describe('plantCountOf', () => {
  test('given individual plants, the count is the grid over all pieces', () => {
    const area = { pieces: [{ xCm: 0, yCm: 0, widthCm: 100, lengthCm: 100 }, { xCm: 0, yCm: 100, widthCm: 50, lengthCm: 40 }] };
    assert.equal(plantCountOf(area, { spacingRadiusCm: 10, plantingStyle: 'individual' }, { shape: 'rectangle', widthCm: 100, lengthCm: 140 }), 25 + 4);
  });

  test('given a circle, the count matches the positions', () => {
    const area = { pieces: [{ xCm: 0, yCm: 0, widthCm: 60, lengthCm: 60 }] };
    assert.equal(plantCountOf(area, { spacingRadiusCm: 10, plantingStyle: 'individual' }, circle60), 4);
  });

  test('given patch or thinning plants, there is no count', () => {
    const area = { pieces: [{ xCm: 0, yCm: 0, widthCm: 100, lengthCm: 100 }] };
    assert.equal(plantCountOf(area, { spacingRadiusCm: 3.5, plantingStyle: 'patch', sowingSpacingCm: 5 }, square100), null);
    assert.equal(plantCountOf(area, { spacingRadiusCm: 2.5, plantingStyle: 'thinning', sowingSpacingCm: 8 }, square100), null);
  });
});
