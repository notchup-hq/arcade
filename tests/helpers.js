// Shared by the tests: the shipped files, read from the repo root.

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

/** Everything the site serves to a visitor (tests, docs and tools are not part of the site). */
export const shippedFiles = () => [
  ...pages(),
  'styles.css',
  ...filesIn('js', /\.js$/),
  ...filesIn('games', /\.js$/),
  ...filesIn('assets', /\.(svg|png)$/).filter((f) => f.endsWith('.svg')),
];

/** The relative module imports of a JS file, resolved to repo paths. */
export function importsOf(file) {
  const dir = file.split('/').slice(0, -1);
  return [...read(file).matchAll(/^import\s[^'"]*['"](\.{1,2}\/[^'"]+)['"]/gm)].map((m) => resolve(dir, m[1]));
}

/** A relative URL against a folder (as parts), as a repo path. */
export function resolve(dir, url) {
  const parts = [...dir];
  for (const seg of url.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

/** The modules a JS file fetches later, with import('./x.js'), resolved to repo paths. */
export function lazyImportsOf(file) {
  const dir = file.split('/').slice(0, -1);
  return [...read(file).matchAll(/\bimport\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)].map((m) => resolve(dir, m[1]));
}

/** Every module a page's entry script pulls in, the entry itself left out. */
export function moduleGraph(entry) {
  const seen = new Set();
  const visit = (f) => {
    for (const dep of importsOf(f)) if (!seen.has(dep)) { seen.add(dep); visit(dep); }
  };
  visit(entry);
  return [...seen].sort();
}

/** The entry module of a page (its one script type="module"). */
export function entryOf(page) {
  const src = /<script type="module" src="([^"]+)">/.exec(read(page))[1];
  return resolve(page.split('/').slice(0, -1), src);
}
