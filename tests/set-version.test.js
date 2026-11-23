import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewer, releaseChangelog } from '../scripts/set-version.mjs';

test('only a higher version is newer, compared as numbers', () => {
  assert.ok(isNewer('0.3.0', '0.2.0'));
  assert.ok(isNewer('0.10.0', '0.9.0'));
  assert.ok(isNewer('1.0.0', '0.99.99'));
  assert.ok(!isNewer('0.2.0', '0.2.0'));
  assert.ok(!isNewer('0.1.9', '0.2.0'));
});

test('the Unreleased heading becomes the release, and older ones stay', () => {
  const log = '# Changelog\n\n## Unreleased\n\n### Added\n\n- A thing.\n\n## 0.2.0 – 2026-11-23\n\n- Old.\n';
  assert.equal(
    releaseChangelog(log, '0.3.0', '2026-12-01'),
    '# Changelog\n\n## 0.3.0 – 2026-12-01\n\n### Added\n\n- A thing.\n\n## 0.2.0 – 2026-11-23\n\n- Old.\n',
  );
});

test('a release needs an Unreleased heading with entries', () => {
  assert.throws(() => releaseChangelog('# Changelog\n\n## 0.2.0 – 2026-11-23\n\n- Old.\n', '0.3.0', '2026-12-01'), /no "## Unreleased"/);
  assert.throws(() => releaseChangelog('# Changelog\n\n## Unreleased\n\n## 0.2.0 – 2026-11-23\n\n- Old.\n', '0.3.0', '2026-12-01'), /no entries/);
});
