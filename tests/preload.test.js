// Each page preloads every module its script pulls in, so the browser fetches them in one round trip
// instead of one per import level. A new import without a preload, or a stale preload, fails here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entryOf, moduleGraph, pages, read, resolve } from './helpers.js';

for (const page of pages()) {
  test(`${page} preloads exactly the modules its script imports`, () => {
    const dir = page.split('/').slice(0, -1);
    const preloaded = [...read(page).matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map((m) => resolve(dir, m[1])).sort();
    assert.deepEqual(preloaded, moduleGraph(entryOf(page)));
  });
}
