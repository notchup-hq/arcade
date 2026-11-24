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

test('a game page holds its first frame until its script has built the board', () => {
  // The zoom photographs the game's first frame. Without this the photograph shows an empty board,
  // which then jumps to full size once the script has run.
  for (const page of pages().filter((p) => p !== 'index.html')) {
    assert.match(read(page), /<script type="module" src="main\.js" blocking="render"><\/script>/, page);
  }
});

test('a ready cabinet teases with a solid plate in the cabinet colour that swells slowly and never flashes, in text of 16 px or more', () => {
  const css = read('styles.css');
  assert.match(css, /\.cabinet\[data-game\] \.screen::before \{\s*content: "CLICK TO PLAY";[^}]*font: 800 1rem/);
  assert.match(css, /\.cabinet\[data-game\] \.screen::before \{[^}]*border: 2px solid var\(--plate\);[^}]*background: var\(--neon-bg\)/);
  assert.match(css, /\(pointer: coarse\) \{ \.cabinet\[data-game\] \.screen::before \{ content: "TAP TO PLAY"; \} \}/);
  const motion = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'));
  assert.match(motion, /animation: breathe 2\.4s ease-in-out infinite/);
  assert.match(css, /@keyframes breathe \{ 50% \{ transform: translateX\(-50%\) scale\(1\.06\); \} \}/);
});

test('the hall shows a tapped cabinet as opening and clears it when the page comes back', () => {
  const hall = read('js/hall.js');
  assert.match(hall, /classList\.add\('opening'\)/);
  assert.match(hall, /pageshow[\s\S]*classList\.remove\('opening'\)/);
  assert.match(read('styles.css'), /\.cabinet\.opening \.screen::after \{[^}]*mark\.svg/);
});

test('the zoom between pages runs only when the visitor has not asked for less motion', () => {
  const css = read('styles.css');
  const motion = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'));
  assert.equal(css.match(/@view-transition/g).length, 1);
  assert.match(motion, /@view-transition \{ navigation: auto; \}/);
});

test('the Arcade link of a game opens the hall, and the hall knows each game by name', () => {
  const hall = read('index.html');
  for (const page of pages().filter((p) => p !== 'index.html')) {
    const game = page.split('/')[1];
    assert.match(read(page), /<a class="back" href="\.\.\/\.\.\/">/, page);
    assert.match(hall, new RegExp(`<li class="cabinet" data-game="${game}">`), game);
  }
});

test('the hall shows the games in the order of js/games.js (./dev order puts them so)', async () => {
  const { GAMES } = await import('../js/games.js');
  const { orderHall } = await import('../scripts/order-hall.mjs');
  const hall = read('index.html');
  const ids = GAMES.map((g) => g.id);
  const cabinets = (html) => [...html.matchAll(/class="cabinet"[^>]* data-game="([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(cabinets(hall), ids, 'run ./dev order');
  const reversed = orderHall(hall, ids.toReversed());
  assert.deepEqual(cabinets(reversed), ids.toReversed());
  assert.equal(orderHall(reversed, ids), hall);
  assert.throws(() => orderHall(hall, ids.slice(1)), new RegExp(`not in GAMES: ${ids[0]}`));
});

test('a disabled button looks disabled, and a hover does not light it up', () => {
  const css = read('styles.css');
  assert.match(css, /\.sheet button:disabled\s*\{[^}]*opacity/);
  assert.match(css, /button:hover:not\(:disabled\)/);
});
