// The HTML every page shares comes from one template (scripts/sync-pages.mjs, ./dev sync), so a fix
// there is made once. A page edited by hand where it should not be, or not synced, fails here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATE, syncPage } from '../scripts/sync-pages.mjs';
import { pages, read } from './helpers.js';

const template = read(TEMPLATE);

for (const page of pages()) {
  test(`${page} has the shared HTML and preloads ./dev sync writes`, () => {
    assert.equal(syncPage(page, read(page), template), read(page), 'run ./dev sync');
    assert.doesNotMatch(read(page), /\{\{\w+\}\}/, 'a {{...}} part of the template is still to be filled in');
  });
}

test('a change to the template reaches every game page, and the hall only where it shares', () => {
  const changed = template.replace('New high score!', 'Top five!').replace('content="#060b16"', 'content="#000000"');
  const game = syncPage('games/fuse-box/index.html', read('games/fuse-box/index.html'), changed);
  assert.match(game, /Top five!/);
  assert.match(game, /content="#000000"/);
  const hall = syncPage('index.html', read('index.html'), changed);
  assert.match(hall, /content="#000000"/);
  assert.doesNotMatch(hall, /Top five!/);
});

test('the preloads follow the imports, as paths from the page', () => {
  const html = syncPage('games/fuse-box/index.html', read('games/fuse-box/index.html'), template, ['games/fuse-box/rules.js', 'js/sound.js']);
  const preloads = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(preloads, ['rules.js', '../../js/sound.js']);
});

test('a page without a shared block is an error, not a silent skip', () => {
  const html = read('games/fuse-box/index.html').replace(/  <dialog id="initials"[\s\S]*?<\/dialog>\n/, '');
  assert.throws(() => syncPage('games/fuse-box/index.html', html, template), /expected one initials dialog, found 0/);
});
