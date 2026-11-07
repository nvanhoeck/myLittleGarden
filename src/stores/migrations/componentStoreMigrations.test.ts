import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_STORE_VERSION, mergePersistedComponentState, migrateComponentState } from './componentStoreMigrations.ts';

const emptySeason = { ratios: {}, areas: [], status: 'notPlanned' };
const planning = { plants: ['tomaat'], plantings: [{ id: 'tomaat-spring', plantId: 'tomaat', startSeason: 'spring' }], seasons: { spring: emptySeason, summer: emptySeason, autumn: emptySeason, winter: emptySeason } };

describe('migrateComponentState', () => {
  test('the current version is 7', () => {
    assert.equal(COMPONENT_STORE_VERSION, 7);
  });

  test('given version 1, canvas fields go and an empty planning map is added', () => {
    const migrated = migrateComponentState({ components: [{ id: 'c1', positionX: 1, positionY: 2, rotation: 15, plants: [] }] }, 1);
    assert.deepEqual(migrated.components, [{ id: 'c1', plannings: {} }]);
  });

  test('given version 3, placed plants and plants to plan are dropped; the component stays', () => {
    const migrated = migrateComponentState(
      { components: [{ id: 'c1', name: 'Bak', plants: [{ id: 'p1' }], plantsToPlan: [{ id: 't1' }] }] },
      3,
    );
    assert.deepEqual(migrated.components, [{ id: 'c1', name: 'Bak', plannings: {} }]);
  });

  test('given version 5, valid plannings stay and invalid ones or bad year keys are dropped', () => {
    const migrated = migrateComponentState(
      { components: [{ id: 'c1', plannings: { '2026': planning, '2027': { plants: 'x' }, nope: planning } }] },
      5,
    );
    assert.deepEqual(migrated.components, [{ id: 'c1', plannings: { '2026': planning } }]);
  });

  describe('salvaging a v6 planning entry by entry', () => {
    const piece = { xCm: 10, yCm: 20, widthCm: 30, lengthCm: 40 };
    const good = { id: 'a', plantId: 'tomaat', plantingId: 'tomaat-spring', pieces: [piece] };
    type Salvaged = Record<string, { plantings: unknown[]; seasons: Record<string, { areas: unknown[]; status: string; ratios: unknown }> }>;
    const migratePlanning = (data: unknown): Salvaged => {
      const migrated = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': data } }] }, 6);
      return (migrated.components[0] as unknown as { plannings: Salvaged }).plannings;
    };
    const withSpring = (season: unknown): unknown => ({ ...planning, seasons: { ...planning.seasons, spring: season } });

    test('a clean planned season with an area stays planned', () => {
      const season = { ratios: { 'tomaat-spring': 1 }, areas: [{ ...good, locked: true, layerIndex: 0 }], status: 'planned' };
      assert.deepEqual(migratePlanning(withSpring(season))['2026'].seasons.spring, season);
    });

    test('an invalid piece is dropped, the area stays and the season is outdated', () => {
      const season = { ratios: {}, areas: [{ ...good, pieces: [piece, { ...piece, widthCm: -1 }, 'x'] }], status: 'planned' };
      const spring = migratePlanning(withSpring(season))['2026'].seasons.spring;
      assert.deepEqual(spring.areas, [good]);
      assert.equal(spring.status, 'outdated');
    });

    test('an area without a valid piece is dropped', () => {
      const season = { ratios: {}, areas: [{ ...good, pieces: [{ ...piece, lengthCm: 0 }] }, { ...good, id: 'b', pieces: 'x' }], status: 'planned' };
      const spring = migratePlanning(withSpring(season))['2026'].seasons.spring;
      assert.deepEqual(spring.areas, []);
      assert.equal(spring.status, 'outdated');
    });

    test('an area of an unknown planting or with another plant than its planting is dropped', () => {
      const season = { ratios: {}, areas: [{ ...good, plantingId: 'ghost' }, { ...good, id: 'z', plantId: 'sla' }, good], status: 'planned' };
      const spring = migratePlanning(withSpring(season))['2026'].seasons.spring;
      assert.deepEqual(spring.areas, [good]);
      assert.equal(spring.status, 'outdated');
    });

    test('at most one area per planting: the first stays', () => {
      const season = { ratios: {}, areas: [good, { ...good, id: 'second' }], status: 'planned' };
      const spring = migratePlanning(withSpring(season))['2026'].seasons.spring;
      assert.deepEqual(spring.areas, [good]);
      assert.equal(spring.status, 'outdated');
    });

    test('garbage areas do not throw', () => {
      for (const areas of ['x', 5, null, [null, 7, 'a', {}, { pieces: [] }, { id: 'a', plantingId: 'tomaat-spring', plantId: 'tomaat', pieces: [null] }]]) {
        const spring = migratePlanning(withSpring({ ratios: {}, areas, status: 'planned' }))['2026'].seasons.spring;
        assert.deepEqual(spring.areas, []);
      }
    });

    test('a ratio of a known planting that is not whole or below 1 is dropped, valid ones stay', () => {
      const withPlantings = { ...planning, plantings: [...planning.plantings, { id: 'tomaat-summer', plantId: 'tomaat', startSeason: 'summer' }, { id: 'tomaat-autumn', plantId: 'tomaat', startSeason: 'autumn' }] };
      const season = { ratios: { 'tomaat-spring': 1.5, 'tomaat-summer': 0, 'tomaat-autumn': 3, ui: 2 }, areas: [], status: 'planned' };
      const spring = migratePlanning({ ...withPlantings, seasons: { ...withPlantings.seasons, spring: season } })['2026'].seasons.spring;
      assert.deepEqual(spring.ratios, { 'tomaat-autumn': 3 });
      assert.equal(spring.status, 'outdated');
    });

    test('a duplicate planting id keeps the first entry and outdates planned seasons', () => {
      const duplicated = { ...planning, plantings: [...planning.plantings, { id: 'tomaat-spring', plantId: 'sla', startSeason: 'summer' }], seasons: { ...planning.seasons, spring: { ratios: { 'tomaat-spring': 1 }, areas: [good], status: 'planned' } } };
      const planningOut = migratePlanning(duplicated)['2026'];
      assert.deepEqual(planningOut.plantings, planning.plantings);
      assert.equal(planningOut.seasons.spring.status, 'outdated');
    });

    test('a missing season is filled with the empty season and a bad status becomes notPlanned', () => {
      const out = migratePlanning({ plants: ['tomaat', 7], plantings: [], seasons: { spring: { ratios: {}, areas: [], status: 'weird' } } }) as unknown as Record<string, { plants: string[]; seasons: Record<string, unknown> }>;
      assert.deepEqual(out['2026'].plants, ['tomaat']);
      assert.deepEqual(out['2026'].seasons, { spring: emptySeason, summer: emptySeason, autumn: emptySeason, winter: emptySeason });
    });

    test('a planning that is not an object is still dropped', () => {
      assert.deepEqual(migratePlanning('garbage'), {});
      assert.deepEqual(migratePlanning({ plants: ['tomaat'], seasons: 'x' }), {});
    });
  });

  test('given something that is not a component state, an empty state', () => {
    assert.deepEqual(migrateComponentState(null, 3), { components: [] });
    assert.deepEqual(migrateComponentState({ components: 'x' }, 3), { components: [] });
  });
});

describe('migrating a v4 planning to plantings', () => {
  test('each plant with a ratio or placements in a season becomes a planting of that season', () => {
    const v4 = {
      plants: ['sla', 'tomaat'],
      seasons: {
        spring: {
          ratios: { sla: 2 },
          placements: [{ id: 'p1', plantId: 'sla', positionX: 1, positionY: 1 }, { id: 'p2', plantId: 'tomaat', positionX: 5, positionY: 5 }],
          status: 'planned',
        },
        summer: { ratios: { sla: 1 }, placements: [], status: 'notPlanned' },
        autumn: emptySeason,
        winter: emptySeason,
      },
    };
    const [component] = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': v4 } }] }, 4).components;
    const planning = component.plannings['2026'];
    assert.deepEqual(planning.plantings, [
      { id: 'sla-spring', plantId: 'sla', startSeason: 'spring' },
      { id: 'tomaat-spring', plantId: 'tomaat', startSeason: 'spring' },
      { id: 'sla-summer', plantId: 'sla', startSeason: 'summer' },
    ]);
    assert.deepEqual(planning.seasons.spring.ratios, { 'sla-spring': 2 });
    assert.deepEqual(planning.seasons.spring.areas, []);
    assert.deepEqual(planning.seasons.summer.ratios, { 'sla-summer': 1 });
    assert.equal(planning.seasons.spring.status, 'outdated');
  });

  test('a ratio of a plant missing from the plant list still becomes a planting and the plant joins the list', () => {
    const v4 = { plants: [], seasons: { spring: { ratios: { sla: 1 }, placements: [], status: 'notPlanned' }, summer: emptySeason, autumn: emptySeason, winter: emptySeason } };
    const planning = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': v4 } }] }, 4).components[0].plannings['2026'];
    assert.deepEqual(planning.plants, ['sla']);
    assert.deepEqual(planning.plantings.map((p) => p.id), ['sla-spring']);
  });
});

describe('migrating a v5 planning to areas', () => {
  const v5 = {
    plants: ['sla'],
    plantings: [{ id: 'sla-spring', plantId: 'sla', startSeason: 'spring', fixedSeasons: ['spring'] }, { id: 'x', plantId: 'sla', startSeason: 'lente' }],
    seasons: {
      spring: {
        ratios: { 'sla-spring': 2, ghost: 1 },
        placements: [{ id: 'p1', plantId: 'sla', plantingId: 'sla-spring', positionX: 1, positionY: 1 }],
        status: 'planned',
      },
      summer: { ratios: { 'sla-spring': 1 }, placements: [], status: 'planned' },
      autumn: { ratios: {}, placements: [], status: 'notPlanned' },
      winter: { ratios: {}, placements: [], status: 'outdated' },
    },
  };
  const migrated = (data: unknown): ReturnType<typeof migrateComponentState> => migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': data } }] }, 5);

  test('keeps valid plantings and ratios, drops placements, planned becomes outdated', () => {
    const planning = migrated(v5).components[0].plannings['2026'];
    assert.deepEqual(planning.plantings, [v5.plantings[0]]);
    assert.deepEqual(planning.seasons.spring.ratios, { 'sla-spring': 2 });
    assert.deepEqual(planning.seasons.spring.areas, []);
    assert.equal('placements' in planning.seasons.spring, false);
    assert.equal(planning.seasons.spring.status, 'outdated');
    assert.equal(planning.seasons.summer.status, 'outdated');
    assert.equal(planning.seasons.autumn.status, 'notPlanned');
    assert.equal(planning.seasons.winter.status, 'outdated');
  });

  test('does not throw on any shape', () => {
    for (const data of [null, 3, 'x', [], {}, { plants: [], plantings: 'x', seasons: [] }, { plants: ['a'], plantings: [], seasons: { spring: { ratios: 'x', placements: 5, areas: 'y', status: 3 } } }]) {
      assert.doesNotThrow(() => migrated(data));
    }
  });
});

describe('migrateComponentState v6 to v7 (roads)', () => {
  const road = { id: 'r1', xCm: 0, yCm: 0, widthCm: 20, lengthCm: 100 };
  const migrate = (components: unknown[]): ReturnType<typeof migrateComponentState> => migrateComponentState({ components }, 6);

  test('a garden box gets empty roads; a tower is untouched', () => {
    const migrated = migrate([{ id: 'b', type: 'gardenBox', plannings: {} }, { id: 't', type: 'rectangularTower', plannings: {} }]);
    assert.deepEqual((migrated.components[0] as { roads?: unknown }).roads, []);
    assert.equal('roads' in migrated.components[1], false);
  });

  test('garbage roads become empty roads', () => {
    const migrated = migrate([{ id: 'b', type: 'gardenBox', roads: 'x', plannings: {} }]);
    assert.deepEqual((migrated.components[0] as { roads?: unknown }).roads, []);
  });

  test('an invalid road is dropped among valid ones', () => {
    const migrated = migrate([{ id: 'b', type: 'gardenBox', roads: [road, { id: 'bad', xCm: 0, yCm: 0, widthCm: 0, lengthCm: 5 }, { ...road, id: 'r2', locked: true }, 7], plannings: {} }]);
    assert.deepEqual((migrated.components[0] as { roads?: unknown }).roads, [road, { ...road, id: 'r2', locked: true }]);
  });

  test('roads on a component that is not a garden box are dropped', () => {
    const migrated = migrate([{ id: 'p', type: 'pot', roads: [road], plannings: {} }]);
    assert.equal('roads' in migrated.components[0], false);
  });
});

describe('mergePersistedComponentState', () => {
  test('repairs current-version data and keeps the live actions', () => {
    const action = (): void => undefined;
    const merged = mergePersistedComponentState({ components: [{ id: 'c1', plants: [] }] }, { components: [], action });
    assert.deepEqual(merged.components, [{ id: 'c1', plannings: {} }]);
    assert.equal(merged.action, action);
  });
});
