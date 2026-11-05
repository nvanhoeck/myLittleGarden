import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { usePlanningStore, unplacedOf } from './planningStore.ts';

const noSpace = (id: string) => ({ id, reason: 'noSpace' as const, weeks: { startWeek: 18, endWeek: 24 } });

describe('planningStore', () => {
  beforeEach(() => {
    usePlanningStore.setState({ lastRuns: {} });
  });

  test('given runs for two years and layers of a component, keeps the reasons of each apart', () => {
    const { setLastRun } = usePlanningStore.getState();
    setLastRun({ componentId: 'box', year: 2026 }, [noSpace('a')]);
    setLastRun({ componentId: 'box', year: 2027 }, [noSpace('b')]);
    setLastRun({ componentId: 'box', year: 2026, layerIndex: 1 }, [noSpace('c')]);

    const state = usePlanningStore.getState();
    assert.deepEqual(unplacedOf(state, { componentId: 'box', year: 2026 }).map((u) => u.id), ['a']);
    assert.deepEqual(unplacedOf(state, { componentId: 'box', year: 2026, layerIndex: 0 }).map((u) => u.id), ['a']);
    assert.deepEqual(unplacedOf(state, { componentId: 'box', year: 2027 }).map((u) => u.id), ['b']);
    assert.deepEqual(unplacedOf(state, { componentId: 'box', year: 2026, layerIndex: 1 }).map((u) => u.id), ['c']);
  });

  test('given a new run for the same scope, replaces the previous reasons', () => {
    const { setLastRun } = usePlanningStore.getState();
    setLastRun({ componentId: 'box', year: 2026 }, [noSpace('a')]);
    setLastRun({ componentId: 'box', year: 2026 }, []);
    assert.deepEqual(unplacedOf(usePlanningStore.getState(), { componentId: 'box', year: 2026 }), []);
  });

  test('given a removed plant to plan, forgets only its reason', () => {
    const { setLastRun, forgetPlantToPlan } = usePlanningStore.getState();
    setLastRun({ componentId: 'box', year: 2026 }, [noSpace('a'), noSpace('b')]);
    forgetPlantToPlan('box', 'a');
    assert.deepEqual(unplacedOf(usePlanningStore.getState(), { componentId: 'box', year: 2026 }).map((u) => u.id), ['b']);
  });

  test('given a removed component, forgets all its reasons but keeps those of other components', () => {
    const { setLastRun, forgetComponent } = usePlanningStore.getState();
    setLastRun({ componentId: 'box', year: 2026 }, [noSpace('a')]);
    setLastRun({ componentId: 'box', year: 2027 }, [noSpace('b')]);
    setLastRun({ componentId: 'pot', year: 2026 }, [noSpace('c')]);
    forgetComponent('box');

    const state = usePlanningStore.getState();
    assert.deepEqual(unplacedOf(state, { componentId: 'box', year: 2026 }), []);
    assert.deepEqual(unplacedOf(state, { componentId: 'box', year: 2027 }), []);
    assert.deepEqual(unplacedOf(state, { componentId: 'pot', year: 2026 }).map((u) => u.id), ['c']);
  });
});
