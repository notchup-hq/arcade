import { test } from 'node:test';
import assert from 'node:assert/strict';
import { names, watchRun } from '../js/rivals.js';

// The cheer is one element in the page, so these tests give it a tiny stand-in for the DOM.
// The module makes it once and keeps it, so every test gets the same one, emptied.
const toast = { textContent: '', style: {}, attrs: {}, classes: new Set() };
toast.setAttribute = (k, v) => { toast.attrs[k] = v; };
toast.classList = { add: (c) => toast.classes.add(c), remove: (c) => toast.classes.delete(c) };
function fakePage(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  Object.assign(toast, { textContent: '', style: {} });
  toast.classes.clear();
  globalThis.document = { createElement: () => toast, body: { append() {} } };
  t.after(() => { delete globalThis.document; });
  return toast;
}
const friend = (initials, value) => ({ board: 'lob:solo', initials, value });

test('the status line exists, empty, before the first cheer, so it is announced', (t) => {
  const toast = fakePage(t);
  const made = [];
  globalThis.document.createElement = () => { made.push(toast.textContent); return toast; };
  watchRun([friend('ABC', 1)], 'high');
  assert.ok(made.length <= 1 && made.every((text) => text === ''));
});

test('names join with commas and "and"', () => {
  assert.equal(names(['ABC']), 'ABC');
  assert.equal(names(['ABC', 'DEF']), 'ABC and DEF');
  assert.equal(names(['ABC', 'DEF', 'GHI']), 'ABC, DEF and GHI');
});

test('a score that passes a friend shows their initials, politely, once', (t) => {
  const toast = fakePage(t);
  const check = watchRun([friend('ABC', 100)], 'high');
  check(100);
  assert.equal(toast.textContent, '', 'a tie is not a pass');
  check(101);
  assert.match(toast.textContent, /ABC/);
  assert.equal(toast.attrs.role, 'status');
  assert.ok(toast.classes.has('show'));
  toast.textContent = '';
  check(500);
  assert.equal(toast.textContent, '', 'the same friend is not cheered twice in a run');
  t.mock.timers.tick(5000);
  assert.ok(!toast.classes.has('show'));
});

test('friends passed together are cheered together', (t) => {
  const toast = fakePage(t);
  watchRun([friend('ABC', 10), friend('DEF', 20), friend('GHI', 900)], 'high')(50);
  assert.match(toast.textContent, /ABC and DEF/);
  assert.doesNotMatch(toast.textContent, /GHI/);
});

test('a time passes a friend only when the run ends', (t) => {
  const toast = fakePage(t);
  const check = watchRun([friend('ABC', 60000)], 'low');
  check(30000);
  assert.equal(toast.textContent, '', 'the clock running is not a result');
  check(61000, true);
  assert.equal(toast.textContent, '', 'a slower time passes no one');
  check(59000, true);
  assert.match(toast.textContent, /ABC/);
});

test('the wording and the look change from one cheer to the next', (t) => {
  const toast = fakePage(t);
  const seen = new Set();
  const sides = new Set();
  for (let k = 0; k < 8; k++) {
    watchRun([friend('ABC', 1)], 'high')(2);
    seen.add(toast.textContent);
    sides.add(toast.style.left);
    t.mock.timers.tick(5000);
  }
  assert.ok(seen.size >= 4, [...seen].join(' | '));
  assert.equal(sides.size, 2);
});
