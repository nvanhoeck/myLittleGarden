import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Planning } from './Planning.ts';
import type { PlantingCalendar } from './PlantCalendar.ts';
import type { PlacementData, PlanningData, Season } from '../../types/planning.types.ts';

type CalendarTable = Record<string, { reach: readonly Season[]; grow: Partial<Record<Season, readonly Season[]>> }>;

const TABLE: CalendarTable = {
  tomaat: { reach: ['spring'], grow: { spring: ['spring', 'summer'] } },
  sla: { reach: ['spring', 'summer'], grow: { spring: ['spring'], summer: ['summer'] } },
  boerenkool: { reach: ['summer', 'autumn'], grow: { summer: ['summer', 'autumn'], autumn: ['autumn'] } },
  knoflook: { reach: [], grow: {} }, // has a window, but outside this planning year
};

function calendarOf(table: CalendarTable): PlantingCalendar {
  return {
    hasCalendar: (id) => id in table,
    reachableSeasons: (id) => table[id]?.reach ?? [],
    growingSeasons: (id, season) => table[id]?.grow[season] ?? [],
  };
}
const calendar = calendarOf(TABLE);

const placement = (id: string, plantingId: string, extra: Partial<PlacementData> = {}): PlacementData => ({
  id,
  plantId: plantingId.split('-')[0],
  plantingId,
  positionX: 10,
  positionY: 10,
  ...extra,
});

const withPlants = (...plantIds: string[]): Planning => Planning.from(undefined, calendar).addPlants(plantIds);

describe('adding plants', () => {
  test('a plant with a calendar gets its first planting in its first reachable season, ratio 1', () => {
    const planning = withPlants('sla', 'boerenkool');
    assert.deepEqual(planning.plantings.map((p) => [p.id, p.startSeason]), [['sla-spring', 'spring'], ['boerenkool-summer', 'summer']]);
    assert.equal(planning.ratioOf('spring', 'sla-spring'), 1);
  });

  test('a plant without calendar or outside the year is listed without plantings; duplicates are ignored', () => {
    const planning = withPlants('appel', 'knoflook', 'appel');
    assert.deepEqual(planning.plants, ['appel', 'knoflook']);
    assert.deepEqual(planning.plantings, []);
    assert.equal(planning.hasCalendar('appel'), false);
    assert.equal(planning.hasCalendar('knoflook'), true);
  });
});

describe('carrying over', () => {
  test('a planting is carried into its later growing seasons with its placements', () => {
    const planning = withPlants('tomaat').applyPlacement('spring', [placement('t1', 'tomaat-spring')]);
    assert.deepEqual(planning.plantingsCarriedInto('summer').map((p) => p.id), ['tomaat-spring']);
    assert.deepEqual(planning.carriedPlacementsIn('summer').map((p) => p.id), ['t1']);
    assert.deepEqual(planning.fixedPlacementsIn('summer').map((p) => p.id), ['t1']);
  });
});

describe('duplicating a planting', () => {
  const placed = withPlants('sla').applyPlacement('spring', [placement('s1', 'sla-spring')]);

  test('is only possible for a placed planting, into an available season', () => {
    assert.throws(() => withPlants('sla').duplicatePlanting('sla-spring', 'summer'), /niet geplaatst/);
    assert.throws(() => placed.duplicatePlanting('sla-spring', 'autumn'), /niet beschikbaar/);
    assert.deepEqual(placed.seasonsAvailableFor('sla-spring'), ['summer']);
  });

  test('adds a second planting in that season with ratio 1, numbered 2', () => {
    const duplicated = placed.duplicatePlanting('sla-spring', 'summer');
    assert.deepEqual(duplicated.plantingsOf('sla').map((p) => [p.id, p.startSeason]), [['sla-spring', 'spring'], ['sla-summer', 'summer']]);
    assert.equal(duplicated.ratioOf('summer', 'sla-summer'), 1);
    assert.equal(duplicated.plantingNumberOf('sla-summer'), 2);
    assert.deepEqual(duplicated.seasonsAvailableFor('sla-spring'), []);
  });

  test('outdates the target season when it was planned', () => {
    const planning = withPlants('sla', 'boerenkool')
      .applyPlacement('summer', [placement('b1', 'boerenkool-summer')])
      .applyPlacement('spring', [placement('s1', 'sla-spring')]);
    assert.equal(planning.duplicatePlanting('sla-spring', 'summer').statusOf('summer'), 'outdated');
  });
});

describe('moving a planting', () => {
  const placed = withPlants('sla').applyPlacement('spring', [placement('s1', 'sla-spring')]);

  test('keeps its id, loses its placements and fixed seasons, starts at ratio 1, and outdates both seasons', () => {
    const moved = placed.setRatio('spring', 'sla-spring', 3).applyPlacement('spring', [placement('s1', 'sla-spring')]).movePlanting('sla-spring', 'summer');
    const planting = moved.plantingById('sla-spring');
    assert.deepEqual([planting?.startSeason, planting?.fixedSeasons], ['summer', undefined]);
    assert.deepEqual(moved.placementsIn('spring'), []);
    assert.equal(moved.ratioOf('summer', 'sla-spring'), 1);
    assert.equal(moved.toData().seasons.spring.ratios['sla-spring'], undefined);
    assert.equal(moved.statusOf('spring'), 'outdated');
  });

  test('can move back to an earlier season once placed again', () => {
    const inSummer = placed.movePlanting('sla-spring', 'summer').applyPlacement('summer', [placement('s2', 'sla-spring')]);
    assert.deepEqual(inSummer.seasonsAvailableFor('sla-spring'), ['spring']);
    assert.equal(inSummer.movePlanting('sla-spring', 'spring').plantingById('sla-spring')?.startSeason, 'spring');
  });

  test('a second planting created in a season whose id is taken by a moved planting gets a suffix', () => {
    const inSummer = placed.movePlanting('sla-spring', 'summer').applyPlacement('summer', [placement('s2', 'sla-spring')]);
    const duplicated = inSummer.duplicatePlanting('sla-spring', 'spring');
    assert.deepEqual(duplicated.plantingsOf('sla').map((p) => p.id), ['sla-spring-2', 'sla-spring']);
  });
});

describe('removing', () => {
  test('removing one of two plantings keeps the plant and renumbers the other', () => {
    const planning = withPlants('sla')
      .applyPlacement('spring', [placement('s1', 'sla-spring')])
      .duplicatePlanting('sla-spring', 'summer')
      .removePlanting('sla-spring');
    assert.deepEqual(planning.plants, ['sla']);
    assert.deepEqual(planning.plantings.map((p) => p.id), ['sla-summer']);
    assert.equal(planning.plantingNumberOf('sla-summer'), 1);
    assert.deepEqual(planning.placementsIn('spring'), []);
    assert.equal(planning.statusOf('spring'), 'outdated');
  });

  test('removing the last planting removes the plant', () => {
    assert.deepEqual(withPlants('sla').removePlanting('sla-spring').plants, []);
  });

  test('removing a plant removes all its plantings, ratios and placements', () => {
    const planning = withPlants('sla').applyPlacement('spring', [placement('s1', 'sla-spring')]).duplicatePlanting('sla-spring', 'summer').removePlant('sla');
    assert.deepEqual([planning.plants, planning.plantings, planning.placementsIn('spring')], [[], [], []]);
    assert.deepEqual(planning.toData().seasons.summer.ratios, {});
  });
});

describe('setRatio', () => {
  test('only for a planting starting in the season, with a whole ratio of at least 1', () => {
    const planning = withPlants('tomaat');
    assert.equal(planning.setRatio('spring', 'tomaat-spring', 2).ratioOf('spring', 'tomaat-spring'), 2);
    assert.throws(() => planning.setRatio('summer', 'tomaat-spring', 2), /start niet/);
    assert.throws(() => planning.setRatio('spring', 'tomaat-spring', 0), /Ongeldige verhouding/);
  });
});

describe('applyPlacement', () => {
  test('freezes the growing seasons of placed plantings and clears them for unplaced ones', () => {
    const planning = withPlants('tomaat', 'sla').applyPlacement('spring', [placement('t1', 'tomaat-spring')]);
    assert.deepEqual(planning.plantingById('tomaat-spring')?.fixedSeasons, ['spring', 'summer']);
    assert.equal(planning.plantingById('sla-spring')?.fixedSeasons, undefined);
    assert.equal(planning.statusOf('spring'), 'planned');
  });

  test('outdates a planned later season that the placed planting is carried into', () => {
    const planning = withPlants('tomaat', 'boerenkool')
      .applyPlacement('summer', [placement('b1', 'boerenkool-summer')])
      .applyPlacement('spring', [placement('t1', 'tomaat-spring')]);
    assert.equal(planning.statusOf('summer'), 'outdated');
  });

  test('keeps locked placements', () => {
    const planning = withPlants('sla')
      .applyPlacement('spring', [placement('locked', 'sla-spring', { locked: true }), placement('loose', 'sla-spring')])
      .applyPlacement('spring', [placement('new', 'sla-spring')]);
    assert.deepEqual(planning.placementsIn('spring').map((p) => p.id), ['locked', 'new']);
  });
});

describe('reconciling with a new calendar (frost-date change and every load)', () => {
  const placedTomato = withPlants('tomaat', 'sla').applyPlacement('spring', [placement('t1', 'tomaat-spring')]);
  // After a later frost date: tomato and lettuce only reach summer
  const later = calendarOf({
    ...TABLE,
    tomaat: { reach: ['summer'], grow: { summer: ['summer'] } },
    sla: { reach: ['summer'], grow: { summer: ['summer'] } },
  });

  test('a placed planting keeps its season, placements, fixed seasons and its season status', () => {
    const onlyTomato = withPlants('tomaat').applyPlacement('spring', [placement('t1', 'tomaat-spring')]);
    const planning = Planning.from(onlyTomato.toData(), later);
    assert.deepEqual(planning.plantingById('tomaat-spring')?.startSeason, 'spring');
    assert.deepEqual(planning.plantingById('tomaat-spring')?.fixedSeasons, ['spring', 'summer']);
    assert.deepEqual(planning.placementsIn('spring').map((p) => p.id), ['t1']);
    assert.equal(planning.statusOf('spring'), 'planned');
  });

  test('an unplaced planting moves to the first available season with ratio 1; the season it left becomes outdated', () => {
    const planning = Planning.from(placedTomato.setRatio('spring', 'sla-spring', 4).toData(), later);
    assert.deepEqual([planning.plantingById('sla-spring')?.startSeason, planning.ratioOf('summer', 'sla-spring')], ['summer', 1]);
    assert.equal(planning.toData().seasons.spring.ratios['sla-spring'], undefined);
    assert.equal(planning.statusOf('spring'), 'outdated');
  });

  test('an unplaced planting is dropped when every reachable season already has a planting of the plant', () => {
    const data: PlanningData = {
      plants: ['sla'],
      plantings: [
        { id: 'sla-spring', plantId: 'sla', startSeason: 'spring' },
        { id: 'sla-summer', plantId: 'sla', startSeason: 'summer' },
      ],
      seasons: {
        spring: { ratios: { 'sla-spring': 1 }, placements: [], status: 'notPlanned' },
        summer: { ratios: { 'sla-summer': 1 }, placements: [placement('s2', 'sla-summer')], status: 'planned' },
        autumn: { ratios: {}, placements: [], status: 'notPlanned' },
        winter: { ratios: {}, placements: [], status: 'notPlanned' },
      },
    };
    assert.deepEqual(Planning.from(data, later).plantings.map((p) => p.id), ['sla-summer']);
  });

  test('a placed planting without fixed seasons (migrated) gets them from the calendar', () => {
    const data = placedTomato.toData();
    const withoutFixed: PlanningData = { ...data, plantings: data.plantings.map(({ fixedSeasons: _f, ...p }) => p) };
    assert.deepEqual(Planning.from(withoutFixed, calendar).plantingById('tomaat-spring')?.fixedSeasons, ['spring', 'summer']);
  });

  test('an unplaced planting that still has fixed seasons loses them', () => {
    const data = withPlants('tomaat').applyPlacement('spring', [placement('t1', 'tomaat-spring')]).removePlacement('spring', 't1').toData();
    assert.deepEqual(data.plantings[0].fixedSeasons, ['spring', 'summer']);
    assert.equal(Planning.from(data, calendar).plantingById('tomaat-spring')?.fixedSeasons, undefined);
  });

  test('plantings stay as they are when the plant reaches no season at all', () => {
    const nothing: PlantingCalendar = { hasCalendar: () => true, reachableSeasons: () => [], growingSeasons: () => [] };
    const data = withPlants('sla').setRatio('spring', 'sla-spring', 4).toData();
    const planning = Planning.from(data, nothing);
    assert.notEqual(planning.plantingById('sla-spring'), undefined);
    assert.equal(planning.ratioOf('spring', 'sla-spring'), 4);
    assert.equal(planning.reconciled(), planning);
  });

  test('a plant in the list without planting gets its first planting', () => {
    const data: PlanningData = { ...Planning.from(undefined, calendar).toData(), plants: ['boerenkool'] };
    assert.deepEqual(Planning.from(data, calendar).plantings.map((p) => p.id), ['boerenkool-summer']);
  });

  test('is idempotent: reconciling again gives the same planning and the same ids', () => {
    const once = Planning.from(placedTomato.setRatio('spring', 'sla-spring', 4).toData(), later);
    assert.equal(once.reconciled(), once);
    assert.deepEqual(Planning.from(once.toData(), later).toData(), once.toData());
  });
});

describe('changing one placement', () => {
  const planned = withPlants('tomaat', 'boerenkool')
    .applyPlacement('spring', [placement('t1', 'tomaat-spring')])
    .applyPlacement('summer', [placement('b1', 'boerenkool-summer')]);

  test('moving a carried planting outdates the later seasons it grows in, not its own season', () => {
    const moved = planned.movePlacement('spring', 't1', 50, 60);
    assert.deepEqual([moved.placementsIn('spring')[0].positionX, moved.statusOf('spring'), moved.statusOf('summer')], [50, 'planned', 'outdated']);
  });

  test('locking changes no status', () => {
    assert.equal(planned.toggleLock('spring', 't1').setAllLocked('summer', true).statusOf('summer'), 'planned');
  });
});
