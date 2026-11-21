import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VERSION } from '../js/version.js';
import { pages, read } from './helpers.js';

test('version is a semantic version', () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});

test('version matches the newest CHANGELOG heading', () => {
  const heading = /^## \[?(\d+\.\d+\.\d+)\]?/m.exec(read('CHANGELOG.md'));
  assert.ok(heading, 'CHANGELOG.md has no "## x.y.z" heading');
  assert.equal(heading[1], VERSION, `js/version.js says ${VERSION}, CHANGELOG.md says ${heading[1]}`);
});

test('every page shows the same version before its script runs', () => {
  for (const page of pages()) assert.match(read(page), new RegExp(`class="version">v${VERSION.replace(/\./g, '\\.')}<`), page);
});
