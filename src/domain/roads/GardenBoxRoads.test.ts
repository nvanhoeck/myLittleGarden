import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addRoadTo,
  innerSizeOf,
  placeAutomaticRoadsIn,
  removeRoadFrom,
  ringFitsIn,
  setAllRoadsLockedIn,
  setRoadWidthIn,
  toggleRoadLockIn,
} from './GardenBoxRoads.ts';
import { Planning } from '../planning/Planning.ts';
import type { PlantingCalendar } from '../planning/PlantCalendar.ts';
import type { GardenBoxData } from '../../types/component.types.ts';
import type { AreaData, PlanningData, Season } from '../../types/planning.types.ts';

const calendarOf = (): PlantingCalendar => ({
  hasCalendar: () => true,
  reachableSeasons: () => ['spring'],
  growingSeasons: (_id: string, season: Season) => [season],
});
const minSideOf = (): number => 10;

const emptySeason = { ratios: {}, areas: [] as AreaData[], status: 'planned' as const };
const area = (id: string, x: number, y: number, w: number, l: number): AreaData => ({
  id,
  plantingId: `${id}-spring`,
  plantId: id,
  pieces: [{ xCm: x, yCm: y, widthCm: w, lengthCm: l }],
});
const planningWith = (areas: AreaData[]): PlanningData => ({
  plants: areas.map((a) => a.plantId),
  plantings: areas.map((a) => ({ id: a.plantingId, plantId: a.plantId, startSeason: 'spring' as const })),
  seasons: {
    spring: { ...emptySeason, ratios: Object.fromEntries(areas.map((a) => [a.plantingId, 1])), areas },
    summer: emptySeason,
    autumn: emptySeason,
    winter: emptySeason,
  },
});

// inner size 100 x 100 (120 x 120 minus 2 x 10 border)
const makeBox = (): GardenBoxData => ({
  id: 'box',
  name: 'Bak',
  type: 'gardenBox',
  sunDirection: 'S',
  createdAt: '2026-01-01T00:00:00.000Z',
  borderWidthInCm: 10,
  widthInCm: 120,
  lengthInCm: 120,
  roads: [],
  plannings: {
    '2026': planningWith([area('a', 0, 0, 50, 100), area('b', 50, 0, 50, 100)]),
    '2027': planningWith([area('a', 0, 0, 100, 100)]),
  },
});

let counter = 0;
const newId = (): string => `road-${++counter}`;
const context = { calendarOf, minSideOf, newId };
const areasOf = (box: GardenBoxData, year: string, season: Season = 'spring'): readonly AreaData[] =>
  Planning.from(box.plannings[year], calendarOf()).areasIn(season);

describe('innerSizeOf', () => {
  test('is the box minus its borders', () => {
    assert.deepEqual(innerSizeOf(makeBox()), { widthCm: 100, lengthCm: 100 });
  });
});

describe('ringFitsIn', () => {
  test('a ring fits while twice its width stays below the short inner side', () => {
    assert.equal(ringFitsIn(makeBox(), 45), true);
    assert.equal(ringFitsIn(makeBox(), 50), false);
    assert.equal(ringFitsIn(makeBox(), 60), false);
  });
});

describe('addRoadTo', () => {
  test('adds the road on the border and cuts back areas in every year', () => {
    const border = { orientation: 'vertical' as const, lineCm: 50, fromCm: 0, toCm: 100, kind: 'between' as const };
    const box = addRoadTo(makeBox(), { ...context, border, widthCm: 20 });
    assert.equal(box.roads?.length, 1);
    assert.deepEqual(box.roads?.[0], { id: 'road-1', xCm: 40, yCm: 0, widthCm: 20, lengthCm: 100, orientation: 'vertical' });
    const total2026 = areasOf(box, '2026').flatMap((a) => a.pieces).reduce((sum, p) => sum + p.widthCm * p.lengthCm, 0);
    assert.ok(total2026 <= 80 * 100 + 0.001);
    const pieces2027 = areasOf(box, '2027').flatMap((a) => a.pieces);
    assert.ok(pieces2027.every((p) => p.xCm + p.widthCm <= 40 + 0.001 || p.xCm >= 60 - 0.001));
    assert.ok(pieces2027.length >= 1);
  });

  test('a border without room for the road changes nothing', () => {
    const border = { orientation: 'vertical' as const, lineCm: 50, fromCm: 0, toCm: 100, kind: 'between' as const };
    const box = makeBox();
    assert.equal(addRoadTo(box, { ...context, border, widthCm: 500 }), box);
  });
});

describe('placeAutomaticRoadsIn', () => {
  test('puts a road between the areas of the shown season and cuts back every year', () => {
    const box = placeAutomaticRoadsIn(makeBox(), { ...context, year: 2026, season: 'spring', widthCm: 20, withRing: false });
    assert.equal(box.roads?.length, 1);
    const road = box.roads![0];
    assert.ok(areasOf(box, '2027').flatMap((a) => a.pieces).every((p) => p.xCm + p.widthCm <= road.xCm + 0.001 || p.xCm >= road.xCm + road.widthCm - 0.001));
  });

  const geometry = (box: GardenBoxData): string[] =>
    (box.roads ?? []).map((r) => `${r.xCm},${r.yCm},${r.widthCm},${r.lengthCm},${r.orientation},${r.locked === true}`).sort();
  const run = (box: GardenBoxData, widthCm: number, withRing = true): GardenBoxData =>
    placeAutomaticRoadsIn(box, { ...context, year: 2026, season: 'spring', widthCm, withRing });

  test('running twice with the same width gives the same roads', () => {
    const once = run(makeBox(), 20);
    const twice = run(once, 20);
    assert.deepEqual(geometry(twice), geometry(once));
    assert.equal(once.roads?.length, 5);
    assert.equal(new Set(twice.roads?.map((r) => r.id)).size, twice.roads?.length);
  });

  test('a ring wider than its side roads are long is replaced on a re-run, leaving no stubs', () => {
    // inner 100 x 120: a 45 cm ring leaves side roads of 45 x 30
    const tall: GardenBoxData = { ...makeBox(), lengthInCm: 140 };
    const once = run(tall, 45);
    const sides = once.roads!.filter((r) => r.lengthCm === 30 && (r.xCm === 0 || r.xCm === 55));
    assert.equal(sides.length, 2);
    assert.ok(sides.every((r) => r.orientation === 'vertical' && r.widthCm === 45));
    const twice = run(once, 45);
    assert.deepEqual(geometry(twice), geometry(once));
    assert.equal(twice.roads?.length, once.roads?.length);
  });

  test('running again with another width keeps the between road on its centre line', () => {
    const once = run(makeBox(), 20);
    const between = once.roads!.find((r) => r.xCm === 40)!;
    const again = run(once, 30);
    const kept = again.roads!.find((r) => r.id === between.id)!;
    assert.equal(kept.widthCm, 30);
    assert.equal(kept.xCm + kept.widthCm / 2, between.xCm + between.widthCm / 2);
  });

  test('with a locked road, running twice keeps it, the between roads and adds no duplicates', () => {
    const locked = { id: 'keep', xCm: 0, yCm: 0, widthCm: 20, lengthCm: 100, orientation: 'vertical' as const, locked: true };
    const start: GardenBoxData = { ...makeBox(), roads: [locked] };
    const once = run(start, 20, false);
    const twice = run(once, 20, false);
    assert.deepEqual(twice.roads?.find((r) => r.id === 'keep'), locked);
    assert.deepEqual(geometry(twice), geometry(once));
    assert.ok(twice.roads!.length >= 2);
  });

  test('an invalid width changes nothing', () => {
    const box = makeBox();
    assert.equal(run(box, 5), box);
    assert.equal(run(box, 20.5), box);
    assert.equal(run(box, 250), box);
  });

  test('a locked road survives and is not duplicated', () => {
    const locked = { id: 'keep', xCm: 40, yCm: 0, widthCm: 20, lengthCm: 100, orientation: 'vertical' as const, locked: true };
    const start: GardenBoxData = { ...makeBox(), roads: [locked, { id: 'drop', xCm: 0, yCm: 0, widthCm: 10, lengthCm: 100, orientation: 'vertical' }] };
    const box = placeAutomaticRoadsIn(start, { ...context, year: 2026, season: 'spring', widthCm: 20, withRing: false });
    assert.ok(box.roads?.some((r) => r.id === 'keep' && r.locked === true));
    assert.equal(box.roads?.some((r) => r.id === 'drop'), false);
    assert.equal(box.roads?.length, 1);
  });
});

describe('road edits', () => {
  const withRoad = (): GardenBoxData => ({ ...makeBox(), roads: [{ id: 'r', xCm: 45, yCm: 0, widthCm: 10, lengthCm: 100, orientation: 'vertical' }] });

  test('a road on a short edge stretch only gets wider across its border (scenario A)', () => {
    const edgeRoad = { id: 'e', xCm: 0, yCm: 50, widthCm: 30, lengthCm: 20, orientation: 'vertical' as const };
    const box = setRoadWidthIn({ ...makeBox(), roads: [edgeRoad] }, 'e', { ...context, widthCm: 40 });
    assert.deepEqual(box.roads?.[0], { ...edgeRoad, widthCm: 40 });
  });

  test('a wider road cuts areas back in every year', () => {
    const box = setRoadWidthIn(withRoad(), 'r', { ...context, widthCm: 40 });
    assert.equal(box.roads?.[0].widthCm, 40);
    const pieces = areasOf(box, '2027').flatMap((a) => a.pieces);
    assert.ok(pieces.every((p) => p.xCm + p.widthCm <= 30 + 0.001 || p.xCm >= 70 - 0.001));
  });

  test('toggling lock flips locked; removing drops the road', () => {
    const locked = toggleRoadLockIn(withRoad(), 'r');
    assert.equal(locked.roads?.[0].locked, true);
    assert.equal(toggleRoadLockIn(locked, 'r').roads?.[0].locked, false);
    assert.deepEqual(removeRoadFrom(locked, 'r').roads, []);
  });

  test('set all locked sets every road', () => {
    const box = setAllRoadsLockedIn({ ...withRoad(), roads: [...withRoad().roads!, { id: 's', xCm: 0, yCm: 0, widthCm: 10, lengthCm: 100, orientation: 'vertical' }] }, true);
    assert.deepEqual(box.roads?.map((r) => r.locked), [true, true]);
  });

  test('an invalid width changes nothing', () => {
    const box = withRoad();
    assert.equal(setRoadWidthIn(box, 'r', { ...context, widthCm: 7 }), box);
    const border = { orientation: 'vertical' as const, lineCm: 50, fromCm: 0, toCm: 100, kind: 'between' as const };
    assert.equal(addRoadTo(makeBox(), { ...context, border, widthCm: 12.5 }).roads?.length, 0);
  });

  test('a width change that cuts nothing keeps the same box', () => {
    const box = setRoadWidthIn(withRoad(), 'r', { ...context, widthCm: 20 });
    assert.equal(setRoadWidthIn(box, 'r', { ...context, widthCm: 20 }), box);
  });

  test('unknown road ids change nothing', () => {
    const box = withRoad();
    assert.equal(toggleRoadLockIn(box, 'x'), box);
    assert.equal(removeRoadFrom(box, 'x'), box);
    assert.equal(setRoadWidthIn(box, 'x', { ...context, widthCm: 30 }), box);
  });
});
