// The shared code in js/ is the arcade's kit: a fix there reaches every game. This fails when a
// game's own code does again what the kit does, so a copy cannot creep back in. Use the kit module
// named in the message instead (docs/how-it-works.md lists what each one does).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filesIn, read } from './helpers.js';

// What the kit owns: a pattern, the module to use, and the files allowed to match it.
const OWNED = [
  { re: /devicePixelRatio/, use: 'sharpCanvas in js/canvas.js', owner: 'js/canvas.js' },
  { re: /0x6d2b79f5/i, use: 'seeded in js/random.js', owner: 'js/random.js' },
  { re: /function pickLine\b/, use: 'pickLine in js/random.js', owner: 'js/random.js' },
  { re: /\baskInitials\(|\.addScore\(/, use: 'createFame in js/fame.js', owner: 'js/fame.js', also: ['js/initials.js', 'js/memory.js'] },
  { re: /history\.replaceState|searchParams\.(get|set)\(['"]level['"]/, use: 'pickLevel in js/levels.js', owner: 'js/levels.js', also: ['js/hall.js'] },
  { re: /dialog\[open\]|help-open|fame-open/, use: 'js/dialogs.js', owner: 'js/dialogs.js', also: ['js/grace.js'] },
  { re: /badge-logo/, use: 'consoleLogo in js/logo.js', owner: 'js/logo.js' },
  // Grid moves: Home and End go with the arrows only on a board of buttons. Patch Night's arrows aim
  // its turret, but it has no Home or End.
  { re: /['"](Home|End)['"]/, use: 'gridKeys in js/grid.js', owner: 'js/grid.js' },
];

test('no game, and no other shared module, copies what a kit module does', () => {
  const hits = [];
  for (const f of [...filesIn('games', /\.js$/), ...filesIn('js', /\.js$/)]) {
    const text = read(f);
    for (const { re, use, owner, also = [] } of OWNED) {
      if (f !== owner && !also.includes(f) && re.test(text)) hits.push(`${f}: use ${use}`);
    }
  }
  assert.deepEqual(hits, []);
});
