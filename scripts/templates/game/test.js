import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DARK_MS, MIN_LIT_MS, litFor, newGame, seeded, step, tap } from '../games/{{id}}/rules.js';

const lit = (g) => { while (!g.lit) step(g, 10); return g; };

test('a tap while the light is lit scores a point and puts it out', () => {
  const g = lit(newGame(seeded(1)));
  assert.deepEqual(tap(g), { type: 'point', score: 1 });
  assert.equal(g.lit, false);
});

test('a tap in the dark ends the run, and taps after that are ignored', () => {
  const g = newGame(seeded(1));
  assert.deepEqual(tap(g), { type: 'over', score: 0 });
  assert.deepEqual(tap(g), { type: 'ignored' });
});

test('the light goes out on its own when its time is up', () => {
  const g = lit(newGame(seeded(2)));
  step(g, litFor(0));
  assert.equal(g.lit, false);
  assert.ok(g.left <= DARK_MS[1]);
});

test('the light stays lit for less time as the score grows, down to a floor', () => {
  assert.ok(litFor(5) < litFor(0));
  assert.equal(litFor(1000), MIN_LIT_MS);
});

test('the same seed plays the same game', () => {
  const run = () => { const g = newGame(seeded(7)); step(g, 5000); return [g.lit, g.left]; };
  assert.deepEqual(run(), run());
});
