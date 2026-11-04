import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { relationsFromCatalog } from './PlantRelations.ts';

describe('relationsFromCatalog', () => {
  const plants = [
    { id: 'tomato', companions: [{ plantId: 'basil', benefits: [] }], combatives: [] },
    { id: 'basil', companions: [], combatives: [] },
    { id: 'fennel', companions: [], combatives: [{ plantId: 'tomato', harms: [] }] },
    { id: 'bean', companions: [{ plantId: 'onion', benefits: [] }], combatives: [] },
    { id: 'onion', companions: [], combatives: [{ plantId: 'bean', harms: [] }] },
  ];
  const relations = relationsFromCatalog(plants);

  test('given one plant listing the other as companion, the relation is companion both ways', () => {
    assert.equal(relations('tomato', 'basil'), 'companion');
    assert.equal(relations('basil', 'tomato'), 'companion');
  });

  test('given one plant listing the other as combative, the relation is combative both ways', () => {
    assert.equal(relations('tomato', 'fennel'), 'combative');
    assert.equal(relations('fennel', 'tomato'), 'combative');
  });

  test('given plants that list each other as companion and combative, combative wins', () => {
    assert.equal(relations('bean', 'onion'), 'combative');
  });

  test('given unrelated or unknown plants, the relation is neutral', () => {
    assert.equal(relations('basil', 'fennel'), 'neutral');
    assert.equal(relations('basil', 'unknown'), 'neutral');
  });
});
