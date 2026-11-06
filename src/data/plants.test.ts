import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { plantDatabaseSchema } from '../schemas/plantSchema.ts';

const plantsJson: unknown = createRequire(import.meta.url)('./plants.json');

describe('plants.json', () => {
  const parsed = plantDatabaseSchema.safeParse(plantsJson);

  test('satisfies the plant database schema', () => {
    assert.equal(parsed.success, true, parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 5)));
  });

  test('every companion and combative plantId exists in the catalog', () => {
    assert.ok(parsed.success);
    const ids = new Set(parsed.data.plants.map((p) => p.id));
    const missing = parsed.data.plants.flatMap((p) =>
      [...p.companions, ...p.combatives].filter((r) => !ids.has(r.plantId)).map((r) => `${p.id} -> ${r.plantId}`),
    );
    assert.deepEqual(missing, []);
  });

  test('plant ids are unique', () => {
    assert.ok(parsed.success);
    const ids = parsed.data.plants.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});
