import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded } from '../js/random.js';
import { shuffled } from '../js/shuffle.js';

test('a shuffle keeps every item, leaves the list alone and replays with the seed', () => {
  const list = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = shuffled(list, seeded(7));
  assert.deepEqual([...out].sort(), list);
  assert.deepEqual(list, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(shuffled(list, seeded(7)), out);
  assert.notDeepEqual(out, list);
});
