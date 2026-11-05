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
