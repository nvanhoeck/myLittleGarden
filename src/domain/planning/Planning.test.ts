import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Planning } from './Planning.ts';
import type { PlantingCalendar } from './PlantCalendar.ts';
import type { PlantingArea } from './PlantingArea.ts';
import type { AreaData, AreaPiece, PlanningData, Season } from '../../types/planning.types.ts';

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

const piece = (xCm: number, yCm: number, widthCm = 20, lengthCm = 20): AreaPiece => ({ xCm, yCm, widthCm, lengthCm });

const area = (id: string, plantingId: string, extra: Partial<AreaData> = {}): AreaData => ({
  id,
  plantId: plantingId.split('-')[0],
  plantingId,
  pieces: [piece(10, 10)],
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

describe('areas of a planting', () => {
  test('a planting is placed when it has an area in its start season', () => {
    const planning = withPlants('tomaat', 'sla').applyAreas('spring', [area('t1', 'tomaat-spring')]);
    assert.equal(planning.areaOf('tomaat-spring')?.id, 't1');
    assert.equal(planning.isPlaced('tomaat-spring'), true);
    assert.equal(planning.areaOf('sla-spring'), undefined);
    assert.equal(planning.isPlaced('sla-spring'), false);
    assert.deepEqual(planning.areasIn('spring').map((a) => a.id), ['t1']);
  });
});

describe('carrying over', () => {
  test('a planting is carried into its later growing seasons with its area', () => {
    const planning = withPlants('tomaat').applyAreas('spring', [area('t1', 'tomaat-spring')]);
    assert.deepEqual(planning.plantingsCarriedInto('summer').map((p) => p.id), ['tomaat-spring']);
    assert.deepEqual(planning.carriedAreasIn('summer').map((a) => a.id), ['t1']);
    assert.deepEqual(planning.fixedAreasIn('summer').map((a) => a.id), ['t1']);
  });

  test('fixed areas of a season are the carried ones and its own locked ones', () => {
    const planning = withPlants('tomaat', 'sla', 'boerenkool')
      .applyAreas('spring', [area('t1', 'tomaat-spring'), area('s1', 'sla-spring', { locked: true })])
      .applyAreas('summer', [area('b1', 'boerenkool-summer', { locked: true })])
      .duplicatePlanting('sla-spring', 'summer')
      .applyAreas('summer', [area('s2', 'sla-summer')]);
    assert.deepEqual(planning.fixedAreasIn('summer').map((a) => a.id), ['t1', 'b1']);
  });
});

describe('duplicating a planting', () => {
  const placed = withPlants('sla').applyAreas('spring', [area('s1', 'sla-spring')]);

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
      .applyAreas('summer', [area('b1', 'boerenkool-summer')])
      .applyAreas('spring', [area('s1', 'sla-spring')]);
    assert.equal(planning.duplicatePlanting('sla-spring', 'summer').statusOf('summer'), 'outdated');
  });
});

describe('moving a planting', () => {
  const placed = withPlants('sla').applyAreas('spring', [area('s1', 'sla-spring')]);

  test('keeps its id, loses its area and fixed seasons, starts at ratio 1, and outdates both seasons', () => {
    const moved = placed.setRatio('spring', 'sla-spring', 3).applyAreas('spring', [area('s1', 'sla-spring')]).movePlanting('sla-spring', 'summer');
    const planting = moved.plantingById('sla-spring');
    assert.deepEqual([planting?.startSeason, planting?.fixedSeasons], ['summer', undefined]);
    assert.deepEqual(moved.areasIn('spring'), []);
    assert.equal(moved.isPlaced('sla-spring'), false);
    assert.equal(moved.ratioOf('summer', 'sla-spring'), 1);
    assert.equal(moved.toData().seasons.spring.ratios['sla-spring'], undefined);
    assert.equal(moved.statusOf('spring'), 'outdated');
  });

  test('can move back to an earlier season once placed again', () => {
    const inSummer = placed.movePlanting('sla-spring', 'summer').applyAreas('summer', [area('s2', 'sla-spring')]);
    assert.deepEqual(inSummer.seasonsAvailableFor('sla-spring'), ['spring']);
    assert.equal(inSummer.movePlanting('sla-spring', 'spring').plantingById('sla-spring')?.startSeason, 'spring');
  });

  test('a second planting created in a season whose id is taken by a moved planting gets a suffix', () => {
    const inSummer = placed.movePlanting('sla-spring', 'summer').applyAreas('summer', [area('s2', 'sla-spring')]);
    const duplicated = inSummer.duplicatePlanting('sla-spring', 'spring');
    assert.deepEqual(duplicated.plantingsOf('sla').map((p) => p.id), ['sla-spring-2', 'sla-spring']);
  });
});

describe('removing', () => {
  test('removing one of two plantings keeps the plant and renumbers the other', () => {
    const planning = withPlants('sla')
      .applyAreas('spring', [area('s1', 'sla-spring')])
      .duplicatePlanting('sla-spring', 'summer')
      .removePlanting('sla-spring');
    assert.deepEqual(planning.plants, ['sla']);
    assert.deepEqual(planning.plantings.map((p) => p.id), ['sla-summer']);
    assert.equal(planning.plantingNumberOf('sla-summer'), 1);
    assert.deepEqual(planning.areasIn('spring'), []);
    assert.equal(planning.statusOf('spring'), 'outdated');
  });

  test('removing the last planting removes the plant', () => {
    assert.deepEqual(withPlants('sla').removePlanting('sla-spring').plants, []);
  });

  test('removing a plant removes all its plantings, ratios and areas', () => {
    const planning = withPlants('sla').applyAreas('spring', [area('s1', 'sla-spring')]).duplicatePlanting('sla-spring', 'summer').removePlant('sla');
    assert.deepEqual([planning.plants, planning.plantings, planning.areasIn('spring')], [[], [], []]);
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

describe('applyAreas', () => {
  test('freezes the growing seasons of placed plantings and clears them for unplaced ones', () => {
    const planning = withPlants('tomaat', 'sla').applyAreas('spring', [area('t1', 'tomaat-spring')]);
    assert.deepEqual(planning.plantingById('tomaat-spring')?.fixedSeasons, ['spring', 'summer']);
    assert.equal(planning.plantingById('sla-spring')?.fixedSeasons, undefined);
    assert.equal(planning.statusOf('spring'), 'planned');
  });

  test('unfreezes a planting that loses its area on a new run', () => {
    const planning = withPlants('tomaat').applyAreas('spring', [area('t1', 'tomaat-spring')]).applyAreas('spring', []);
    assert.equal(planning.plantingById('tomaat-spring')?.fixedSeasons, undefined);
  });

  test('outdates a planned later season that the placed planting is carried into', () => {
    const planning = withPlants('tomaat', 'boerenkool')
      .applyAreas('summer', [area('b1', 'boerenkool-summer')])
      .applyAreas('spring', [area('t1', 'tomaat-spring')]);
    assert.equal(planning.statusOf('summer'), 'outdated');
  });

  test('keeps locked areas and replaces the unlocked ones; a new area of a locked planting is ignored', () => {
    const planning = withPlants('sla', 'tomaat')
      .applyAreas('spring', [area('locked', 'sla-spring', { locked: true }), area('loose', 'tomaat-spring')])
      .applyAreas('spring', [area('new', 'tomaat-spring'), area('again', 'sla-spring')]);
    assert.deepEqual(planning.areasIn('spring').map((a) => a.id), ['locked', 'new']);
  });

  test('ignores areas of unknown plantings and of plantings starting in another season', () => {
    const planning = withPlants('sla', 'boerenkool')
      .applyAreas('spring', [area('ghost', 'spook-spring'), area('kale', 'boerenkool-summer'), area('s1', 'sla-spring')]);
    assert.deepEqual(planning.areasIn('spring').map((a) => a.id), ['s1']);
  });

  test('keeps only the first area of a planting', () => {
    const planning = withPlants('sla').applyAreas('spring', [area('first', 'sla-spring'), area('second', 'sla-spring')]);
    assert.deepEqual(planning.areasIn('spring').map((a) => a.id), ['first']);
  });
});

describe('reconciling with a new calendar (frost-date change and every load)', () => {
  const placedTomato = withPlants('tomaat', 'sla').applyAreas('spring', [area('t1', 'tomaat-spring')]);
  // After a later frost date: tomato and lettuce only reach summer
  const later = calendarOf({
    ...TABLE,
    tomaat: { reach: ['summer'], grow: { summer: ['summer'] } },
    sla: { reach: ['summer'], grow: { summer: ['summer'] } },
  });

  test('a placed planting keeps its season, area, fixed seasons and its season status', () => {
    const onlyTomato = withPlants('tomaat').applyAreas('spring', [area('t1', 'tomaat-spring')]);
    const planning = Planning.from(onlyTomato.toData(), later);
    assert.deepEqual(planning.plantingById('tomaat-spring')?.startSeason, 'spring');
    assert.deepEqual(planning.plantingById('tomaat-spring')?.fixedSeasons, ['spring', 'summer']);
    assert.deepEqual(planning.areasIn('spring').map((a) => a.id), ['t1']);
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
        spring: { ratios: { 'sla-spring': 1 }, areas: [], status: 'notPlanned' },
        summer: { ratios: { 'sla-summer': 1 }, areas: [area('s2', 'sla-summer')], status: 'planned' },
        autumn: { ratios: {}, areas: [], status: 'notPlanned' },
        winter: { ratios: {}, areas: [], status: 'notPlanned' },
      },
    };
    assert.deepEqual(Planning.from(data, later).plantings.map((p) => p.id), ['sla-summer']);
  });

  test('a placed planting without fixed seasons (migrated) gets them from the calendar', () => {
    const data = placedTomato.toData();
    const withoutFixed: PlanningData = { ...data, plantings: data.plantings.map(({ fixedSeasons: _f, ...p }) => p) };
    assert.deepEqual(Planning.from(withoutFixed, calendar).plantingById('tomaat-spring')?.fixedSeasons, ['spring', 'summer']);
  });

  describe('a placed planting whose start season the plant cannot reach', () => {
    const garlic = calendarOf({ ...TABLE, knoflook: { reach: ['autumn', 'winter'], grow: { autumn: ['autumn', 'winter'], winter: ['winter'] } } });
    const garlicData = (fixedSeasons?: Season[]): PlanningData => ({
      plants: ['knoflook'],
      plantings: [{ id: 'knoflook-spring', plantId: 'knoflook', startSeason: 'spring', ...(fixedSeasons ? { fixedSeasons } : {}) }],
      seasons: {
        spring: { ratios: { 'knoflook-spring': 3 }, areas: [area('k1', 'knoflook-spring')], status: 'planned' },
        summer: { ratios: {}, areas: [], status: 'notPlanned' },
        autumn: { ratios: {}, areas: [], status: 'notPlanned' },
        winter: { ratios: {}, areas: [], status: 'notPlanned' },
      },
    });

    test('without fixed seasons (migrated) it is treated as unplaced and moves to the first available season', () => {
      const planning = Planning.from(garlicData(), garlic);
      assert.deepEqual(planning.plantings.map((p) => [p.id, p.startSeason]), [['knoflook-spring', 'autumn']]);
      assert.deepEqual(planning.areasIn('spring'), []);
      assert.equal(planning.toData().seasons.spring.ratios['knoflook-spring'], undefined);
      assert.equal(planning.ratioOf('autumn', 'knoflook-spring'), 1);
      assert.equal(planning.statusOf('spring'), 'outdated');
    });

    test('with fixed seasons it stays in spring', () => {
      const planning = Planning.from(garlicData(['spring', 'summer']), garlic);
      assert.equal(planning.plantingById('knoflook-spring')?.startSeason, 'spring');
      assert.deepEqual(planning.areasIn('spring').map((a) => a.id), ['k1']);
      assert.equal(planning.statusOf('spring'), 'planned');
    });
  });

  test('a placed planting without fixed seasons, frozen with one calendar and loaded with another, keeps the first calendar seasons', () => {
    const data = placedTomato.toData();
    const withoutFixed: PlanningData = { ...data, plantings: data.plantings.map(({ fixedSeasons: _f, ...p }) => p) };
    const frozen = Planning.from(withoutFixed, calendar);
    assert.deepEqual(Planning.from(frozen.toData(), later).plantingById('tomaat-spring')?.fixedSeasons, ['spring', 'summer']);
  });

  test('an unplaced planting that still has fixed seasons loses them', () => {
    const placed = withPlants('tomaat').applyAreas('spring', [area('t1', 'tomaat-spring')]).toData();
    const data: PlanningData = { ...placed, seasons: { ...placed.seasons, spring: { ...placed.seasons.spring, areas: [] } } };
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

describe('changing one area', () => {
  const box: PlantingArea = { shape: 'rectangle', widthCm: 100, lengthCm: 100 };
  const bounds = (): PlantingArea => box;
  // Tomato (spring, carried into summer) at 10,10; kale (summer) at 50,10 and 50,50 (two pieces)
  const planned = withPlants('tomaat', 'boerenkool', 'sla')
    .applyAreas('spring', [area('t1', 'tomaat-spring'), area('s1', 'sla-spring', { pieces: [piece(10, 50)] })])
    .applyAreas('summer', [area('b1', 'boerenkool-summer', { pieces: [piece(50, 10), piece(50, 50)] })]);

  test('moving an area moves all its pieces and outdates the later seasons it grows in, not its own season', () => {
    const moved = planned.moveArea('spring', 't1', 5, -5, bounds);
    assert.deepEqual(moved.areaOf('tomaat-spring')?.pieces, [piece(15, 5)]);
    assert.deepEqual([moved.statusOf('spring'), moved.statusOf('summer')], ['planned', 'outdated']);
    const kale = planned.moveArea('summer', 'b1', 10, 0, bounds).areaOf('boerenkool-summer');
    assert.deepEqual(kale?.pieces, [piece(60, 10), piece(60, 50)]);
  });

  test('a move that leaves the layer, overlaps another area of the season or a carried area is refused', () => {
    assert.equal(planned.moveArea('spring', 't1', -20, 0, bounds), planned);
    assert.equal(planned.moveArea('spring', 't1', 0, 75, bounds), planned);
    assert.equal(planned.moveArea('spring', 't1', 0, 30, bounds), planned); // onto the lettuce
    assert.equal(planned.moveArea('summer', 'b1', -30, 0, bounds), planned); // onto the carried tomato
    assert.notEqual(planned.moveArea('spring', 't1', 0, 20, bounds), planned); // touching the lettuce is fine
  });

  test('an area carried into a later season cannot be moved or resized over an area of that season', () => {
    const lockedKale = planned.setAllLocked('summer', true);
    assert.equal(lockedKale.moveArea('spring', 't1', 40, 0, bounds), lockedKale); // onto the summer kale
    assert.equal(lockedKale.resizeArea('spring', 't1', 0, 45, 20, bounds), lockedKale);
    assert.equal(planned.moveArea('spring', 't1', 40, 0, bounds), planned); // unlocked kale counts too
    assert.equal(planned.moveArea('spring', 's1', 40, 0, bounds).areaOf('sla-spring')?.pieces[0].xCm, 50); // lettuce is not carried
  });

  test('a move is checked against the bounding box of the area\'s own layer', () => {
    const tower = withPlants('sla').applyAreas('spring', [area('s1', 'sla-spring', { layerIndex: 1 })]);
    const layers: PlantingArea[] = [{ shape: 'rectangle', widthCm: 200, lengthCm: 200 }, { shape: 'circle', diameterCm: 40 }];
    assert.equal(tower.moveArea('spring', 's1', 20, 0, (i) => layers[i]), tower);
    assert.deepEqual(tower.moveArea('spring', 's1', 10, 10, (i) => layers[i]).areaOf('sla-spring')?.pieces, [piece(20, 20)]);
  });

  test('areas on other layers do not block a move', () => {
    const tower = withPlants('sla', 'tomaat').applyAreas('spring', [
      area('s1', 'sla-spring', { layerIndex: 0 }),
      area('t1', 'tomaat-spring', { layerIndex: 1, pieces: [piece(40, 10)] }),
    ]);
    assert.notEqual(tower.moveArea('spring', 's1', 30, 0, bounds), tower);
  });

  test('resizing a piece changes its size, kept inside the layer and clear of other areas and its own pieces', () => {
    const resized = planned.resizeArea('spring', 't1', 0, 30, 35, bounds);
    assert.deepEqual(resized.areaOf('tomaat-spring')?.pieces, [piece(10, 10, 30, 35)]);
    assert.equal(resized.statusOf('summer'), 'outdated');
    assert.equal(planned.resizeArea('spring', 't1', 0, 95, 20, bounds), planned); // outside
    assert.equal(planned.resizeArea('spring', 't1', 0, 20, 45, bounds), planned); // onto the lettuce
    assert.equal(planned.resizeArea('summer', 'b1', 0, 20, 45, bounds), planned); // onto its own second piece
    assert.equal(planned.resizeArea('spring', 't1', 0, 0, 20, bounds), planned); // not positive
    assert.equal(planned.resizeArea('spring', 't1', 3, 20, 20, bounds), planned); // no such piece
  });

  test('an unknown area changes nothing', () => {
    assert.equal(planned.moveArea('spring', 'nope', 1, 1, bounds), planned);
    assert.equal(planned.removeArea('spring', 'nope'), planned);
  });

  test('changes that change nothing return the same planning', () => {
    assert.equal(planned.moveArea('spring', 't1', 0, 0, bounds), planned);
    assert.equal(planned.toggleLock('spring', 'nope'), planned);
    assert.equal(planned.setAllLocked('spring', false), planned);
    const locked = planned.setAllLocked('spring', true);
    assert.equal(locked.setAllLocked('spring', true), locked);
  });

  test('removing an area leaves the planting unplaced, unfrozen, and outdates its later seasons', () => {
    const removed = planned.removeArea('spring', 't1');
    assert.equal(removed.isPlaced('tomaat-spring'), false);
    assert.notEqual(removed.plantingById('tomaat-spring'), undefined);
    assert.equal(removed.plantingById('tomaat-spring')?.fixedSeasons, undefined);
    assert.equal(removed.statusOf('summer'), 'outdated');
  });

  test('locking changes no status', () => {
    const locked = planned.toggleLock('spring', 't1').setAllLocked('summer', true);
    assert.equal(locked.statusOf('summer'), 'planned');
    assert.equal(locked.areaOf('tomaat-spring')?.locked, true);
    assert.equal(locked.areaOf('boerenkool-summer')?.locked, true);
    assert.equal(locked.toggleLock('spring', 't1').areaOf('tomaat-spring')?.locked, false);
  });
});
