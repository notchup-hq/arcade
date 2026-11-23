// The site's files, read from the repo root, and its module graph worked out from the import lines:
// what a page's script pulls in. Used by ./dev sync (scripts/sync-pages.mjs) and by the tests.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url));
export const read = (f) => readFileSync(join(root, f), 'utf8');

const SKIP = new Set(['.git', '.local', 'node_modules']);

/** Every file under `dir` (repo-relative, forward slashes) that matches `re`. */
export function filesIn(dir, re) {
  const out = [];
  for (const name of readdirSync(join(root, dir))) {
    if (SKIP.has(name)) continue;
    const path = join(root, dir, name);
    const rel = relative(root, path).split('\\').join('/');
    if (statSync(path).isDirectory()) out.push(...filesIn(rel, re));
    else if (re.test(name)) out.push(rel);
  }
  return out.sort();
}

/** The pages of the site: the hall and one per game. */
export const pages = () => ['index.html', ...filesIn('games', /^index\.html$/)];

/** A relative URL against a folder (as parts), as a repo path. */
export function resolve(dir, url) {
  const parts = [...dir];
  for (const seg of url.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

const dirOf = (file) => file.split('/').slice(0, -1);

/** The relative module imports of a JS file, resolved to repo paths. */
function importsOf(file) {
  return [...read(file).matchAll(/^import\s[^'"]*['"](\.{1,2}\/[^'"]+)['"]/gm)].map((m) => resolve(dirOf(file), m[1]));
}

/** The modules a JS file fetches later, with import('./x.js'), resolved to repo paths. */
export function lazyImportsOf(file) {
  return [...read(file).matchAll(/\bimport\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)].map((m) => resolve(dirOf(file), m[1]));
}

/** Every module a page's entry script pulls in, the entry itself left out, sorted. */
export function moduleGraph(entry) {
  const seen = new Set();
  const visit = (f) => {
    for (const dep of importsOf(f)) if (!seen.has(dep)) { seen.add(dep); visit(dep); }
  };
  visit(entry);
  return [...seen].sort();
}

/** The entry module of a page, from its HTML (its one script type="module"). */
export function entryOf(page, html = read(page)) {
  const script = /<script type="module" src="([^"]+)"[^>]*>/.exec(html);
  if (!script) throw new Error(`${page}: no <script type="module" src="...">`);
  return resolve(dirOf(page), script[1]);
}

/** A repo path as a URL relative to a page's folder. */
export function relativeTo(page, file) {
  const from = dirOf(page);
  const to = file.split('/');
  let same = 0;
  while (same < from.length && from[same] === to[same]) same++;
  return [...from.slice(same).map(() => '..'), ...to.slice(same)].join('/');
}
