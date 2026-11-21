// What search engines and the host read: every page is in the sitemap, and the security headers stay
// strict (no inline code, nothing from other origins), which only works because the site has neither.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pages, read, shippedFiles } from './helpers.js';

test('the sitemap lists every page and nothing else', () => {
  const listed = [...read('sitemap.xml').matchAll(/<loc>https:\/\/arcade\.notchup\.fi\/([^<]*)<\/loc>/g)].map((m) => m[1]).sort();
  const expected = pages().map((p) => p.replace(/index\.html$/, '')).sort();
  assert.deepEqual(listed, expected);
});

test('the content security policy allows only this site and no inline code', () => {
  const csp = /Content-Security-Policy: (.*)/.exec(read('_headers'))[1];
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /style-src 'self';/);
  assert.doesNotMatch(csp, /unsafe|https?:|\*/);
});

test('pages have no inline scripts, inline styles or event handler attributes', () => {
  for (const page of pages()) {
    const html = read(page);
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, `${page}: inline script`);
    assert.doesNotMatch(html, /<style\b|\sstyle="/, `${page}: inline style`);
    assert.doesNotMatch(html, /\son[a-z]+="/, `${page}: event handler attribute`);
  }
  for (const f of shippedFiles().filter((x) => x.endsWith('.js'))) {
    assert.doesNotMatch(read(f), /\.innerHTML\s*=|setAttribute\(\s*['"]style['"]/, `${f}: markup or styles from strings`);
  }
});
