// Stamps the deployed commit and date into each page's <meta name="build">.
// Runs from wrangler.jsonc's build command on Cloudflare; locally the pages keep "dev".
// WORKERS_CI_COMMIT_SHA is set by Cloudflare Workers Builds.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const PLACEHOLDER = '<meta name="build" content="dev">';

/** The page with the placeholder replaced by `short-sha date`. */
export function stamp(html, sha, date) {
  return html.replace(PLACEHOLDER, `<meta name="build" content="${sha.slice(0, 7)} ${date}">`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sha = process.env.WORKERS_CI_COMMIT_SHA;
  if (!/^[0-9a-f]{7,40}$/.test(sha ?? '')) {
    console.log('No commit SHA in the environment, pages keep "dev".');
  } else {
    const root = fileURLToPath(new URL('..', import.meta.url));
    const date = new Date().toISOString().slice(0, 10);
    const games = readdirSync(join(root, 'games')).map((g) => `games/${g}/index.html`);
    for (const page of ['index.html', ...games].filter((p) => existsSync(join(root, p)))) {
      writeFileSync(join(root, page), stamp(readFileSync(join(root, page), 'utf8'), sha, date));
    }
  }
}
