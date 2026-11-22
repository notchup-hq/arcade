// What search engines and the host read: every page is in the sitemap, and the security headers stay
// strict (no inline code, nothing from other origins), which only works because the site has neither.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pages, read, shippedFiles } from './helpers.js';

test('the sitemap lists every page and nothing else', () => {
  const listed = [...read('sitemap.xml').matchAll(/<loc>https:\/\/arcade\.notchup\.fi\/([^<]*)<\/loc>/g)].map((m) => m[1]).sort();
  const expected = pages().map((p) => p.replace(/index\.html$/, '')).sort();
  assert.deepEqual(listed, expected);
});

test('the content security policy allows only this site and no inline code', () => {
  const csp = /Content-Security-Policy: (.*)/.exec(read('_headers'))[1];
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /style-src 'self';/);
  assert.doesNotMatch(csp, /unsafe|https?:|\*/);
});

test('pages have no inline scripts, inline styles or event handler attributes', () => {
  for (const page of pages()) {
    const html = read(page);
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, `${page}: inline script`);
    assert.doesNotMatch(html, /<style\b|\sstyle="/, `${page}: inline style`);
    assert.doesNotMatch(html, /\son[a-z]+="/, `${page}: event handler attribute`);
  }
  for (const f of shippedFiles().filter((x) => x.endsWith('.js'))) {
    assert.doesNotMatch(read(f), /\.innerHTML\s*=|setAttribute\(\s*['"]style['"]/, `${f}: markup or styles from strings`);
  }
});

test('every ready cabinet zooms into its own game with a view transition name of its own', () => {
  const css = read('styles.css');
  const games = [...read('index.html').matchAll(/class="cabinet"[^>]* data-game="([a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(games.length > 0);
  for (const game of games) {
    assert.match(read(`games/${game}/index.html`), new RegExp(`<body class="game" data-game="${game}">`), `${game}: body data-game`);
    const rule = new RegExp(`\\.cabinet\\[data-game="${game}"\\] \\.screen, \\.game\\[data-game="${game}"\\] \\.game-main \\{ view-transition-name: ${game}; \\}`);
    assert.match(css, rule, `${game}: view-transition-name rule in styles.css`);
  }
});

test('the zoom between pages runs only when the visitor has not asked for less motion', () => {
  const css = read('styles.css');
  const motion = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'));
  assert.equal(css.match(/@view-transition/g).length, 1);
  assert.match(motion, /@view-transition \{ navigation: auto; \}/);
});

test('every game asks for initials with the same dialog', () => {
  const dialogOf = (page) => /<dialog id="initials"[\s\S]*?<\/dialog>/.exec(read(page))?.[0];
  const games = pages().filter((p) => p !== 'index.html');
  const first = dialogOf(games[0]);
  assert.ok(first);
  for (const page of games) assert.equal(dialogOf(page), first, page);
});

test('the Arcade link of a game opens the hall, and the hall knows each game by name', () => {
  const hall = read('index.html');
  for (const page of pages().filter((p) => p !== 'index.html')) {
    const game = page.split('/')[1];
    assert.match(read(page), /<a class="back" href="\.\.\/\.\.\/">/, page);
    assert.match(hall, new RegExp(`<li class="cabinet" data-game="${game}">`), game);
  }
});
