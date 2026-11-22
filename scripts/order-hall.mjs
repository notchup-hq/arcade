// ./dev order: put the hall's ready cabinets in index.html in the order of js/games.js. The hall stays
// plain HTML (no JavaScript needed to see the games, nothing moves after the first paint), and this
// script is what keeps its order in one list. Cabinets of games still coming stay after the ready ones;
// only the <li> cabinets are kept, so put no comments between them.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GAMES } from '../js/games.js';

/** `html` with its ready cabinets in the order of `ids`; throws when the two do not name the same games. */
export function orderHall(html, ids) {
  const list = html.match(/(<ul class="cabinets">\n)([\s\S]*?)(\n\s*<\/ul>)/);
  if (!list) throw new Error('index.html: no <ul class="cabinets">');
  const cabinets = list[2].match(/ *<li class="cabinet"[\s\S]*?<\/li>/g) ?? [];
  const gameOf = (li) => li.match(/data-game="([a-z-]+)"/)?.[1];
  const ready = new Map(cabinets.filter(gameOf).map((li) => [gameOf(li), li]));
  const missing = ids.filter((id) => !ready.has(id));
  const extra = [...ready.keys()].filter((id) => !ids.includes(id));
  if (missing.length || extra.length) {
    throw new Error(`js/games.js and index.html disagree. No cabinet for: ${missing.join(', ') || '-'}; not in GAMES: ${extra.join(', ') || '-'}`);
  }
  const ordered = [...ids.map((id) => ready.get(id)), ...cabinets.filter((li) => !gameOf(li))];
  return html.replace(list[0], () => list[1] + ordered.join('\n') + list[3]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../index.html', import.meta.url);
  const html = readFileSync(file, 'utf8');
  const ids = GAMES.map((g) => g.id);
  const next = orderHall(html, ids);
  if (next === html) console.log('✅ The hall is already in the order of js/games.js');
  else {
    writeFileSync(file, next);
    console.log(`✅ Hall order: ${ids.join(', ')}`);
  }
}
