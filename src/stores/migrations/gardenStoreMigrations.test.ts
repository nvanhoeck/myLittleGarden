import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateGardenState, GARDEN_STORE_VERSION } from './gardenStoreMigrations.ts';

test('version is 1', () => {
  assert.equal(GARDEN_STORE_VERSION, 1);
});

test('drops garden width and height from version 0 state', () => {
  const result = migrateGardenState(
    {
      gardenWidth: 5,
      gardenHeight: 3,
      sunDirection: 'S',
      springFrostDate: '2026-04-15T00:00:00.000Z',
      fallFrostDate: '2026-10-20T00:00:00.000Z',
    },
    0,
  );
  assert.deepEqual(result, {
    sunDirection: 'S',
    springFrostDate: '2026-04-15T00:00:00.000Z',
    fallFrostDate: '2026-10-20T00:00:00.000Z',
  });
});

test('returns nulls when persisted state is malformed', () => {
  assert.deepEqual(migrateGardenState(undefined, 0), {
    sunDirection: null,
    springFrostDate: null,
    fallFrostDate: null,
  });
});
