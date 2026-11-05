import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldReconcile } from './reconcilePolicy.ts';

describe('shouldReconcile', () => {
  test('the first frost date (null to date) does not reconcile', () => {
    assert.equal(shouldReconcile(null, '2026-04-20'), false);
  });

  test('clearing the date (date to null) does not reconcile', () => {
    assert.equal(shouldReconcile('2026-04-20', null), false);
  });

  test('the same date does not reconcile', () => {
    assert.equal(shouldReconcile('2026-04-20', '2026-04-20'), false);
  });

  test('another date reconciles', () => {
    assert.equal(shouldReconcile('2026-04-20', '2026-05-02'), true);
  });
});
