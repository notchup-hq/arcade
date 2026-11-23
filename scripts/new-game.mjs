// ./dev new-game <id> "<Name>": start a game. It writes a small working one from scripts/templates/game/
// (a light to tap while it is lit, a score, the hall of fame and a demo for the hall) and adds it to
// every list the arcade keeps: its cabinet in the hall, js/games.js, its zoom in styles.css and the
// sitemap. Then ./dev sync and ./dev order run, so every check passes from the start. Change the game
// from there; docs/adding-a-game.md says what to change.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { orderHall } from './order-hall.mjs';
import { read, root } from './site.mjs';
import { TEMPLATE, syncPage } from './sync-pages.mjs';

const ID = /^[a-z]+(-[a-z]+)*$/;
// Letters, digits, spaces and hyphens: the name goes into HTML and a JavaScript string as it is.
const NAME = /^[\p{L}\p{N}][\p{L}\p{N} -]*$/u;
const TEMPLATES = 'scripts/templates/game';

/** `text` with each {{key}} replaced by its value; a key without a value is an error. */
export function fill(text, values) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`No value for {{${key}}}`);
    return values[key];
  });
}

/** Insert `line` after the last match of `re` in `text`. */
function after(text, re, line, what) {
  const all = [...text.matchAll(new RegExp(re.source, 'gm'))];
  if (!all.length) throw new Error(`Cannot find where to add ${what}`);
  const end = all.at(-1).index + all.at(-1)[0].length;
  return `${text.slice(0, end)}\n${line}${text.slice(end)}`;
}

/** The hall with a cabinet for the game after the ready ones (./dev order then moves it into place). */
export function addCabinet(html, { id, name, pitch }) {
  const li = `      <li class="cabinet" data-game="${id}">
        <a href="games/${id}/">
          <span class="cabinet-marquee"><span class="cabinet-name">${name}</span></span>
          <span class="cabinet-bezel"><span class="screen"><canvas class="screen-canvas" aria-hidden="true"></canvas></span></span>
          <span class="cabinet-deck" aria-hidden="true"><span class="stick"></span><span class="knob"></span><span class="knob"></span><span class="knob"></span></span>
          <span class="cabinet-base">
            <span class="cabinet-pitch">${pitch}</span>
            <span class="cabinet-play">Play</span>
          </span>
        </a>
      </li>`;
  return after(html, /^ {6}<li class="cabinet" data-game="[a-z-]+">[\s\S]*?^ {6}<\/li>/, li, 'a cabinet in index.html');
}

/** js/games.js with the game last in the hall, with one high-score board. */
export const addGame = (js, { id }) =>
  after(js, /^ {2}\{ id: '[a-z-]+', demo: .*\},$/, `  { id: '${id}', demo: () => import('../games/${id}/demo.js'), boards: [{ id: '${id}:solo', label: '' }], order: 'high' },`, 'a line in js/games.js');

/** styles.css with the zoom from the game's cabinet into its page. */
export const addZoom = (css, { id }) =>
  after(css, /^\.cabinet\[data-game="[a-z-]+"\] \.screen, .*view-transition-name: [a-z-]+; \}$/, `.cabinet[data-game="${id}"] .screen, .game[data-game="${id}"] .game-main { view-transition-name: ${id}; }`, 'a view-transition-name rule in styles.css');

/** sitemap.xml with the game's page, the games in a-z order. */
export function addToSitemap(xml, { id }) {
  const url = (game) => `  <url><loc>https://arcade.notchup.fi/games/${game}/</loc></url>`;
  const games = [...xml.matchAll(/\/games\/([a-z-]+)\//g)].map((m) => m[1]);
  const next = games.find((game) => game > id);
  return next ? xml.replace(url(next), `${url(id)}\n${url(next)}`) : after(xml, /^ {2}<url>.*<\/url>$/, url(id), 'a page in sitemap.xml');
}

/** Every file the new game needs, as { path: text }, and the lists it changes. */
export function newGameFiles({ id, name }) {
  if (!ID.test(id ?? '')) throw new Error(`The id is lowercase words of letters joined by hyphens, like "light-up"; not "${id ?? ''}"`);
  if (!NAME.test(name?.trim() ?? '')) throw new Error(`The name is letters, digits, spaces and hyphens, like "Light Up"; not "${name ?? ''}"`);
  const values = {
    id,
    name: name.trim(),
    genre: 'a reaction game',
    kind: 'reaction game',
    pitch: 'Tap while the light is lit. A tap in the dark ends the run.',
  };
  const tpl = (f) => fill(read(`${TEMPLATES}/${f}`), values);
  const page = `games/${id}/index.html`;
  const files = {
    [`games/${id}/rules.js`]: tpl('rules.js'),
    [`games/${id}/scene.js`]: tpl('scene.js'),
    [`games/${id}/main.js`]: tpl('main.js'),
    [`games/${id}/demo.js`]: tpl('demo.js'),
    [`tests/${id}.test.js`]: tpl('test.js'),
  };
  return {
    files,
    page,
    html: tpl('index.html'),
    hall: addCabinet(read('index.html'), values),
    games: addGame(read('js/games.js'), values),
    css: addZoom(read('styles.css'), values),
    sitemap: addToSitemap(read('sitemap.xml'), values),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [id, name] = process.argv.slice(2);
  try {
    const made = newGameFiles({ id, name });
    for (const f of [`games/${id}`, `tests/${id}.test.js`]) if (existsSync(join(root, f))) throw new Error(`${f} is already there`);
    // Everything is worked out before the first write, so a failure leaves nothing half made.
    const ids = [...made.games.matchAll(/^ {2}\{ id: '([a-z-]+)'/gm)].map((m) => m[1]);
    const hall = orderHall(made.hall, ids);
    const template = read(TEMPLATE);
    const write = (f, text) => writeFileSync(join(root, f), text);
    mkdirSync(join(root, 'games', id));
    for (const [f, text] of Object.entries(made.files)) write(f, text);
    write(made.page, syncPage(made.page, made.html, template)); // its preloads, from main.js now on disk
    write('js/games.js', made.games);
    write('styles.css', made.css);
    write('sitemap.xml', made.sitemap);
    write('index.html', hall);
    console.log(`✅ ${name} is at games/${id}/. ./dev serve to play it; docs/adding-a-game.md says what to change next.`);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}
