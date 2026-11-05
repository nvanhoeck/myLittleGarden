import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { fillByRatio } from './SeasonPlacement.ts';
import type { NewPlacement, RatioPlant, SeasonPlacementRequest } from './SeasonPlacement.ts';
import { PlantFootprint, boundsOverlap } from './PlantFootprint.ts';
import type { PlantRelations } from './PlantRelations.ts';
import { fitsInArea } from './PlantingArea.ts';

const neutral: PlantRelations = () => 'neutral';
const box100 = { shape: 'rectangle', widthCm: 100, lengthCm: 100 } as const;

const individual = (plantId: string, radius: number, ratio: number): RatioPlant => ({
  plantId,
  ratio,
  traits: { spacingRadiusCm: radius, plantingStyle: 'individual' },
});
const patchPlant = (plantId: string, ratio: number): RatioPlant => ({
  plantId,
  ratio,
  traits: { spacingRadiusCm: 2, sowingSpacingCm: 5, plantingStyle: 'patch' },
});

const request = (overrides: Partial<SeasonPlacementRequest>): SeasonPlacementRequest => ({
  layers: [box100],
  fixed: [],
  plants: [],
  relations: neutral,
  ...overrides,
});

const countOf = (placements: readonly NewPlacement[], plantId: string): number =>
  placements.filter((p) => p.plantId === plantId).length;

function footprintOfPlacement(placement: NewPlacement, plants: readonly RatioPlant[]): PlantFootprint {
  const plant = plants.find((p) => p.plantId === placement.plantId);
  assert.ok(plant);
  return PlantFootprint.forPlant(plant.traits, placement.patch ?? {});
}

/** No two placements (or a placement and a fixed plant) on the same layer overlap */
function assertNoOverlap(req: SeasonPlacementRequest, placements: readonly NewPlacement[]): void {
  const all = [
    ...req.fixed.map((f) => ({ layer: f.layerIndex, bounds: f.footprint.boundsAt(f.xCm, f.yCm) })),
    ...placements.map((p) => ({ layer: p.layerIndex, bounds: footprintOfPlacement(p, req.plants).boundsAt(p.xCm, p.yCm) })),
  ];
  all.forEach((a, i) =>
    all.slice(i + 1).forEach((b) => assert.ok(a.layer !== b.layer || !boundsOverlap(a.bounds, b.bounds), 'overlap')),
  );
}

describe('fillByRatio', () => {
  test('given equal ratios, the plants share the box evenly and fill it', () => {
    const req = request({ plants: [individual('a', 10, 1), individual('b', 10, 1)] });
    const { placements } = fillByRatio(req);
    assert.equal(countOf(placements, 'a'), 13);
    assert.equal(countOf(placements, 'b'), 12);
    assertNoOverlap(req, placements);
  });

  test('given ratio 1 to 4, the second plant gets four times the area', () => {
    const { placements, shares } = fillByRatio(request({ plants: [individual('a', 10, 1), individual('b', 10, 4)] }));
    assert.equal(countOf(placements, 'a'), 5);
    assert.equal(countOf(placements, 'b'), 20);
    assert.deepEqual(shares.map((s) => [s.plantId, s.count, s.targetShare]), [['a', 5, 0.2], ['b', 20, 0.8]]);
    assert.equal(shares[1].actualShare, 0.8);
  });

  test('given a plant that cannot use its whole share, the leftover goes to the others', () => {
    const { placements } = fillByRatio(request({ plants: [individual('big', 40, 1), individual('small', 10, 1)] }));
    assert.equal(countOf(placements, 'big'), 1);
    assert.equal(countOf(placements, 'small'), 9);
  });

  test('given a fixed plant, its space is not free and nothing overlaps it', () => {
    const req = request({
      fixed: [{ plantId: 'x', layerIndex: 0, footprint: PlantFootprint.of(50, 100), xCm: 25, yCm: 50 }],
      plants: [individual('a', 10, 1)],
    });
    const { placements, shares } = fillByRatio(req);
    assert.equal(placements.length, 10);
    assert.equal(shares[0].actualShare, 4000 / 5000);
    assertNoOverlap(req, placements);
  });

  test('given tower layers, every layer is filled and the placement names its layer', () => {
    const req = request({
      layers: [{ shape: 'rectangle', widthCm: 40, lengthCm: 40 }, { shape: 'rectangle', widthCm: 20, lengthCm: 20 }],
      plants: [individual('a', 10, 1)],
    });
    const { placements } = fillByRatio(req);
    assert.equal(placements.filter((p) => p.layerIndex === 0).length, 4);
    assert.equal(placements.filter((p) => p.layerIndex === 1).length, 1);
  });

  test('given a patch plant, it gets one patch close to its target area', () => {
    const req = request({ plants: [patchPlant('p', 1), individual('a', 10, 1)] });
    const { placements } = fillByRatio(req);
    const patches = placements.filter((p) => p.plantId === 'p');
    assert.equal(patches.length, 1);
    assert.deepEqual(patches[0].patch, { widthCm: 70, heightCm: 70, rotationDeg: 0 });
    assert.ok(countOf(placements, 'a') >= 5);
    assertNoOverlap(req, placements);
  });

  test('given little room, a patch shrinks until it fits, never below its minimum side', () => {
    const req = request({
      fixed: [{ plantId: 'x', layerIndex: 0, footprint: PlantFootprint.of(100, 85), xCm: 50, yCm: 42.5 }],
      plants: [patchPlant('p', 1)],
    });
    const patch = fillByRatio(req).placements[0]?.patch;
    assert.ok(patch);
    assert.ok(patch.heightCm <= 15 && patch.heightCm >= 10, `height ${patch.heightCm}`);
  });

  test('given a fixed plant on a layer that does not exist, it takes no space', () => {
    const req = request({
      fixed: [{ plantId: 'x', layerIndex: 3, footprint: PlantFootprint.of(50, 100), xCm: 25, yCm: 50 }],
      plants: [individual('a', 10, 1)],
    });
    const { placements, shares } = fillByRatio(req);
    assert.equal(placements.length, 25);
    assert.equal(shares[0].actualShare, 1);
    assertNoOverlap(req, placements);
  });

  test('given a circular layer, every placement lies inside the circle', () => {
    const layer = { shape: 'circle', diameterCm: 60 } as const;
    const req = request({ layers: [layer], plants: [individual('a', 10, 1)] });
    const { placements } = fillByRatio(req);
    assert.ok(placements.length >= 4, `only ${placements.length} placed`);
    for (const p of placements) {
      assert.ok(fitsInArea(layer, PlantFootprint.of(20, 20), p.xCm, p.yCm), `outside at ${p.xCm}, ${p.yCm}`);
    }
    assertNoOverlap(req, placements);
  });

  test('given a layer smaller than the minimum patch, the plant does not fit', () => {
    const { placements, shares } = fillByRatio(request({
      layers: [{ shape: 'rectangle', widthCm: 8, lengthCm: 8 }],
      plants: [patchPlant('p', 1)],
    }));
    assert.deepEqual(placements, []);
    assert.deepEqual([shares[0].count, shares[0].actualShare], [0, 0]);
  });

  test('given combative plants, the second keeps its distance while there is room', () => {
    const combative: PlantRelations = (x, y) => (x !== y ? 'combative' : 'neutral');
    const { placements } = fillByRatio(request({
      layers: [{ shape: 'rectangle', widthCm: 100, lengthCm: 20 }],
      plants: [individual('a', 10, 1), individual('c', 10, 1)],
      relations: combative,
    }));
    assert.deepEqual([placements[0].plantId, placements[0].xCm], ['a', 10]);
    assert.deepEqual([placements[1].plantId, placements[1].xCm], ['c', 40]);
  });

  test('gives the same result whatever the order of the plants', () => {
    const plants = [individual('a', 10, 2), patchPlant('p', 1), individual('b', 15, 1)];
    assert.deepEqual(fillByRatio(request({ plants })), fillByRatio(request({ plants: [...plants].reverse() })));
  });

  test('given no free area, nothing is placed', () => {
    const { placements, shares } = fillByRatio(request({
      fixed: [{ plantId: 'x', layerIndex: 0, footprint: PlantFootprint.of(100, 100), xCm: 50, yCm: 50 }],
      plants: [individual('a', 10, 1)],
    }));
    assert.deepEqual(placements, []);
    assert.equal(shares[0].count, 0);
  });
});
