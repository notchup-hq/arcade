// Privacy guard: the arcade promises no cookies, no tracking, no requests to other origins and no
// forms that send anything. Browser storage is used for one thing only, this browser's settings and
// high scores, in exactly one file (js/memory.js, one key). This scans everything the site serves.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, shippedFiles } from './helpers.js';

const MEMORY_FILE = 'js/memory.js';
const STORAGE_KEY = 'arcade:v1';

const FORBIDDEN = [
  /sessionStorage/i,
  /indexedDB/i,
  /document\.cookie/i,
  /document\[\s*['"]cookie['"]\s*\]/i,
  /cookieStore/i,
  /navigator\.storage/i,
  /\bcaches\./,
  /openDatabase/i,
  /window\.name\s*=/,
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /sendBeacon/,
  /WebSocket/,
  /EventSource/,
  /<form\b(?![^>]*\bmethod="dialog")/i, // only dialog forms, which close a dialog and send nothing
  /<iframe\b/i,
  /@import/i,
  /(?:src|href)\s*=\s*["']?\/\//i, // protocol-relative URL
];

// URLs that are never requested: XML namespace names.
const ALLOWED_URLS = [
  /xmlns(?::\w+)?="https?:\/\/[^"]*"/g,
  /const SVG_NS = 'http:\/\/www\.w3\.org\/2000\/svg';/g,
];

// In pages only: links the visitor may click, and the site's own address for search engines and link previews.
const ALLOWED_IN_HTML = [
  /<a\s[^>]*href="https?:\/\/[^"]*"/g,
  /https:\/\/arcade\.notchup\.fi\/[^"\s]*/g,
];

/** Problems in one file's text, as "file:line: what". */
export function scan(file, text) {
  const problems = [];
  text.split('\n').forEach((raw, i) => {
    let line = ALLOWED_URLS.reduce((l, re) => l.replace(re, ''), raw);
    if (file.endsWith('.html')) line = ALLOWED_IN_HTML.reduce((l, re) => l.replace(re, ''), line);
    for (const re of FORBIDDEN) {
      const m = re.exec(line);
      if (m) problems.push(`${file}:${i + 1}: ${m[0]}`);
    }
    const ls = /localStorage/i.exec(line);
    if (ls && file !== MEMORY_FILE) problems.push(`${file}:${i + 1}: ${ls[0]} outside ${MEMORY_FILE}`);
    const url = /https?:\/\/[^\s"')]*/.exec(line);
    if (url) problems.push(`${file}:${i + 1}: external URL ${url[0]}`);
  });
  return problems;
}

test('shipped files have no storage, tracking, forms or third-party URLs', () => {
  const files = shippedFiles();
  assert.ok(files.length >= 15, 'expected to scan the whole site');
  assert.deepEqual(files.flatMap((f) => scan(f, read(f))), []);
});

test('storage stays inside js/memory.js: one use of localStorage and one key', () => {
  const text = read(MEMORY_FILE);
  assert.equal(text.match(/localStorage/g)?.length, 1);
  assert.deepEqual(text.match(/'arcade:[^']*'/g), [`'${STORAGE_KEY}'`]);
  for (const f of shippedFiles()) {
    if (f !== MEMORY_FILE) assert.ok(!read(f).includes(STORAGE_KEY), `${f} must not name the storage key`);
  }
});

test('the scanner catches what it should', () => {
  const bad = [
    ['js/x.js', "localStorage.setItem('a', 1)"],
    ['js/memory.js', 'document.cookie = "a=1"'],
    ['js/memory.js', "fetch('/api')"],
    ['js/x.js', "navigator.sendBeacon('/log')"],
    ['js/x.js', 'new WebSocket("wss://x")'],
    ['index.html', '<form action="/x">'],
    ['index.html', '<script src="https://cdn.example.com/a.js"></script>'],
    ['index.html', '<script src="//cdn.example.com/a.js"></script>'],
    ['styles.css', "@import url('x.css');"],
    ['styles.css', 'body { background: url(https://example.com/a.png); }'],
    ['js/x.js', "const own = 'https://arcade.notchup.fi/x';"],
  ];
  for (const [file, text] of bad) assert.notDeepEqual(scan(file, text), [], `${file}: ${text}`);
});

test('the scanner allows links, dialog forms, namespaces and the site\'s own address', () => {
  const ok = [
    ['index.html', '<a href="https://notchup.fi">Made by Notchup</a>'],
    ['games/fuse-box/index.html', '<form method="dialog">'],
    ['index.html', '<link rel="canonical" href="https://arcade.notchup.fi/">'],
    ['assets/mark.svg', '<svg xmlns="http://www.w3.org/2000/svg">'],
    ['js/gear.js', "const SVG_NS = 'http://www.w3.org/2000/svg';"],
  ];
  for (const [file, text] of ok) assert.deepEqual(scan(file, text), [], `${file}: ${text}`);
});
