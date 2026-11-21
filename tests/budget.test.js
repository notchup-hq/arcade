// Size budget: the arcade stays tiny. Each page's first load (the page, the stylesheet, the icon and
// every module it pulls in) is measured gzipped, as a browser would download it, and so is what a
// game adds on top of what the hall has already loaded.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { entryOf, moduleGraph, pages, root } from './helpers.js';

const PAGE_BUDGET = 50 * 1024;
const GAME_EXTRA_BUDGET = 30 * 1024;

const gz = (f) => gzipSync(readFileSync(join(root, f)), { level: 9 }).length;
const loadOf = (page) => [page, 'styles.css', 'assets/mark.svg', entryOf(page), ...moduleGraph(entryOf(page))];
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

for (const page of pages()) {
  test(`${page} loads in under ${kb(PAGE_BUDGET)} gzipped`, () => {
    const total = loadOf(page).reduce((sum, f) => sum + gz(f), 0);
    assert.ok(total <= PAGE_BUDGET, `${page}: ${kb(total)}`);
  });
}

for (const page of pages().filter((p) => p !== 'index.html')) {
  test(`${page} adds under ${kb(GAME_EXTRA_BUDGET)} to what the hall loaded`, () => {
    const hall = new Set(loadOf('index.html'));
    const extra = loadOf(page).filter((f) => !hall.has(f)).reduce((sum, f) => sum + gz(f), 0);
    assert.ok(extra <= GAME_EXTRA_BUDGET, `${page}: ${kb(extra)}`);
  });
}
