// ./dev sync: write the HTML every page shares from one place, so a fix there is made once. The pages
// stay plain static HTML (nothing is put together in the browser), and this script is what keeps the
// copies the same, like ./dev order does for the hall. From scripts/templates/game/index.html it copies
// into every page the head's first lines (charset to build stamp), and into every game page the Arcade
// link, the bar's buttons and the initials dialog. It also writes each page's modulepreload list from
// the imports of its script. What differs per game (title, help, hall-of-fame caption) is left alone.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entryOf, moduleGraph, pages, read, relativeTo, root } from './site.mjs';

export const TEMPLATE = 'scripts/templates/game/index.html';

/** The shared blocks, each found by where it starts and ends; `games` blocks are on game pages only. */
const BLOCKS = [
  { name: 'head', re: /  <meta charset="utf-8">\n[\s\S]*?<meta name="build" content="dev">\n/, games: false },
  { name: 'back link', re: /    <a class="back"[^\n]*\n/, games: true },
  { name: 'bar buttons', re: /    <div class="tools">\n[\s\S]*?\n    <\/div>\n/, games: true },
  { name: 'initials dialog', re: /  <dialog id="initials"[\s\S]*?\n  <\/dialog>\n/, games: true },
];

/** The modulepreload lines just before the page's script (none is fine, as in the template). */
const PRELOADS = /(?:  <link rel="modulepreload" href="[^"]+">\n)*(?=  <script type="module")/;

function only(html, re, what, page) {
  const all = html.match(new RegExp(re.source, 'g')) ?? [];
  if (all.length !== 1) throw new Error(`${page}: expected one ${what}, found ${all.length}`);
  return all[0];
}

/** `html` of `page` with the shared blocks from `template` and the preloads its script needs. */
export function syncPage(page, html, template, graph = moduleGraph(entryOf(page, html))) {
  const game = page.startsWith('games/');
  let out = html;
  for (const { name, re, games } of BLOCKS) {
    if (games && !game) continue;
    const block = only(template, re, name, TEMPLATE);
    out = out.replace(only(out, re, name, page), () => block);
  }
  const preloads = graph.map((f) => `  <link rel="modulepreload" href="${relativeTo(page, f)}">\n`).join('');
  return out.replace(PRELOADS, () => preloads);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const template = read(TEMPLATE);
  const changed = [];
  for (const page of pages()) {
    const html = read(page);
    const next = syncPage(page, html, template);
    if (next !== html) {
      writeFileSync(join(root, page), next);
      changed.push(page);
    }
  }
  console.log(changed.length ? `✅ Synced ${changed.join(', ')}` : '✅ Every page is already in sync');
}
