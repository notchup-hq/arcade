import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOARDS, codeInHash, packChallenge, unpackChallenge } from '../js/challenge.js';

const NOW = Date.UTC(2026, 10, 23, 12);
const score = { board: 'lob:solo', value: 1840, initials: 'PEK', date: NOW };
const dayOf = (ms) => Math.floor(ms / 86_400_000) * 86_400_000;

test('the board list only grows at the end: its order is part of every link', () => {
  assert.deepEqual(BOARDS, [
    'fuse-box:easy', 'fuse-box:medium', 'fuse-box:hard', 'lob:solo',
    'patch-night:simple', 'patch-night:medium', 'patch-night:hard', 'notch-up:tower',
    'pair-up:easy', 'pair-up:medium', 'pair-up:hard', 'night-deal:draw-1', 'night-deal:draw-3',
    'bent-beam:easy', 'bent-beam:medium', 'bent-beam:hard',
  ]);
});

test('a score survives packing: 13 characters, the day kept and the time of day dropped', () => {
  const code = packChallenge(score);
  assert.match(code, /^[0-9A-HJKMNP-TV-Z]{13}$/);
  assert.deepEqual(unpackChallenge(code, NOW), { ...score, date: dayOf(score.date) });
});

test('Finnish letters, dots and the biggest score pack too', () => {
  for (const initials of ['ÅÄÖ', 'P.K', '..A']) {
    const s = { ...score, initials, value: 2 ** 24 - 1, board: BOARDS.at(-1) };
    assert.equal(unpackChallenge(packChallenge(s), NOW)?.initials, initials);
  }
});

test('lower case, spaces and look-alike characters are forgiven', () => {
  const code = packChallenge(score);
  assert.equal(unpackChallenge(` ${code.toLowerCase()} `, NOW)?.value, 1840);
  const typed = code.replace(/0/g, 'O').replace(/1/g, 'l');
  assert.equal(unpackChallenge(typed, NOW)?.value, 1840);
});

test('what cannot be packed is refused', () => {
  assert.equal(packChallenge({ ...score, board: 'chess:solo' }), null);
  assert.equal(packChallenge({ ...score, initials: 'A1B' }), null);
  assert.equal(packChallenge({ ...score, value: 0 }), null);
  assert.equal(packChallenge({ ...score, value: 1.5 }), null);
  assert.equal(packChallenge({ ...score, value: 2 ** 24 }), null);
  assert.equal(packChallenge({ ...score, date: Date.UTC(2025, 11, 31) }), null);
});

test('any single changed character fails the checksum or the checks', () => {
  const code = packChallenge(score);
  const digits = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  for (let k = 0; k < code.length; k++) {
    for (const d of digits) {
      if (d === code[k]) continue;
      const forged = unpackChallenge(code.slice(0, k) + d + code.slice(k + 1), NOW);
      // A change in the last character that a forgiven look-alike undoes is the same code; anything else fails.
      assert.equal(forged, null, `${k}:${d}`);
    }
  }
});

test('codes that are too short, too long, not text or not base32 are ignored', () => {
  const code = packChallenge(score);
  for (const bad of [null, undefined, 42, '', code.slice(1), `${code}0`, `${code.slice(0, 12)}U`, '!'.repeat(13)]) {
    assert.equal(unpackChallenge(bad, NOW), null);
  }
});

test('a date in the future or over a year old is ignored', () => {
  const code = packChallenge(score);
  assert.ok(unpackChallenge(code, NOW + 364 * 86_400_000));
  assert.equal(unpackChallenge(code, NOW + 368 * 86_400_000), null);
  assert.equal(unpackChallenge(code, NOW - 3 * 86_400_000), null);
});

test('only the address\'s own # part is read', () => {
  const code = packChallenge(score);
  assert.equal(codeInHash(`#c=${code}`), code);
  for (const hash of ['', '#', `#c=${code}0`, `#x=${code}`, `c=${code}`, `#c=<script>`]) assert.equal(codeInHash(hash), null);
});
