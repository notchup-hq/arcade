// A challenge: one score, packed into a short code that rides in a link's # part ("#c=…"), which the
// browser never sends to any server. This is a compact encoding, not encryption: the code is public, so
// anyone can read or forge one. The checksum only catches typos and half-copied links; it is not a
// signature. Challengers are shown as "not verified", and nothing is saved until the visitor taps Save.
//
// 65 bits, written as 13 base32 characters: board (6) · score (24) · three initials (3 × 5) · day made,
// counted from 2026-01-01 (12) · checksum (8). The board is its place in the list of boards below, so
// that list only ever grows at the end (tests/challenge.test.js pins it).

import { GAMES } from './games.js';
import { cleanInitials } from './scores.js';

export const BOARDS = GAMES.flatMap((game) => game.boards.map((board) => board.id));

// Base32 without the look-alike characters I, L, O and U.
const DIGITS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ.';
const EPOCH = Date.UTC(2026, 0, 1);
const DAY = 86_400_000;
const MAX_VALUE = 2 ** 24 - 1;
const MAX_DAYS = 2 ** 12 - 1;
const CODE_LENGTH = 13;
const MAX_AGE_DAYS = 366;

/** CRC-8 (polynomial 0x07) of the first 57 bits, as 8 bytes. */
function checksum(body) {
  let crc = 0;
  for (let shift = 56n; shift >= 0n; shift -= 8n) {
    crc ^= Number((body >> shift) & 0xffn);
    for (let k = 0; k < 8; k++) crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
  }
  return crc;
}

/** The code for a score, or null when it cannot be packed. `date` is in ms. */
export function packChallenge({ board, value, initials, date }) {
  const b = BOARDS.indexOf(board);
  const clean = cleanInitials(initials);
  const days = Math.floor((date - EPOCH) / DAY);
  if (b < 0 || !clean || !Number.isInteger(value) || value < 1 || value > MAX_VALUE || !(days >= 0 && days <= MAX_DAYS)) return null;
  let body = BigInt(b);
  body = (body << 24n) | BigInt(value);
  for (const ch of clean) body = (body << 5n) | BigInt(LETTERS.indexOf(ch));
  body = (body << 12n) | BigInt(days);
  let all = (body << 8n) | BigInt(checksum(body));
  let out = '';
  for (let k = 0; k < CODE_LENGTH; k++, all >>= 5n) out = DIGITS[Number(all & 31n)] + out;
  return out;
}

/**
 * The score in a code, as { board, value, initials, date }, or null when the code is not a challenge
 * this page accepts: wrong length or letters, failed checksum, unknown board, bad initials, no score,
 * or a date in the future or over a year old. Case, spaces, and O, I, L typed for 0, 1, 1 are forgiven.
 */
export function unpackChallenge(raw, now = Date.now()) {
  if (typeof raw !== 'string') return null;
  const code = raw.toUpperCase().replace(/\s/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (code.length !== CODE_LENGTH) return null;
  let all = 0n;
  for (const ch of code) {
    const d = DIGITS.indexOf(ch);
    if (d < 0) return null;
    all = (all << 5n) | BigInt(d);
  }
  const body = all >> 8n;
  if (Number(all & 0xffn) !== checksum(body)) return null;
  const days = Number(body & 0xfffn);
  const letters = Number((body >> 12n) & 0x7fffn);
  const value = Number((body >> 27n) & 0xffffffn);
  const board = BOARDS[Number(body >> 51n)];
  const initials = cleanInitials([10, 5, 0].map((s) => LETTERS[(letters >> s) & 31]).join(''));
  const date = EPOCH + days * DAY;
  if (!board || !initials || value < 1 || date > now + DAY || date < now - MAX_AGE_DAYS * DAY) return null;
  return { board, value, initials, date };
}

/** The code in an address's # part ("#c=…"), or null. */
export const codeInHash = (hash) => /^#c=([0-9A-Za-z]{13})$/.exec(hash)?.[1] ?? null;
