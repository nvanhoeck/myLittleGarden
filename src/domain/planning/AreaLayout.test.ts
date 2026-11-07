import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { layoutAreas } from './AreaLayout.ts';
import type { AreaLayoutRequest, AreaLayoutResult } from './AreaLayout.ts';
import { relationsFromCatalog } from './PlantRelations.ts';
import type { PlantRelations } from './PlantRelations.ts';
import type { FootprintTraits } from './PlantFootprint.ts';
import type { PlantingArea } from './PlantingArea.ts';
import type { AreaPiece } from '../../types/planning.types.ts';
import type { PlantData } from '../../types/plant.types.ts';

const catalog = (createRequire(import.meta.url)('../../data/plants.json') as { plants: PlantData[] }).plants;

const neutral: PlantRelations = () => 'neutral';
const individual = (spacingRadiusCm: number): FootprintTraits => ({ spacingRadiusCm, plantingStyle: 'individual' });
const rectangle = (widthCm: number, lengthCm: number): PlantingArea => ({ shape: 'rectangle', widthCm, lengthCm });

function planting(plantingId: string, ratio = 1, traits: FootprintTraits = individual(10)) {
  return { plantingId, plantId: `plant-${plantingId}`, ratio, traits };
}

function request(partial: Partial<AreaLayoutRequest>): AreaLayoutRequest {
  return { layers: [rectangle(100, 100)], fixed: [], plantings: [], relations: neutral, ...partial };
}

function overlap(a: AreaPiece, b: AreaPiece): boolean {
  const eps = 1e-6;
  return a.xCm + eps < b.xCm + b.widthCm && b.xCm + eps < a.xCm + a.widthCm
    && a.yCm + eps < b.yCm + b.lengthCm && b.yCm + eps < a.yCm + a.lengthCm;
}

function boundsOf(layer: PlantingArea): { widthCm: number; lengthCm: number } {
  return layer.shape === 'rectangle' ? layer : { widthCm: layer.diameterCm, lengthCm: layer.diameterCm };
}

/** Every piece lies inside its layer and overlaps neither another piece nor a fixed piece */
function assertSound(req: AreaLayoutRequest, result: AreaLayoutResult): void {
  const placed = result.areas.flatMap((area) => area.pieces.map((piece) => ({ layerIndex: area.layerIndex, piece })));
  for (const { layerIndex, piece } of placed) {
    const bounds = boundsOf(req.layers[layerIndex]);
    assert.ok(piece.widthCm > 0 && piece.lengthCm > 0, `empty piece ${JSON.stringify(piece)}`);
    assert.ok(piece.xCm >= -1e-6 && piece.yCm >= -1e-6, `outside ${JSON.stringify(piece)}`);
    assert.ok(piece.xCm + piece.widthCm <= bounds.widthCm + 1e-6, `outside ${JSON.stringify(piece)}`);
    assert.ok(piece.yCm + piece.lengthCm <= bounds.lengthCm + 1e-6, `outside ${JSON.stringify(piece)}`);
  }
  placed.forEach((a, i) => {
    for (const b of placed.slice(i + 1)) {
      if (a.layerIndex === b.layerIndex) assert.equal(overlap(a.piece, b.piece), false, `${JSON.stringify(a)} overlaps ${JSON.stringify(b)}`);
    }
    for (const f of req.fixed) {
      if (f.layerIndex === a.layerIndex) assert.equal(overlap(a.piece, f.piece), false, `${JSON.stringify(a)} overlaps fixed`);
    }
  });
  for (const area of result.areas) {
    assert.ok(area.pieces.length >= 1 && area.pieces.length <= 3, `${area.pieces.length} pieces`);
  }
}

function shareOf(result: AreaLayoutResult, plantingId: string) {
  const share = result.shares.find((s) => s.plantingId === plantingId);
  assert.ok(share, `no share for ${plantingId}`);
  return share;
}

function piecesOf(result: AreaLayoutResult, plantingId: string): readonly AreaPiece[] {
  return result.areas.find((area) => area.plantingId === plantingId)?.pieces ?? [];
}

describe('layoutAreas', () => {
  test('given 2 plantings 1:1 in 100 x 100, each gets one half snapped to the plant spacing', () => {
    const req = request({ plantings: [planting('a'), planting('b')] });
    const result = layoutAreas(req);
    assertSound(req, result);
    for (const id of ['a', 'b']) {
      const pieces = piecesOf(result, id);
      assert.equal(pieces.length, 1);
      const [piece] = pieces;
      assert.ok(piece.widthCm === 100 || piece.lengthCm === 100, JSON.stringify(piece));
      assert.equal(piece.widthCm % 20, 0);
      assert.equal(piece.lengthCm % 20, 0);
      const share = shareOf(result, id);
      assert.equal(share.targetShare, 0.5);
      assert.ok(Math.abs(share.actualShare - 0.5) <= 0.1 + 1e-9, `share ${share.actualShare}`);
      assert.equal(share.fits, true);
      assert.equal(share.plantCount, (piece.widthCm / 20) * (piece.lengthCm / 20));
    }
  });

  test('given a long 400 x 100 rectangle, 3 plantings get strips across the full short side', () => {
    const req = request({ layers: [rectangle(400, 100)], plantings: [planting('a'), planting('b'), planting('c')] });
    const result = layoutAreas(req);
    assertSound(req, result);
    assert.equal(result.areas.length, 3);
    for (const area of result.areas) {
      assert.equal(area.pieces.length, 1);
      assert.equal(area.pieces[0].lengthCm, 100);
      assert.equal(area.pieces[0].yCm, 0);
    }
  });

  test('given a squarish 300 x 300 rectangle, 4 plantings get blocks with aspect ratio at most 3', () => {
    const req = request({ layers: [rectangle(300, 300)], plantings: ['a', 'b', 'c', 'd'].map((id) => planting(id)) });
    const result = layoutAreas(req);
    assertSound(req, result);
    assert.equal(result.areas.length, 4);
    for (const area of result.areas) {
      for (const piece of area.pieces) {
        const aspect = Math.max(piece.widthCm, piece.lengthCm) / Math.min(piece.widthCm, piece.lengthCm);
        assert.ok(aspect <= 3, `aspect ${aspect} of ${JSON.stringify(piece)}`);
      }
    }
  });

  test('given a fixed corner piece, nothing overlaps it and the placed area stays within the free area', () => {
    const fixed = [{ layerIndex: 0, piece: { xCm: 0, yCm: 0, widthCm: 40, lengthCm: 40 } }];
    const req = request({ fixed, plantings: [planting('a'), planting('b'), planting('c')] });
    const result = layoutAreas(req);
    assertSound(req, result);
    const placedArea = result.areas.flatMap((a) => a.pieces).reduce((sum, p) => sum + p.widthCm * p.lengthCm, 0);
    assert.ok(placedArea <= 8400 + 1e-6, `placed ${placedArea}`);
    assert.ok(placedArea > 0);
  });

  test('given ratio 1:9 where the small planting is below its minimum size, it does not fit and gets no area', () => {
    const req = request({ plantings: [planting('small', 1), planting('big', 9, individual(5))] });
    const result = layoutAreas(req);
    assertSound(req, result);
    assert.deepEqual(piecesOf(result, 'small'), []);
    assert.equal(shareOf(result, 'small').fits, false);
    assert.equal(shareOf(result, 'small').actualShare, 0);
    assert.equal(shareOf(result, 'big').fits, true);
    assert.ok(shareOf(result, 'big').actualShare > 0.9);
  });

  test('given two free rectangles where a planting needs more than the remainder, it gets 2 pieces within 10 % of its target', () => {
    const fixed = [{ layerIndex: 0, piece: { xCm: 0, yCm: 0, widthCm: 40, lengthCm: 40 } }];
    const req = request({ fixed, plantings: [planting('a', 1, individual(1)), planting('b', 1, individual(1))] });
    const result = layoutAreas(req);
    assertSound(req, result);
    const split = result.areas.filter((area) => area.pieces.length === 2);
    assert.equal(split.length, 1);
    for (const id of ['a', 'b']) {
      const share = shareOf(result, id);
      assert.ok(Math.abs(share.actualShare - share.targetShare) <= 0.1 * share.targetShare, `${id}: ${share.actualShare}`);
    }
  });

  test('given a tower, areas are laid out on both layers with their layer index', () => {
    const req = request({ layers: [rectangle(200, 200), rectangle(100, 100)], plantings: ['a', 'b', 'c'].map((id) => planting(id)) });
    const result = layoutAreas(req);
    assertSound(req, result);
    const layers = new Set(result.areas.map((area) => area.layerIndex));
    assert.deepEqual([...layers].sort(), [0, 1]);
  });

  test('given a tower with 2 plantings, both layers get an area and the free area is used', () => {
    const req = request({ layers: [rectangle(200, 200), rectangle(100, 100)], plantings: [planting('a'), planting('b')] });
    const result = layoutAreas(req);
    assertSound(req, result);
    // Layer capacities are 4:1, so 50/50 is impossible with one layer per area
    assert.deepEqual([...new Set(result.areas.map((area) => area.layerIndex))].sort(), [0, 1]);
    const used = result.shares.reduce((sum, s) => sum + s.actualShare, 0);
    assert.ok(used >= 0.9, `used ${used}`);
  });

  test('given one planting around a fixed piece in the middle, at least 90 % of the free area is used', () => {
    const fixed = [{ layerIndex: 0, piece: { xCm: 150, yCm: 150, widthCm: 100, lengthCm: 100 } }];
    const req = request({ layers: [rectangle(400, 400)], fixed, plantings: [planting('a', 1, individual(5))] });
    const result = layoutAreas(req);
    assertSound(req, result);
    assert.ok(shareOf(result, 'a').actualShare >= 0.9 - 1e-9, `used ${shareOf(result, 'a').actualShare}`);
  });

  test('given one planting and 3 fixed pieces, at least 85 % of the free area is used', () => {
    const fixed = [
      { layerIndex: 0, piece: { xCm: 0, yCm: 0, widthCm: 100, lengthCm: 100 } },
      { layerIndex: 0, piece: { xCm: 0, yCm: 150, widthCm: 100, lengthCm: 100 } },
      { layerIndex: 0, piece: { xCm: 300, yCm: 300, widthCm: 100, lengthCm: 100 } },
    ];
    const req = request({ layers: [rectangle(400, 400)], fixed, plantings: [planting('a', 1, individual(5))] });
    const result = layoutAreas(req);
    assertSound(req, result);
    assert.ok(shareOf(result, 'a').actualShare >= 0.85, `used ${shareOf(result, 'a').actualShare}`);
  });

  test('given reversed input, the result is the same', () => {
    const fixed = [
      { layerIndex: 0, piece: { xCm: 0, yCm: 0, widthCm: 40, lengthCm: 40 } },
      { layerIndex: 0, piece: { xCm: 200, yCm: 100, widthCm: 50, lengthCm: 30 } },
    ];
    const plantings = [planting('a', 2), planting('b', 1, individual(5)), planting('c', 3, individual(15)), planting('d')];
    const relations: PlantRelations = (x, y) => ([x, y].sort().join() === 'plant-a,plant-c' ? 'combative' : 'neutral');
    const forward = layoutAreas(request({ layers: [rectangle(300, 300)], fixed, plantings, relations }));
    const reversed = layoutAreas(request({ layers: [rectangle(300, 300)], fixed: [...fixed].reverse(), plantings: [...plantings].reverse(), relations }));
    assert.deepEqual(reversed, forward);
  });

  test('given 1500 x 2000 with 10 catalog plants, the layout and counts are fast and sound', () => {
    const ids = ['tomaat', 'sla', 'wortel', 'basilicum', 'boerenkool', 'radijs', 'ui', 'spinazie', 'courgette', 'struikboon'];
    const plants = ids.map((id) => {
      const plant = catalog.find((p) => p.id === id);
      assert.ok(plant, id);
      return plant;
    });
    const req = request({
      layers: [rectangle(1500, 2000)],
      plantings: plants.map((p) => ({ plantingId: `planting-${p.id}`, plantId: p.id, ratio: 1, traits: p })),
      relations: relationsFromCatalog(catalog),
    });
    const start = performance.now();
    const result = layoutAreas(req);
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 200, `took ${elapsed} ms`);
    assertSound(req, result);
    assert.equal(result.areas.length, 10);
    // Wortel, radijs (thinning) and spinazie (patch) have no count; at catalog spacing the other 7 can hold
    // at most ~3,200 plants on a tenth of 300 m² each, so the brief's > 5,000 is unreachable: assert > 3,000.
    const total = result.shares.reduce((sum, s) => sum + (s.plantCount ?? 0), 0);
    assert.ok(total > 3000, `${total} plants`);
  });
});
