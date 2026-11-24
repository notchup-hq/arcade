import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../games/night-deal/clock.js';

const at = () => {
  const t = { now: 1000 };
  return { t, clock: createClock(() => t.now) };
};

test('the clock counts nothing until it runs, then the time that passes', () => {
  const { t, clock } = at();
  t.now += 5000;
  assert.equal(clock.ms, 0);
  clock.run();
  t.now += 1500;
  assert.equal(clock.ms, 1500);
  assert.equal(clock.running, true);
});

test('a pause stops the count and running again goes on from it', () => {
  const { t, clock } = at();
  clock.run();
  t.now += 2000;
  clock.pause();
  t.now += 60000;
  assert.equal(clock.ms, 2000);
  clock.run();
  t.now += 500;
  assert.equal(clock.ms, 2500);
});

test('running twice does not restart the count, and a reset empties it', () => {
  const { t, clock } = at();
  clock.run();
  t.now += 1000;
  clock.run();
  t.now += 1000;
  assert.equal(clock.ms, 2000);
  clock.reset();
  assert.equal(clock.ms, 0);
  assert.equal(clock.running, false);
});
