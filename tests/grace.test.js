import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { holdOff } from '../js/grace.js';

/** A stand-in for a DOM element: just what holdOff touches. */
const fakeEl = () => {
  const classes = new Set();
  return { inert: false, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) }, classes };
};

test('a held control ignores input until the grace period is over, then the callback runs', (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());
  const el = fakeEl();
  let done = 0;
  holdOff(el, 800, () => { done += 1; });
  assert.equal(el.inert, true);
  assert.ok(el.classes.has('held'));
  mock.timers.tick(799);
  assert.equal(el.inert, true);
  mock.timers.tick(1);
  assert.equal(el.inert, false);
  assert.ok(!el.classes.has('held'));
  assert.equal(done, 1);
});

test('ending a hold early frees the control without the callback', (t) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => mock.timers.reset());
  const el = fakeEl();
  let done = 0;
  const end = holdOff(el, 800, () => { done += 1; });
  end();
  assert.equal(el.inert, false);
  mock.timers.tick(1000);
  assert.equal(done, 0);
});

test('no grace period leaves the control free', () => {
  const el = fakeEl();
  let done = 0;
  holdOff(el, 0, () => { done += 1; });
  assert.equal(el.inert, false);
  assert.equal(done, 1);
});
