// Leaving for the hall is one shared piece of code (js/leave.js): every game says when a run is on, and
// no game keeps a back link, Escape handler or leave sheet of its own.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entryOf, moduleGraph, pages, read } from './helpers.js';

const games = pages().filter((p) => p !== 'index.html');

test('every game tells the kit when a run is in progress', () => {
  for (const page of games) assert.match(read(entryOf(page)), /initSettings\(\(\) => /, page);
});

test('the leave code is fetched after the page is up, not in any first load', () => {
  assert.match(read('js/settings.js'), /import\('\.\/leave\.js'\)/);
  for (const page of games) assert.ok(!moduleGraph(entryOf(page)).includes('js/leave.js'), page);
});

test('no game handles Escape to leave on its own', () => {
  for (const page of games) assert.doesNotMatch(read(entryOf(page)), /a\.back|'Back to hall'/, page);
});
