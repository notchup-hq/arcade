// ./dev new-game (scripts/new-game.mjs) starts a game from scripts/templates/game/ and adds it to every
// list. Trying it for real is in docs/adding-a-game.md; these check the pieces without writing a file.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addCabinet, addGame, addToSitemap, addZoom, fill, newGameFiles } from '../scripts/new-game.mjs';
import { orderHall } from '../scripts/order-hall.mjs';
import { read } from './helpers.js';

// An id no game has, so these pass while a real game started with ./dev new-game is in the repo too.
const game = { id: 'kit-check', name: 'Kit Check', pitch: 'Tap while the light is lit.' };

test('every part of the templates is filled in', () => {
  const made = newGameFiles(game);
  for (const [f, text] of Object.entries({ ...made.files, [made.page]: made.html })) {
    assert.doesNotMatch(text, /\{\{\w+\}\}/, f);
  }
  assert.match(made.html, /<title>Kit Check: a reaction game · Notchup Arcade<\/title>/);
  assert.match(made.files['games/kit-check/main.js'], /const BOARD = 'kit-check:solo';/);
});

test('a part of a template with no value is an error, not an empty space', () => {
  assert.equal(fill('{{name}}!', { name: 'Light Up' }), 'Light Up!');
  assert.throws(() => fill('{{nope}}', {}), /No value for \{\{nope\}\}/);
});

test('the id is lowercase words joined by hyphens, and the name is safe in HTML and JavaScript', () => {
  for (const id of ['Light-Up', 'light_up', 'light-', 'x2', '../x', '', undefined]) assert.throws(() => newGameFiles({ id, name: 'X' }), /lowercase words/, id);
  for (const name of [' ', "Rock 'n Roll", 'A & B', '<i>', undefined]) assert.throws(() => newGameFiles({ id: 'light-up', name }), /letters, digits/, name);
  assert.doesNotThrow(() => newGameFiles({ id: 'light-up', name: 'Pölly 2-Up' }));
});

test('the game joins the hall last, and ./dev order agrees with js/games.js', () => {
  const games = addGame(read('js/games.js'), game);
  const ids = [...games.matchAll(/^ {2}\{ id: '([a-z-]+)'/gm)].map((m) => m[1]);
  assert.equal(ids.at(-1), 'kit-check');
  const hall = addCabinet(read('index.html'), game);
  assert.match(hall, /<li class="cabinet" data-game="kit-check">\n {8}<a href="games\/kit-check\/">/);
  assert.match(hall, /<span class="cabinet-pitch">Tap while the light is lit\.<\/span>/);
  assert.equal(orderHall(hall, ids), hall);
});

test('the game gets its zoom and its place in the sitemap, in a-z order', () => {
  const css = addZoom(read('styles.css'), game);
  assert.match(css, /view-transition-name: [a-z-]+; \}\n\.cabinet\[data-game="kit-check"\] \.screen, \.game\[data-game="kit-check"\] \.game-main \{ view-transition-name: kit-check; \}\n/);
  const pages = (xml) => [...xml.matchAll(/\/games\/([a-z-]+)\//g)].map((m) => m[1]);
  const before = pages(read('sitemap.xml'));
  for (const id of ['kit-check', 'zzz-last']) {
    assert.deepEqual(pages(addToSitemap(read('sitemap.xml'), { id })), [...before, id].sort(), id);
  }
});
