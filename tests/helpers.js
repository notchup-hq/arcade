// Shared by the tests: the shipped files, read from the repo root.

import { filesIn, pages } from '../scripts/site.mjs';

export { entryOf, filesIn, lazyImportsOf, moduleGraph, pages, read, resolve, root } from '../scripts/site.mjs';

/** Everything the site serves to a visitor (tests, docs and tools are not part of the site). */
export const shippedFiles = () => [
  ...pages(),
  'styles.css',
  ...filesIn('js', /\.js$/),
  ...filesIn('games', /\.js$/),
  ...filesIn('assets', /\.(svg|png)$/).filter((f) => f.endsWith('.svg')),
];
