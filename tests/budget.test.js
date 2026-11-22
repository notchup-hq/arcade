// Size budget: the arcade stays tiny. Each page's first load (the page, the stylesheet, the icon and
// every module it pulls in) is measured gzipped, as a browser would download it. The hall fetches each
// cabinet's demo later, as the cabinet comes near the screen, so each demo has a budget of its own; and
// a game's page is measured by what it adds on top of what the hall has loaded by then.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { entryOf, lazyImportsOf, moduleGraph, pages, read, root } from './helpers.js';

const PAGE_BUDGET = 50 * 1024;
const DEMO_BUDGET = 15 * 1024;
const GAME_EXTRA_BUDGET = 30 * 1024;

const gz = (f) => gzipSync(readFileSync(join(root, f)), { level: 9 }).length;
const sum = (files) => files.reduce((total, f) => total + gz(f), 0);
const loadOf = (page) => [page, 'styles.css', 'assets/mark.svg', entryOf(page), ...moduleGraph(entryOf(page))];
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const hallFirst = new Set(loadOf('index.html'));
const demos = lazyImportsOf(entryOf('index.html'));
const demoLoad = (demo) => [demo, ...moduleGraph(demo)].filter((f) => !hallFirst.has(f));
const hallAll = new Set([...hallFirst, ...demos.flatMap(demoLoad)]);

for (const page of pages()) {
  test(`${page} loads in under ${kb(PAGE_BUDGET)} gzipped`, () => {
    const total = sum(loadOf(page));
    assert.ok(total <= PAGE_BUDGET, `${page}: ${kb(total)}`);
  });
}

test('every ready cabinet in the hall has a demo', () => {
  const games = [...read('index.html').matchAll(/class="cabinet"[^>]* data-game="([a-z-]+)"/g)].map((m) => `games/${m[1]}/demo.js`);
  assert.ok(games.length > 0);
  assert.deepEqual([...demos].sort(), games.sort());
});

for (const demo of demos) {
  test(`${demo} adds under ${kb(DEMO_BUDGET)} to the hall when its cabinet comes into view`, () => {
    const extra = sum(demoLoad(demo));
    assert.ok(extra <= DEMO_BUDGET, `${demo}: ${kb(extra)}`);
  });
}

for (const page of pages().filter((p) => p !== 'index.html')) {
  test(`${page} adds under ${kb(GAME_EXTRA_BUDGET)} to what the hall loaded`, () => {
    const extra = sum(loadOf(page).filter((f) => !hallAll.has(f)));
    assert.ok(extra <= GAME_EXTRA_BUDGET, `${page}: ${kb(extra)}`);
  });
}
