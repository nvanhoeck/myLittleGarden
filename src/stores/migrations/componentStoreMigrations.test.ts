import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateComponentState, mergePersistedComponentState, COMPONENT_STORE_VERSION } from './componentStoreMigrations.ts';
import type { PlantCatalogLookup } from './componentStoreMigrations.ts';

// Wednesday 6 May 2026 at noon UTC lies in ISO week 19 in every timezone
const legacyPlant = {
  id: 'p-1',
  plantId: 'tomaat',
  positionX: 20,
  positionY: 30,
  placedAt: '2026-05-06T12:00:00.000Z',
  locked: true,
  patchWidthInCm: 40,
  patchHeightInCm: 20,
  patchRotationDeg: 15,
};

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
  plants: [legacyPlant],
};

const { positionX: _x, positionY: _y, rotation: _r, ...version2Box } = legacyBox;

// Tomato: 70 days to harvest = 10 weeks
const catalog: PlantCatalogLookup = (plantId) =>
  plantId === 'tomaat' ? { daysToHarvest: { min: 60, max: 70 } } : undefined;

const migratedPlant = (state: { components: unknown[] }, index = 0): Record<string, unknown> =>
  ((state.components[0] as { plants: Record<string, unknown>[] }).plants)[index];

test('version is 3', () => {
  assert.equal(COMPONENT_STORE_VERSION, 3);
});

test('strips canvas position and rotation from version 1 components', () => {
  const result = migrateComponentState({ components: [legacyBox] }, 1, catalog);
  const migrated = result.components[0] as unknown as Record<string, unknown>;
  assert.equal('positionX' in migrated, false);
  assert.equal('positionY' in migrated, false);
  assert.equal('rotation' in migrated, false);
});

test('keeps every other component field and plant field untouched', () => {
  const result = migrateComponentState({ components: [legacyBox] }, 1, catalog);
  const migrated = result.components[0] as unknown as Record<string, unknown>;
  assert.equal(migrated.id, 'box-1');
  assert.equal(migrated.widthInCm, 120);
  assert.equal(migrated.lengthInCm, 80);
  assert.equal(migrated.borderWidthInCm, 5);
  const { growingPeriod: _period, ...plantFields } = migratedPlant(result);
  assert.deepEqual(plantFields, legacyPlant);
});

test('given a version 2 plant of a known catalog plant, it is transplanted in the week of placedAt until harvest', () => {
  const result = migrateComponentState({ components: [version2Box] }, 2, catalog);
  assert.deepEqual(migratedPlant(result).growingPeriod, { year: 2026, startWeek: 19, endWeek: 29, method: 'transplant' });
});

test('given a version 2 plant unknown to the catalog, its period lasts until the last week of that year', () => {
  const unknown = { ...version2Box, plants: [{ ...legacyPlant, plantId: 'verdwenen' }] };
  const result = migrateComponentState({ components: [unknown] }, 2, catalog);
  assert.deepEqual(migratedPlant(result).growingPeriod, { year: 2026, startWeek: 19, endWeek: 53, method: 'transplant' });
});

test('given a version 2 plant placed late in the year, its period is capped at the year end', () => {
  const late = { ...version2Box, plants: [{ ...legacyPlant, placedAt: '2026-11-04T12:00:00.000Z' }] };
  const result = migrateComponentState({ components: [late] }, 2, catalog);
  assert.deepEqual(migratedPlant(result).growingPeriod, { year: 2026, startWeek: 45, endWeek: 53, method: 'transplant' });
});

test('given a version 2 plant with an unreadable placedAt, uses the creation date of its component', () => {
  const broken = { ...version2Box, createdAt: '2026-05-06T12:00:00.000Z', plants: [{ ...legacyPlant, placedAt: 'gisteren' }] };
  const result = migrateComponentState({ components: [broken] }, 2, catalog);
  assert.equal((migratedPlant(result).growingPeriod as { startWeek: number }).startWeek, 19);
});

test('given plants the catalog knows, does not warn', () => {
  const warn = mock.method(console, 'warn', () => undefined);
  try {
    migrateComponentState({ components: [version2Box] }, 2, catalog);
    assert.equal(warn.mock.callCount(), 0);
  } finally {
    warn.mock.restore();
  }
});

test('given version 2 components, each gets an empty list of plants to plan', () => {
  const result = migrateComponentState({ components: [version2Box] }, 2, catalog);
  assert.deepEqual((result.components[0] as unknown as Record<string, unknown>).plantsToPlan, []);
});

test('given entries that are not objects, drops them instead of keeping garbage', () => {
  const messy = {
    components: [
      'garbage',
      null,
      { ...version2Box, plants: [legacyPlant, 42, null], plantsToPlan: [{ id: 'tp-1', plantId: 'sla', year: 2026 }, 'x'] },
    ],
  };
  const result = migrateComponentState(messy, 2, catalog);
  assert.equal(result.components.length, 1);
  assert.deepEqual(result.components[0].plants.map((p) => p.id), ['p-1']);
  assert.deepEqual(result.components[0].plantsToPlan, [{ id: 'tp-1', plantId: 'sla', year: 2026 }]);
});

test('given plants the catalog does not know, warns once per migration that their period runs until the year end', () => {
  const warn = mock.method(console, 'warn', () => undefined);
  try {
    const unknown = { ...version2Box, plants: [{ ...legacyPlant, plantId: 'x' }, { ...legacyPlant, id: 'p-2', plantId: 'y' }] };
    migrateComponentState({ components: [unknown, unknown] }, 2, () => undefined);
    assert.equal(warn.mock.callCount(), 1);
    assert.match(String(warn.mock.calls[0].arguments[0]), /4/);
  } finally {
    warn.mock.restore();
  }
});

test('returns an empty garden when persisted state is malformed', () => {
  assert.deepEqual(migrateComponentState(null, 1, catalog), { components: [] });
  assert.deepEqual(migrateComponentState('garbage', 1, catalog), { components: [] });
  assert.deepEqual(migrateComponentState({ components: 'nope' }, 1, catalog), { components: [] });
});

test('passes complete current-version state through unchanged', () => {
  const current = {
    components: [
      {
        ...version2Box,
        plants: [{ ...legacyPlant, growingPeriod: { year: 2026, startWeek: 20, endWeek: 25, method: 'directSow' } }],
        plantsToPlan: [{ id: 'tp-1', plantId: 'sla', year: 2026 }],
      },
    ],
  };
  assert.deepEqual(migrateComponentState(current, 3, catalog), current);
});

test('mergePersistedComponentState keeps actions and sanitizes a current-version blob', () => {
  const addGardenBox = () => 'id';
  const merged = mergePersistedComponentState(
    { components: 'corrupt' },
    { components: [], addGardenBox },
    catalog,
  );
  assert.deepEqual(merged.components, []);
  assert.equal((merged as { addGardenBox: unknown }).addGardenBox, addGardenBox);
});

test('mergePersistedComponentState fills missing planning fields of a current-version blob', () => {
  const merged = mergePersistedComponentState({ components: [version2Box] }, { components: [] }, catalog);
  const component = merged.components[0] as unknown as Record<string, unknown>;
  assert.deepEqual(component.plantsToPlan, []);
  assert.ok((component.plants as Record<string, unknown>[])[0].growingPeriod);
});
