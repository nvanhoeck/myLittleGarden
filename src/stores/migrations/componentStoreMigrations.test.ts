import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_STORE_VERSION, mergePersistedComponentState, migrateComponentState } from './componentStoreMigrations.ts';

const emptySeason = { ratios: {}, placements: [], status: 'notPlanned' };
const planning = { plants: ['tomaat'], seasons: { spring: emptySeason, summer: emptySeason, autumn: emptySeason, winter: emptySeason } };

describe('migrateComponentState', () => {
  test('the current version is 4', () => {
    assert.equal(COMPONENT_STORE_VERSION, 4);
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

  test('given version 4, valid plannings stay and invalid ones or bad year keys are dropped', () => {
    const migrated = migrateComponentState(
      { components: [{ id: 'c1', plannings: { '2026': planning, '2027': { plants: 'x' }, nope: planning } }] },
      4,
    );
    assert.deepEqual(migrated.components, [{ id: 'c1', plannings: { '2026': planning } }]);
  });

  describe('salvaging a planning entry by entry', () => {
    const good = { id: 'a', plantId: 'tomaat', positionX: 10, positionY: 20 };
    const migratePlanning = (data: unknown): Record<string, unknown> => {
      const migrated = migrateComponentState({ components: [{ id: 'c1', plannings: { '2026': data } }] }, 4);
      return (migrated.components[0] as unknown as { plannings: Record<string, unknown> }).plannings;
    };

    test('one bad placement keeps the year and the good placements, and marks the season outdated', () => {
      const planned = { ratios: { tomaat: 2 }, placements: [good, { id: 'b', plantId: 'sla', positionX: 'x', positionY: 1 }, { ...good, id: 'c' }], status: 'planned' };
      const plannings = migratePlanning({ ...planning, seasons: { ...planning.seasons, spring: planned } }) as Record<string, { seasons: Record<string, { placements: unknown[]; status: string; ratios: unknown }> }>;
      const spring = plannings['2026'].seasons.spring;
      assert.deepEqual(spring.placements, [good, { ...good, id: 'c' }]);
      assert.equal(spring.status, 'outdated');
      assert.deepEqual(spring.ratios, { tomaat: 2 });
      assert.equal(plannings['2026'].seasons.summer.status, 'notPlanned');
    });

    test('a bad ratio is dropped and the others stay', () => {
      const season = { ratios: { tomaat: 0, sla: 1.5, ui: 3 }, placements: [good], status: 'planned' };
      const plannings = migratePlanning({ ...planning, seasons: { ...planning.seasons, summer: season } }) as Record<string, { seasons: Record<string, { ratios: unknown; status: string }> }>;
      assert.deepEqual(plannings['2026'].seasons.summer.ratios, { ui: 3 });
      assert.equal(plannings['2026'].seasons.summer.status, 'outdated');
    });

    test('a clean planned season stays planned', () => {
      const season = { ratios: { tomaat: 1 }, placements: [good], status: 'planned' };
      const plannings = migratePlanning({ ...planning, seasons: { ...planning.seasons, autumn: season } }) as Record<string, { seasons: Record<string, unknown> }>;
      assert.deepEqual(plannings['2026'].seasons.autumn, season);
    });

    test('a missing season is filled with the empty season and a bad status becomes notPlanned', () => {
      const plannings = migratePlanning({ plants: ['tomaat', 7], seasons: { spring: { ratios: {}, placements: [], status: 'weird' } } }) as Record<string, { plants: string[]; seasons: Record<string, unknown> }>;
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

describe('mergePersistedComponentState', () => {
  test('repairs current-version data and keeps the live actions', () => {
    const action = (): void => undefined;
    const merged = mergePersistedComponentState({ components: [{ id: 'c1', plants: [] }] }, { components: [], action });
    assert.deepEqual(merged.components, [{ id: 'c1', plannings: {} }]);
    assert.equal(merged.action, action);
  });
});
