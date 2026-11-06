import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { usePlanningStore } from './planningStore.ts';

const shares = [{ plantingId: 'sla-spring', plantId: 'sla', count: 3, actualShare: 0.3, targetShare: 0.5 }];

describe('planningStore', () => {
  test('keeps the last shares per component, year and season', () => {
    const store = usePlanningStore.getState();
    store.setLastShares({ componentId: 'c1', year: 2026, season: 'spring' }, shares);
    assert.deepEqual(usePlanningStore.getState().sharesOf({ componentId: 'c1', year: 2026, season: 'spring' }), shares);
    assert.equal(usePlanningStore.getState().sharesOf({ componentId: 'c1', year: 2026, season: 'summer' }), undefined);
  });

  test('forgets a removed component', () => {
    usePlanningStore.getState().setLastShares({ componentId: 'c2', year: 2026, season: 'spring' }, shares);
    usePlanningStore.getState().forgetComponent('c2');
    assert.equal(usePlanningStore.getState().sharesOf({ componentId: 'c2', year: 2026, season: 'spring' }), undefined);
  });
});
