// ./dev version <x.y.z>: release a version in one step. It sets js/version.js, turns the changelog's
// "## Unreleased" heading into "## x.y.z – date", and runs the page sync, so every page shows the new
// version. Tagging and the GitHub release stay with the owner (AGENTS.md).

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../js/version.js';
import { root } from './site.mjs';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const parts = (v) => SEMVER.exec(v).slice(1).map(Number);

/** True when `next` is a higher version than `current`. */
export function isNewer(next, current) {
  const [a, b] = [parts(next), parts(current)];
  const i = a.findIndex((n, k) => n !== b[k]);
  return i >= 0 && a[i] > b[i];
}

/** `changelog` with its Unreleased heading made the release `version` of `date` (YYYY-MM-DD); throws when it cannot. */
export function releaseChangelog(changelog, version, date) {
  const m = /^## Unreleased\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(changelog);
  if (!m) throw new Error('CHANGELOG.md has no "## Unreleased" heading');
  if (!/^- /m.test(m[1])) throw new Error('"## Unreleased" has no entries to release');
  return changelog.replace('## Unreleased', `## ${version} – ${date}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = process.argv[2];
  if (!SEMVER.test(version ?? '')) throw new Error('Usage: ./dev version x.y.z (for example 0.3.0)');
  if (!isNewer(version, VERSION)) throw new Error(`${version} is not newer than the current ${VERSION}`);
  const changelog = join(root, 'CHANGELOG.md');
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' });
  const released = releaseChangelog(readFileSync(changelog, 'utf8'), version, date);
  writeFileSync(changelog, released);
  const file = join(root, 'js/version.js');
  writeFileSync(file, readFileSync(file, 'utf8').replace(/VERSION = '[^']+'/, `VERSION = '${version}'`));
  execFileSync(process.execPath, [join(root, 'scripts/sync-pages.mjs')], { stdio: 'inherit' });
  console.log(`✅ Version ${version}, ${date}. Next: ./dev test, commit, merge, then tag v${version} and make the GitHub release.`);
}
