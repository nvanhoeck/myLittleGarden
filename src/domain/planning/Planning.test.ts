import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Planning } from './Planning.ts';
import type { PlacementData, Season } from '../../types/planning.types.ts';

const SEASONS_BY_PLANT: Record<string, readonly Season[]> = {
  tomaat: ['spring', 'summer'],
  sla: ['spring'],
  boerenkool: ['summer', 'autumn'],
  knoflook: [],
};
const seasonsOf = (plantId: string): readonly Season[] => SEASONS_BY_PLANT[plantId] ?? [];

const placement = (id: string, plantId: string, extra: Partial<PlacementData> = {}): PlacementData => ({
  id,
  plantId,
  positionX: 10,
  positionY: 10,
  ...extra,
});

const withPlants = (...plantIds: string[]): Planning => Planning.empty(seasonsOf).addPlants(plantIds);

describe('Planning queries', () => {
  test('given an empty planning, no plants and every season not planned', () => {
    const planning = Planning.empty(seasonsOf);
    assert.deepEqual(planning.plants, []);
    assert.deepEqual(['spring', 'summer', 'autumn', 'winter'].map((s) => planning.statusOf(s as Season)), [
      'notPlanned',
      'notPlanned',
      'notPlanned',
      'notPlanned',
    ]);
  });

  test('given plants, they start in their first season and are carried into the later ones', () => {
    const planning = withPlants('tomaat', 'sla', 'boerenkool');
    assert.deepEqual(planning.plantsStartingIn('spring'), ['tomaat', 'sla']);
    assert.deepEqual(planning.plantsStartingIn('summer'), ['boerenkool']);
    assert.deepEqual(planning.plantsCarriedInto('summer'), ['tomaat']);
    assert.deepEqual(planning.plantsCarriedInto('autumn'), ['boerenkool']);
  });

  test('given a plant without calendar, it is in the list but in no season', () => {
    const planning = withPlants('knoflook');
    assert.deepEqual(planning.plants, ['knoflook']);
    assert.equal(planning.startSeasonOf('knoflook'), null);
    assert.deepEqual(planning.plantsStartingIn('spring'), []);
  });

  test('given no stored data, from() gives an empty planning', () => {
    assert.deepEqual(Planning.from(undefined, seasonsOf).toData(), Planning.empty(seasonsOf).toData());
  });
});

describe('addPlants', () => {
  test('new plants get ratio 1 in their start season; duplicates are ignored', () => {
    const planning = withPlants('tomaat').addPlants(['tomaat', 'sla', 'sla']);
    assert.deepEqual(planning.plants, ['tomaat', 'sla']);
    assert.equal(planning.ratioOf('spring', 'sla'), 1);
  });

  test('adding a plant makes its planned start season outdated', () => {
    const planned = withPlants('tomaat').applyPlacement('spring', [placement('p1', 'tomaat')]);
    assert.equal(planned.addPlants(['sla']).statusOf('spring'), 'outdated');
  });

  test('does not change the planning it was called on', () => {
    const planning = Planning.empty(seasonsOf);
    planning.addPlants(['tomaat']);
    assert.deepEqual(planning.plants, []);
  });
});

describe('setRatio', () => {
  test('sets the ratio of a plant starting in the season and outdates a planned season', () => {
    const planned = withPlants('tomaat', 'sla').applyPlacement('spring', []);
    const changed = planned.setRatio('spring', 'sla', 3);
    assert.equal(changed.ratioOf('spring', 'sla'), 3);
    assert.equal(changed.statusOf('spring'), 'outdated');
  });

  test('rejects a plant carried into the season and ratios that are not whole numbers of at least 1', () => {
    const planning = withPlants('tomaat');
    assert.throws(() => planning.setRatio('summer', 'tomaat', 2));
    assert.throws(() => planning.setRatio('spring', 'tomaat', 0));
    assert.throws(() => planning.setRatio('spring', 'tomaat', 1.5));
  });
});

describe('applyPlacement', () => {
  test('replaces unlocked placements, keeps locked ones and marks the season planned', () => {
    const first = withPlants('tomaat').applyPlacement('spring', [
      placement('locked', 'tomaat', { locked: true }),
      placement('loose', 'tomaat'),
    ]);
    const second = first.applyPlacement('spring', [placement('new', 'tomaat')]);
    assert.deepEqual(second.placementsIn('spring').map((p) => p.id), ['locked', 'new']);
    assert.equal(second.statusOf('spring'), 'planned');
  });

  test('outdates a planned later season that holds plants carried from this season; not-planned seasons stay', () => {
    const planning = withPlants('tomaat', 'boerenkool')
      .applyPlacement('summer', [placement('b1', 'boerenkool')])
      .applyPlacement('spring', [placement('t1', 'tomaat')]);
    assert.equal(planning.statusOf('summer'), 'outdated');
    assert.equal(planning.statusOf('autumn'), 'notPlanned');
  });
});

describe('fixedPlacementsIn', () => {
  test('gives the carried placements and the locked placements of the season', () => {
    const planning = withPlants('tomaat', 'boerenkool')
      .applyPlacement('spring', [placement('t1', 'tomaat')])
      .applyPlacement('summer', [placement('b1', 'boerenkool', { locked: true }), placement('b2', 'boerenkool')]);
    assert.deepEqual(planning.carriedPlacementsIn('summer').map((p) => p.id), ['t1']);
    assert.deepEqual(planning.fixedPlacementsIn('summer').map((p) => p.id), ['t1', 'b1']);
  });
});

describe('removePlant', () => {
  test('removes the plant, its ratios and placements, and outdates its planned seasons', () => {
    const planning = withPlants('tomaat', 'boerenkool')
      .applyPlacement('spring', [placement('t1', 'tomaat')])
      .applyPlacement('summer', [placement('b1', 'boerenkool')])
      .removePlant('tomaat');
    assert.deepEqual(planning.plants, ['boerenkool']);
    assert.deepEqual(planning.placementsIn('spring'), []);
    assert.equal(planning.toData().seasons.spring.ratios.tomaat, undefined);
    assert.equal(planning.statusOf('spring'), 'outdated');
    assert.equal(planning.statusOf('summer'), 'outdated');
  });
});

describe('changing one placement', () => {
  const planned = withPlants('tomaat', 'boerenkool')
    .applyPlacement('spring', [placement('t1', 'tomaat')])
    .applyPlacement('summer', [placement('b1', 'boerenkool')]);

  test('moving a carried plant outdates the later seasons it grows in, not its own season', () => {
    const moved = planned.movePlacement('spring', 't1', 50, 60);
    assert.deepEqual([moved.placementsIn('spring')[0].positionX, moved.placementsIn('spring')[0].positionY], [50, 60]);
    assert.equal(moved.statusOf('spring'), 'planned');
    assert.equal(moved.statusOf('summer'), 'outdated');
  });

  test('resizing and removing work the same way', () => {
    const resized = planned.resizePatch('spring', 't1', 30, 40, 15);
    assert.deepEqual(
      [resized.placementsIn('spring')[0].patchWidthInCm, resized.placementsIn('spring')[0].patchHeightInCm, resized.placementsIn('spring')[0].patchRotationDeg],
      [30, 40, 15],
    );
    assert.equal(resized.statusOf('summer'), 'outdated');
    assert.deepEqual(planned.removePlacement('spring', 't1').placementsIn('spring'), []);
  });

  test('locking changes no status', () => {
    const locked = planned.toggleLock('spring', 't1').setAllLocked('summer', true);
    assert.equal(locked.placementsIn('spring')[0].locked, true);
    assert.equal(locked.placementsIn('summer')[0].locked, true);
    assert.equal(locked.statusOf('summer'), 'planned');
  });

  test('an unknown placement id changes nothing', () => {
    assert.equal(planned.movePlacement('spring', 'missing', 1, 1), planned);
  });
});

describe('reconciled', () => {
  test('given a plant whose start season moved, its ratio moves along, its placements go and the seasons involved are outdated', () => {
    // Stored while tomaat started in summer; its calendar now says spring
    const stored = Planning.from(
      {
        plants: ['tomaat'],
        seasons: {
          spring: { ratios: {}, placements: [], status: 'planned' },
          summer: { ratios: { tomaat: 3 }, placements: [placement('t1', 'tomaat')], status: 'planned' },
          autumn: { ratios: {}, placements: [], status: 'notPlanned' },
          winter: { ratios: {}, placements: [], status: 'notPlanned' },
        },
      },
      seasonsOf,
    );
    const planning = stored.reconciled();
    assert.equal(planning.ratioOf('spring', 'tomaat'), 3);
    assert.equal(planning.toData().seasons.summer.ratios.tomaat, undefined);
    assert.deepEqual(planning.placementsIn('summer'), []);
    assert.equal(planning.statusOf('spring'), 'outdated');
    assert.equal(planning.statusOf('summer'), 'outdated');
  });

  test('given a planning without planned seasons, it gives the same planning', () => {
    const planning = withPlants('tomaat');
    assert.equal(planning.reconciled(), planning);
  });

  test('outdates every planned season that holds plants', () => {
    const planned = withPlants('tomaat').applyPlacement('spring', [placement('t1', 'tomaat')]);
    const reconciled = planned.reconciled();
    assert.equal(reconciled.statusOf('spring'), 'outdated');
    assert.equal(reconciled.statusOf('summer'), 'notPlanned');
  });

  test('a plant that gained a calendar outdates its now planned start season', () => {
    const newSeasonsOf = (plantId: string): readonly Season[] => (plantId === 'knoflook' ? ['spring'] : []);
    // Stored while knoflook had no calendar, so spring was planned without it
    const stored = Planning.from(
      {
        plants: ['knoflook'],
        seasons: {
          spring: { ratios: {}, placements: [], status: 'planned' },
          summer: { ratios: {}, placements: [], status: 'notPlanned' },
          autumn: { ratios: {}, placements: [], status: 'notPlanned' },
          winter: { ratios: {}, placements: [], status: 'notPlanned' },
        },
      },
      newSeasonsOf,
    );
    assert.equal(stored.reconciled().statusOf('spring'), 'outdated');
  });
});
