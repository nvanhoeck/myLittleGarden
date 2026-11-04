import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutScore, placePlants } from './AutoPlacement.ts';
import type { FixedPlant, PlacementCandidate, PlacementRequest, PlacementResult } from './AutoPlacement.ts';
import type { PlantRelation } from './PlantRelations.ts';
import { GrowingPeriod } from './GrowingPeriod.ts';
import { PlantFootprint, footprintsConflict } from './PlantFootprint.ts';

const period = (startWeek: number, endWeek: number, method: 'transplant' | 'directSow' = 'transplant'): GrowingPeriod =>
  GrowingPeriod.create({ year: 2026, startWeek, endWeek, method });

const square = (sideCm: number): PlantFootprint => PlantFootprint.of(sideCm, sideCm);

const candidate = (
  id: string,
  sideCm = 30,
  periodOptions: readonly GrowingPeriod[] = [period(10, 20)],
  plantId = 'neutral',
): PlacementCandidate => ({ id, plantId, footprint: square(sideCm), periodOptions });

const fixedPlant = (
  id: string,
  plantId: string,
  xCm: number,
  yCm: number,
  footprint: PlantFootprint = square(30),
  p = period(10, 20),
): FixedPlant => ({ id, plantId, footprint, period: p, xCm, yCm });

const neutral = (): PlantRelation => 'neutral';

const pairRelation = (pair: string, relation: PlantRelation) => (a: string, b: string): PlantRelation =>
  [a, b].sort().join('+') === pair ? relation : 'neutral';

const box = (widthCm: number, lengthCm: number) => ({ shape: 'rectangle', widthCm, lengthCm }) as const;

function request(overrides: Partial<PlacementRequest>): PlacementRequest {
  return { area: box(120, 60), fixed: [], candidates: [], relations: neutral, ...overrides };
}

const positionOf = (result: PlacementResult, id: string): [number, number] | undefined => {
  const placed = result.placed.find((p) => p.id === id);
  return placed ? [placed.xCm, placed.yCm] : undefined;
};

/** Gap between two placed squares on both axes (0 when they touch or overlap on that axis) */
function gapBetween(a: [number, number], sideA: number, b: [number, number], sideB: number): { x: number; y: number } {
  const half = (sideA + sideB) / 2;
  return { x: Math.max(0, Math.abs(a[0] - b[0]) - half), y: Math.max(0, Math.abs(a[1] - b[1]) - half) };
}

describe('placePlants', () => {
  test('given a 120x60 box and two 30cm-square plants with overlapping periods, places them side by side', () => {
    const result = placePlants(request({ candidates: [candidate('a'), candidate('b')] }));
    assert.deepEqual(positionOf(result, 'a'), [15, 15]);
    assert.deepEqual(positionOf(result, 'b'), [45, 15]);
    assert.deepEqual(result.unplaced, []);
  });

  test('given a 120x60 box and eight 30cm plants at the same time, fills the box without conflicts', () => {
    const candidates = Array.from({ length: 8 }, (_, i) => candidate(`p${i}`));
    const result = placePlants(request({ candidates }));
    assert.equal(result.placed.length, 8);
    for (const a of result.placed) {
      assert.ok(a.xCm - 15 >= 0 && a.xCm + 15 <= 120 && a.yCm - 15 >= 0 && a.yCm + 15 <= 60);
      for (const b of result.placed) {
        if (a.id !== b.id) {
          assert.ok(!footprintsConflict({ ...a, footprint: square(30) }, { ...b, footprint: square(30) }));
        }
      }
    }
  });

  test('given a full box, reports the extra plant as unplaced for lack of space with its window weeks', () => {
    const candidates = Array.from({ length: 9 }, (_, i) =>
      candidate(`p${i}`, 30, [period(10, 20), period(11, 21)]),
    );
    const result = placePlants(request({ candidates }));
    assert.equal(result.placed.length, 8);
    assert.deepEqual(result.unplaced, [{ id: 'p8', reason: 'noSpace', weeks: { startWeek: 10, endWeek: 21 } }]);
  });

  test('given a box for one plant and two plants with non-overlapping periods, both share the same spot', () => {
    const result = placePlants(
      request({
        area: box(30, 30),
        candidates: [candidate('spring', 30, [period(10, 15)]), candidate('summer', 30, [period(20, 25)])],
      }),
    );
    assert.deepEqual(positionOf(result, 'spring'), [15, 15]);
    assert.deepEqual(positionOf(result, 'summer'), [15, 15]);
  });

  test('given a box for one plant and a plant with a free later option, chooses the option that fits in time', () => {
    const result = placePlants(
      request({
        area: box(30, 30),
        fixed: [fixedPlant('f', 'neutral', 15, 15, square(30), period(10, 15))],
        candidates: [candidate('later', 30, [period(14, 18), period(16, 20)])],
      }),
    );
    assert.deepEqual(result.placed[0].period.toData(), period(16, 20).toData());
  });

  test('given a fixed plant, never places a candidate on top of it during its period', () => {
    const result = placePlants(
      request({ area: box(60, 30), fixed: [fixedPlant('f', 'neutral', 15, 15)], candidates: [candidate('a')] }),
    );
    assert.deepEqual(positionOf(result, 'a'), [45, 15]);
    assert.equal(result.placed.some((p) => p.id === 'f'), false);
  });

  test('given a fixed plant in another period, the candidate may use its spot', () => {
    const result = placePlants(
      request({
        area: box(60, 30),
        fixed: [fixedPlant('f', 'neutral', 15, 15, square(30), period(30, 40))],
        candidates: [candidate('a')],
      }),
    );
    assert.deepEqual(positionOf(result, 'a'), [15, 15]);
  });

  test('given a locked plant spanning x 8 to 18, a 10cm candidate can sit right against it at x 18', () => {
    // Off the 5 cm grid: x 18 to 28 is the only free gap between the two locked plants
    const result = placePlants(
      request({
        area: box(40, 10),
        fixed: [
          fixedPlant('left', 'neutral', 13, 5, PlantFootprint.of(10, 10)),
          fixedPlant('right', 'neutral', 34, 5, PlantFootprint.of(12, 10)),
        ],
        candidates: [candidate('a', 10)],
      }),
    );
    assert.deepEqual(positionOf(result, 'a'), [23, 5]);
  });

  test('given a 122cm wide area, fits a 22cm plant and five 20cm squares by aligning to edges, the last at x 102', () => {
    const wide: PlacementCandidate = { id: 'wide', plantId: 'w', footprint: PlantFootprint.of(22, 20), periodOptions: [period(10, 20)] };
    const squares = Array.from({ length: 5 }, (_, i) => candidate(`s${i}`, 20));
    const result = placePlants(request({ area: box(122, 20), candidates: [wide, ...squares] }));
    assert.deepEqual(result.unplaced, []);
    const lefts = result.placed.map((p) => p.xCm - (p.id === 'wide' ? 11 : 10)).sort((a, b) => a - b);
    assert.deepEqual(lefts, [0, 22, 42, 62, 82, 102]);
  });

  test('given an area width that is not a multiple of 5, uses the full width', () => {
    const candidates = Array.from({ length: 3 }, (_, i) => candidate(`p${i}`, 11));
    const result = placePlants(request({ area: box(33, 11), candidates }));
    assert.deepEqual(result.unplaced, []);
    assert.deepEqual(result.placed.map((p) => p.xCm).sort((a, b) => a - b), [5.5, 16.5, 27.5]);
  });

  test('given a circular area, only places footprints whose corners are all inside the circle', () => {
    const candidates = Array.from({ length: 6 }, (_, i) => candidate(`p${i}`, 20));
    const result = placePlants(request({ area: { shape: 'circle', diameterCm: 60 }, candidates }));
    assert.ok(result.placed.length > 0);
    for (const p of result.placed) {
      for (const [dx, dy] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
        assert.ok(Math.hypot(p.xCm + dx - 30, p.yCm + dy - 30) <= 30 + 1e-9);
      }
    }
  });

  test('given a circle of 60cm, a 50cm square does not fit although it is smaller than the diameter', () => {
    const result = placePlants(request({ area: { shape: 'circle', diameterCm: 60 }, candidates: [candidate('big', 50)] }));
    assert.equal(result.unplaced[0].reason, 'noSpace');
  });

  test('given a fixed plant and a companion candidate, places the companion against it', () => {
    const tomato = fixedPlant('t', 'tomato', 75, 30);
    const result = placePlants(
      request({ fixed: [tomato], candidates: [candidate('b', 30, undefined, 'basil')], relations: pairRelation('basil+tomato', 'companion') }),
    );
    // Without the relation basil would go to the top-left corner (15, 15), 30cm away
    const gap = gapBetween(positionOf(result, 'b')!, 30, [75, 30], 30);
    assert.ok(gap.x <= 5 && gap.y <= 5, `expected basil next to tomato, gap ${JSON.stringify(gap)}`);
  });

  test('given a fixed plant and a combative candidate, keeps them more than 5cm apart', () => {
    const result = placePlants(
      request({
        fixed: [fixedPlant('o', 'onion', 15, 15)],
        candidates: [candidate('b', 30, undefined, 'bean')],
        relations: pairRelation('bean+onion', 'combative'),
      }),
    );
    const gap = gapBetween(positionOf(result, 'b')!, 30, [15, 15], 30);
    assert.ok(gap.x > 5 || gap.y > 5, `expected a gap over 5cm, got ${JSON.stringify(gap)}`);
  });

  test('given a combative plant in another period, does not keep the candidate away from it', () => {
    const result = placePlants(
      request({
        fixed: [fixedPlant('o', 'onion', 15, 15, square(30), period(30, 40))],
        candidates: [candidate('b', 30, [period(10, 20)], 'bean')],
        relations: (): PlantRelation => 'combative',
      }),
    );
    assert.deepEqual(positionOf(result, 'b'), [15, 15]);
  });

  test('given a candidate without period options, reports it unplaced for lack of a planting window', () => {
    const result = placePlants(request({ candidates: [candidate('x', 30, [])] }));
    assert.deepEqual(result.unplaced, [{ id: 'x', reason: 'noPlantingWindow' }]);
    assert.deepEqual(result.placed, []);
  });

  test('given equal scores, chooses the earliest period option', () => {
    const result = placePlants(request({ candidates: [candidate('a', 30, [period(10, 20), period(11, 21)])] }));
    assert.equal(result.placed[0].period.startWeek, 10);
  });

  test('given a large and a small plant, places the largest footprint first', () => {
    const big: PlacementCandidate = { id: 'big', plantId: 'z', footprint: PlantFootprint.of(60, 30), periodOptions: [period(10, 20)] };
    const result = placePlants(request({ area: box(60, 30), candidates: [candidate('small'), big] }));
    assert.deepEqual(positionOf(result, 'big'), [30, 15]);
    assert.deepEqual(result.unplaced.map((u) => u.id), ['small']);
  });

  test('given the same request in a different order, returns the same result', () => {
    const candidates = [
      candidate('a', 30, [period(10, 20)], 'p1'),
      candidate('b', 20, [period(12, 25), period(13, 26)], 'p2'),
      candidate('c', 40, [period(5, 15)], 'p3'),
      candidate('d', 30, [period(10, 20)], 'p1'),
    ];
    const first = placePlants(request({ candidates }));
    const second = placePlants(request({ candidates: [...candidates].reverse() }));
    assert.deepEqual(second, first);
  });

  test('given 50 candidates in a 120x240 box, finishes in under 500 ms', () => {
    const sizes = [20, 30, 40, 24];
    const candidates = Array.from({ length: 50 }, (_, i) => {
      const start = 10 + (i % 8) * 3;
      const options = [-1, 0, 1].flatMap((shift) => [
        period(start + shift, start + shift + 10),
        period(start + shift + 2, start + shift + 14, 'directSow'),
      ]);
      return candidate(`c${i}`, sizes[i % sizes.length], options, `plant${i % 7}`);
    });
    const kinds: readonly PlantRelation[] = ['companion', 'combative', 'neutral'];
    const relations = (a: string, b: string): PlantRelation =>
      kinds[(Number(a.slice(-1)) + Number(b.slice(-1))) % kinds.length];

    const started = performance.now();
    const result = placePlants(request({ area: box(120, 240), candidates, relations }));
    const elapsedMs = performance.now() - started;

    assert.equal(result.placed.length + result.unplaced.length, 50);
    assert.ok(elapsedMs < 500, `took ${elapsedMs.toFixed(0)} ms`);
  });
});

describe('layoutScore', () => {
  const basil = candidate('b', 30, [period(10, 19)], 'basil');

  test('given a candidate touching a companion during its whole period, scores 1', () => {
    const req = request({ fixed: [fixedPlant('t', 'tomato', 15, 15, square(30), period(10, 19))], candidates: [basil], relations: pairRelation('basil+tomato', 'companion') });
    assert.equal(layoutScore(req, [{ id: 'b', xCm: 45, yCm: 15, period: period(10, 19) }]), 1);
  });

  test('given a companion sharing half of the candidate weeks, scores 0.5', () => {
    const req = request({ fixed: [fixedPlant('t', 'tomato', 15, 15, square(30), period(15, 24))], candidates: [basil], relations: pairRelation('basil+tomato', 'companion') });
    assert.equal(layoutScore(req, [{ id: 'b', xCm: 45, yCm: 15, period: period(10, 19) }]), 0.5);
  });

  test('given a companion 10cm away, scores 0', () => {
    const req = request({ fixed: [fixedPlant('t', 'tomato', 15, 15, square(30), period(10, 19))], candidates: [basil], relations: pairRelation('basil+tomato', 'companion') });
    assert.equal(layoutScore(req, [{ id: 'b', xCm: 55, yCm: 15, period: period(10, 19) }]), 0);
  });

  test('given a combative plant within 5cm, scores -2', () => {
    const req = request({ fixed: [fixedPlant('t', 'tomato', 15, 15, square(30), period(10, 19))], candidates: [basil], relations: pairRelation('basil+tomato', 'combative') });
    assert.equal(layoutScore(req, [{ id: 'b', xCm: 50, yCm: 15, period: period(10, 19) }]), -2);
  });

  test('given two placed companions side by side, each counts the other', () => {
    const tomato = candidate('t', 30, [period(10, 19)], 'tomato');
    const req = request({ candidates: [basil, tomato], relations: pairRelation('basil+tomato', 'companion') });
    const placed = [
      { id: 'b', xCm: 15, yCm: 15, period: period(10, 19) },
      { id: 't', xCm: 45, yCm: 15, period: period(10, 19) },
    ];
    assert.equal(layoutScore(req, placed), 2);
  });

  test('given a placed id that is not a candidate, refuses to score', () => {
    assert.throws(() => layoutScore(request({}), [{ id: 'ghost', xCm: 15, yCm: 15, period: period(10, 19) }]));
  });

  test('given a placement result, its layout score is the sum of what each greedy step gained', () => {
    const tomato = fixedPlant('t', 'tomato', 75, 30);
    const relations = (a: string, b: string): PlantRelation =>
      a === b ? 'neutral' : [a, b].includes('tomato') ? 'companion' : 'combative';
    const req = request({
      fixed: [tomato],
      candidates: [candidate('b1', 30, undefined, 'basil'), candidate('m1', 30, undefined, 'marigold')],
      relations,
    });
    const result = placePlants(req);
    // Both candidates sit against the tomato (+1 each) and away from each other
    assert.equal(layoutScore(req, result.placed), 2);
  });
});
