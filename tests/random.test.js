import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickLine, seeded } from '../js/random.js';

test('the same seed gives the same numbers, in [0, 1)', () => {
  const a = seeded(42);
  const b = seeded(42);
  for (let i = 0; i < 100; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('the generator keeps its numbers, so every saved demo and deal replays the same', () => {
  const rand = seeded(1);
  assert.deepEqual([rand(), rand(), rand()], [0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
});

test('a picked line is never the one before', () => {
  const rand = seeded(7);
  let last = '';
  for (let i = 0; i < 200; i++) {
    const line = pickLine(['a', 'b', 'c'], rand, last);
    assert.notEqual(line, last);
    last = line;
  }
});

test('a list of one line still gives that line when there is no line before', () => {
  assert.equal(pickLine(['only'], seeded(1)), 'only');
});
