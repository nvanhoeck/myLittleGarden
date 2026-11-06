import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_STORE_VERSION, mergePersistedComponentState, migrateComponentState } from './componentStoreMigrations.ts';

const emptySeason = { ratios: {}, placements: [], status: 'notPlanned' };
const planning = { plants: ['tomaat'], plantings: [{ id: 'tomaat-spring', plantId: 'tomaat', startSeason: 'spring' }], seasons: { spring: emptySeason, summer: emptySeason, autumn: emptySeason, winter: emptySeason } };

describe('migrateComponentState', () => {
  test('the current version is 5', () => {
    assert.equal(COMPONENT_STORE_VERSION, 5);
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

  describe('salvaging a planning entry by entry', () => {
    const good = { id: 'a', plantId: 'tomaat', plantingId: 'tomaat-spring', positionX: 10, positionY: 20 };
    const migratePlanning = (data: unknown): Record<string, unknown> => {
      const migrated = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': data } }] }, 5);
      return (migrated.components[0] as unknown as { plannings: Record<string, unknown> }).plannings;
    };

    test('one bad placement keeps the year and the good placements, and marks the season outdated', () => {
      const planned = { ratios: { 'tomaat-spring': 2 }, placements: [good, { id: 'b', plantId: 'tomaat', plantingId: 'tomaat-spring', positionX: 'x', positionY: 1 }, { ...good, id: 'c' }], status: 'planned' };
      const plannings = migratePlanning({ ...planning, seasons: { ...planning.seasons, spring: planned } }) as Record<string, { seasons: Record<string, { placements: unknown[]; status: string; ratios: unknown }> }>;
      const spring = plannings['2026'].seasons.spring;
      assert.deepEqual(spring.placements, [good, { ...good, id: 'c' }]);
      assert.equal(spring.status, 'outdated');
      assert.deepEqual(spring.ratios, { 'tomaat-spring': 2 });
      assert.equal(plannings['2026'].seasons.summer.status, 'notPlanned');
    });

    test('a bad ratio is dropped and the others stay', () => {
      const season = { ratios: { 'tomaat-spring': 0, 'tomaat-summer': 1.5, ui: 3 }, placements: [good], status: 'planned' };
      const plannings = migratePlanning({ ...planning, seasons: { ...planning.seasons, summer: season } }) as Record<string, { seasons: Record<string, { ratios: unknown; status: string }> }>;
      assert.deepEqual(plannings['2026'].seasons.summer.ratios, {});
      assert.equal(plannings['2026'].seasons.summer.status, 'outdated');
    });

    test('a ratio of a known planting that is not whole or below 1 is dropped, valid ones stay', () => {
      const withPlantings = { ...planning, plantings: [...planning.plantings, { id: 'tomaat-summer', plantId: 'tomaat', startSeason: 'summer' }, { id: 'tomaat-autumn', plantId: 'tomaat', startSeason: 'autumn' }, { id: 'tomaat-winter', plantId: 'tomaat', startSeason: 'winter' }] };
      const season = { ratios: { 'tomaat-spring': 1.5, 'tomaat-summer': 0, 'tomaat-autumn': 3 }, placements: [], status: 'planned' };
      const plannings = migratePlanning({ ...withPlantings, seasons: { ...withPlantings.seasons, spring: season } }) as Record<string, { seasons: Record<string, { ratios: unknown; status: string }> }>;
      assert.deepEqual(plannings['2026'].seasons.spring.ratios, { 'tomaat-autumn': 3 });
      assert.equal(plannings['2026'].seasons.spring.status, 'outdated');
    });

    test('a placement whose plant differs from that of its planting is dropped and the season outdated', () => {
      const season = { ratios: {}, placements: [good, { ...good, id: 'z', plantId: 'sla' }], status: 'planned' };
      const plannings = migratePlanning({ ...planning, seasons: { ...planning.seasons, spring: season } }) as Record<string, { seasons: Record<string, { placements: unknown[]; status: string }> }>;
      assert.deepEqual(plannings['2026'].seasons.spring.placements, [good]);
      assert.equal(plannings['2026'].seasons.spring.status, 'outdated');
    });

    test('a duplicate planting id keeps the first entry and outdates planned seasons', () => {
      const duplicated = { ...planning, plantings: [...planning.plantings, { id: 'tomaat-spring', plantId: 'sla', startSeason: 'summer' }], seasons: { ...planning.seasons, spring: { ratios: { 'tomaat-spring': 1 }, placements: [good], status: 'planned' } } };
      const plannings = migratePlanning(duplicated) as Record<string, { plantings: unknown[]; seasons: Record<string, { status: string }> }>;
      assert.deepEqual(plannings['2026'].plantings, planning.plantings);
      assert.equal(plannings['2026'].seasons.spring.status, 'outdated');
    });

    test('a clean planned season stays planned', () => {
      const season = { ratios: { 'tomaat-spring': 1 }, placements: [good], status: 'planned' };
      const plannings = migratePlanning({ ...planning, seasons: { ...planning.seasons, autumn: season } }) as Record<string, { seasons: Record<string, unknown> }>;
      assert.deepEqual(plannings['2026'].seasons.autumn, season);
    });

    test('a missing season is filled with the empty season and a bad status becomes notPlanned', () => {
      const plannings = migratePlanning({ plants: ['tomaat', 7], plantings: [], seasons: { spring: { ratios: {}, placements: [], status: 'weird' } } }) as Record<string, { plants: string[]; seasons: Record<string, unknown> }>;
      assert.deepEqual(plannings['2026'].plants, ['tomaat']);
      assert.deepEqual(plannings['2026'].seasons, { spring: emptySeason, summer: emptySeason, autumn: emptySeason, winter: emptySeason });
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
    assert.deepEqual(planning.seasons.spring.placements.map((p) => p.plantingId), ['sla-spring', 'tomaat-spring']);
    assert.deepEqual(planning.seasons.summer.ratios, { 'sla-summer': 1 });
    assert.equal(planning.seasons.spring.status, 'planned');
  });

  test('a ratio of a plant missing from the plant list still becomes a planting and the plant joins the list', () => {
    const v4 = { plants: [], seasons: { spring: { ratios: { sla: 1 }, placements: [], status: 'notPlanned' }, summer: emptySeason, autumn: emptySeason, winter: emptySeason } };
    const planning = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': v4 } }] }, 4).components[0].plannings['2026'];
    assert.deepEqual(planning.plants, ['sla']);
    assert.deepEqual(planning.plantings.map((p) => p.id), ['sla-spring']);
  });
});

describe('salvaging a v5 planning', () => {
  const v5 = {
    plants: ['sla'],
    plantings: [{ id: 'sla-spring', plantId: 'sla', startSeason: 'spring', fixedSeasons: ['spring'] }],
    seasons: {
      spring: {
        ratios: { 'sla-spring': 2, ghost: 1 },
        placements: [
          { id: 'p1', plantId: 'sla', plantingId: 'sla-spring', positionX: 1, positionY: 1 },
          { id: 'p2', plantId: 'sla', plantingId: 'ghost', positionX: 2, positionY: 2 },
        ],
        status: 'planned',
      },
      summer: emptySeason,
      autumn: emptySeason,
      winter: emptySeason,
    },
  };

  test('keeps valid plantings, drops ratios and placements of unknown plantings and outdates that season', () => {
    const planning = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': v5 } }] }, 5).components[0].plannings['2026'];
    assert.deepEqual(planning.plantings, v5.plantings);
    assert.deepEqual(planning.seasons.spring.ratios, { 'sla-spring': 2 });
    assert.deepEqual(planning.seasons.spring.placements.map((p) => p.id), ['p1']);
    assert.equal(planning.seasons.spring.status, 'outdated');
  });

  test('drops an invalid planting entry', () => {
    const bad = { ...v5, plantings: [...v5.plantings, { id: 'x', plantId: 'sla', startSeason: 'lente' }] };
    const planning = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': bad } }] }, 5).components[0].plannings['2026'];
    assert.deepEqual(planning.plantings.map((p) => p.id), ['sla-spring']);
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
