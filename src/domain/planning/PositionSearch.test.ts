import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bestSpot } from './PositionSearch.ts';
import { PlantFootprint } from './PlantFootprint.ts';
import type { PlantRelations } from './PlantRelations.ts';

const neutral: PlantRelations = () => 'neutral';
const square20 = PlantFootprint.of(20, 20);
const box = { shape: 'rectangle', widthCm: 100, lengthCm: 20 } as const;

describe('bestSpot', () => {
  test('given an empty area, the top-left spot wins', () => {
    assert.deepEqual(bestSpot('a', square20, box, [], neutral), { xCm: 10, yCm: 10, score: 0 });
  });

  test('given an occupant, the spot sits flush against it', () => {
    const occupants = [{ plantId: 'b', bounds: { left: 0, top: 0, right: 20, bottom: 20 }, weight: 1 }];
    assert.deepEqual(bestSpot('a', square20, box, occupants, neutral), { xCm: 30, yCm: 10, score: 0 });
  });

  test('given a combative occupant, the spot keeps more than 5 cm away', () => {
    const combative: PlantRelations = () => 'combative';
    const occupants = [{ plantId: 'b', bounds: { left: 0, top: 0, right: 20, bottom: 20 }, weight: 1 }];
    assert.equal(bestSpot('a', square20, box, occupants, combative)?.xCm, 40);
  });

  test('given a companion occupant, the nearest spot within 5 cm scores +1 times its weight', () => {
    const companion: PlantRelations = () => 'companion';
    const occupants = [{ plantId: 'b', bounds: { left: 40, top: 0, right: 60, bottom: 20 }, weight: 2 }];
    // Left 15 leaves a 5 cm gap to b, which counts as a neighbour; it wins the smallest-x tie over left 20 (flush)
    assert.deepEqual(bestSpot('a', square20, box, occupants, companion), { xCm: 25, yCm: 10, score: 2 });
  });

  test('given no free spot, null', () => {
    const occupants = [{ plantId: 'b', bounds: { left: 0, top: 0, right: 100, bottom: 20 }, weight: 1 }];
    assert.equal(bestSpot('a', square20, box, occupants, neutral), null);
  });
});
