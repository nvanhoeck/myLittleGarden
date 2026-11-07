import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { orderForNeighbours } from './AreaOrder.ts';
import type { PlantRelation } from './PlantRelations.ts';

function relationsOf(companions: readonly string[], combatives: readonly string[]): (a: string, b: string) => PlantRelation {
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  return (a, b) => {
    if (combatives.includes(key(a, b))) return 'combative';
    if (companions.includes(key(a, b))) return 'companion';
    return 'neutral';
  };
}

function adjacentPairs(order: readonly string[]): string[] {
  return order.slice(1).map((id, i) => (order[i] < id ? `${order[i]}|${id}` : `${id}|${order[i]}`));
}

describe('orderForNeighbours', () => {
  const relation = relationsOf(['a|b'], ['b|c']);

  test('given a-b companions and b-c combative, a is next to b and b is never next to c', () => {
    const order = orderForNeighbours(['a', 'b', 'c'], relation);
    assert.equal(order.length, 3);
    assert.ok(adjacentPairs(order).includes('a|b'));
    assert.ok(!adjacentPairs(order).includes('b|c'));
  });

  test('given any input order, the result is the same', () => {
    const expected = orderForNeighbours(['a', 'b', 'c'], relation);
    for (const input of [['c', 'b', 'a'], ['b', 'c', 'a'], ['c', 'a', 'b']]) {
      assert.deepEqual(orderForNeighbours(input, relation), expected);
    }
  });

  test('given 9 plantings, the greedy order never puts a combative pair side by side when avoidable', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    const combatives = ['b|c', 'd|e', 'f|g', 'h|i', 'a|b'];
    const nineRelation = relationsOf(['a|c'], combatives);
    const order = orderForNeighbours(ids, nineRelation);
    assert.deepEqual([...order].sort(), ids);
    assert.deepEqual(adjacentPairs(order).filter((pair) => combatives.includes(pair)), []);
    assert.deepEqual(orderForNeighbours([...ids].reverse(), nineRelation), order);
  });

  test('given no plantings or one, the order is trivial', () => {
    assert.deepEqual(orderForNeighbours([], relation), []);
    assert.deepEqual(orderForNeighbours(['x'], relation), ['x']);
  });
});
