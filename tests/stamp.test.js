import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stamp } from '../scripts/stamp-build.mjs';
import { pages, read } from './helpers.js';

test('stamp writes the short commit and the date into the build tag', () => {
  const html = '<meta name="build" content="dev">';
  assert.equal(stamp(html, '0123456789abcdef', '2026-11-21'), '<meta name="build" content="0123456 2026-11-21">');
});

test('every page has the build placeholder the stamp replaces', () => {
  for (const page of pages()) assert.match(read(page), /<meta name="build" content="dev">/, page);
});
