// Security guard. The arcade reads two things a stranger can write (the # and ? of a link) and one a
// script on the page could (local storage). The rules that keep that harmless: nothing turns text into
// markup or code, nothing navigates from data, and the CSP in _headers stays strict.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, shippedFiles } from './helpers.js';

const SINKS = [
  /\.(?:innerHTML|outerHTML|srcdoc)\b/,
  /insertAdjacentHTML/,
  /createContextualFragment/,
  /\bDOMParser\b/,
  /document\.write/,
  /\beval\s*\(/,
  /\bnew\s+Function\b/,
  /\b(?:setTimeout|setInterval)\s*\(\s*['"`]/, // a string timer is eval
  /createElement\(\s*['"](?:script|iframe|object|embed)['"]/,
  /\.on[a-z]+\s*=[^=]/, // use addEventListener; inline handlers are also blocked by the CSP
  /setAttribute\(\s*['"]on/i,
  /\bjavascript:/i,
  /\b(?:location|location\.href|window\.location|top\.location)\s*=[^=]/, // no navigation from data
  /location\.(?:assign|replace)\s*\(/,
  /window\.open\s*\(/,
  /postMessage|importScripts|import\s*\(\s*[^'"\s)]/, // dynamic import() only of a literal path
];

/** Problems in one file's text, as "file:line: what". */
export function scan(file, text) {
  const problems = [];
  text.split('\n').forEach((line, i) => {
    if (file.endsWith('.css') || file.endsWith('.svg')) return;
    const code = file.endsWith('.html') ? line : line.replace(/\/\/.*$/, '');
    for (const re of SINKS) {
      const m = re.exec(code);
      if (m) problems.push(`${file}:${i + 1}: ${m[0]}`);
    }
  });
  return problems;
}

test('no code turns text into markup, code or navigation', () => {
  const files = shippedFiles();
  assert.ok(files.length >= 15, 'expected to scan the whole site');
  assert.deepEqual(files.flatMap((f) => scan(f, read(f))), []);
});

test('the scanner catches what it should', () => {
  const bad = [
    'el.innerHTML = name;',
    "el.insertAdjacentHTML('beforeend', s);",
    'document.write(s)',
    'eval(code)',
    'new Function(code)',
    "setTimeout('go()', 10)",
    "document.createElement('script')",
    'button.onclick = go;',
    "a.setAttribute('onclick', 'x')",
    'location.href = target;',
    'location = target;',
    'window.open(url)',
    'import(path)',
    'win.postMessage(x, "*")',
  ];
  for (const text of bad) assert.notDeepEqual(scan('js/x.js', text), [], text);
});

test('the scanner allows what the code does today', () => {
  const ok = [
    'el.textContent = name;',
    "dialog.addEventListener('close', go);",
    "const { x } = await import('./challenge-ui.js');",
    "history.replaceState(null, '', location.pathname + location.search);",
    'if (location.hash.startsWith("#c=")) go();',
    'if (a === b) go(); // el.innerHTML = never',
  ];
  for (const text of ok) assert.deepEqual(scan('js/x.js', text), [], text);
});

test('the content security policy stays strict', () => {
  const csp = /Content-Security-Policy:\s*(.+)/.exec(read('_headers'))?.[1] ?? '';
  const directives = Object.fromEntries(csp.split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([k, ...v]) => [k, v]));
  assert.deepEqual(directives['default-src'], ["'none'"]);
  assert.deepEqual(directives['script-src'], ["'self'"]);
  assert.deepEqual(directives['style-src'], ["'self'"]);
  assert.deepEqual(directives['connect-src'], ["'none'"]);
  assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
  assert.deepEqual(directives['base-uri'], ["'none'"]);
  assert.deepEqual(directives['form-action'], ["'none'"]);
  assert.ok(!/unsafe-|\*|https?:/.test(csp), 'no unsafe-inline, unsafe-eval, wildcard or other origin');
  for (const header of ['Strict-Transport-Security', 'X-Content-Type-Options: nosniff', 'Referrer-Policy', 'Permissions-Policy']) {
    assert.ok(read('_headers').includes(header), `${header} is set`);
  }
});
