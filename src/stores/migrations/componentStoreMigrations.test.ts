import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateComponentState, mergePersistedComponentState, COMPONENT_STORE_VERSION } from './componentStoreMigrations.ts';

const legacyBox = {
  id: 'box-1',
  name: 'Bak',
  type: 'gardenBox',
  sunDirection: 'S',
  createdAt: '2026-01-01T00:00:00.000Z',
  borderWidthInCm: 5,
  positionX: 1.5,
  positionY: 2,
  rotation: 45,
  widthInCm: 120,
  lengthInCm: 80,
  plants: [
    {
      id: 'p-1',
      plantId: 'tomaat',
      positionX: 20,
      positionY: 30,
      placedAt: '2026-01-02T00:00:00.000Z',
      locked: true,
      patchWidthInCm: 40,
      patchHeightInCm: 20,
      patchRotationDeg: 15,
    },
  ],
};

test('version is 2', () => {
  assert.equal(COMPONENT_STORE_VERSION, 2);
});

test('strips canvas position and rotation from version 1 components', () => {
  const result = migrateComponentState({ components: [legacyBox] }, 1);
  const migrated = result.components[0] as Record<string, unknown>;
  assert.equal('positionX' in migrated, false);
  assert.equal('positionY' in migrated, false);
  assert.equal('rotation' in migrated, false);
});

test('keeps every other component field and the plants untouched', () => {
  const result = migrateComponentState({ components: [legacyBox] }, 1);
  const migrated = result.components[0] as Record<string, unknown>;
  assert.equal(migrated.id, 'box-1');
  assert.equal(migrated.widthInCm, 120);
  assert.equal(migrated.lengthInCm, 80);
  assert.equal(migrated.borderWidthInCm, 5);
  assert.deepEqual(migrated.plants, legacyBox.plants);
});

test('returns an empty garden when persisted state is malformed', () => {
  assert.deepEqual(migrateComponentState(null, 1), { components: [] });
  assert.deepEqual(migrateComponentState('garbage', 1), { components: [] });
  assert.deepEqual(migrateComponentState({ components: 'nope' }, 1), { components: [] });
});

test('passes current-version state through unchanged', () => {
  const current = { components: [{ ...legacyBox }] };
  delete (current.components[0] as Record<string, unknown>).positionX;
  const result = migrateComponentState(current, 2);
  assert.deepEqual(result, current);
});

test('mergePersistedComponentState keeps actions and sanitizes a current-version blob', () => {
  const addGardenBox = () => 'id';
  const merged = mergePersistedComponentState(
    { components: 'corrupt' },
    { components: [{ ...legacyBox }], addGardenBox },
  );
  assert.deepEqual(merged.components, []);
  assert.equal((merged as { addGardenBox: unknown }).addGardenBox, addGardenBox);
});

test('mergePersistedComponentState restores valid persisted components', () => {
  const merged = mergePersistedComponentState({ components: [legacyBox] }, { components: [] });
  assert.equal(merged.components.length, 1);
});
