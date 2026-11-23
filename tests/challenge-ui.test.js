import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packChallenge } from '../js/challenge.js';
import { challengeLine, shareText, whereWords } from '../js/challenge-ui.js';

const code = packChallenge({ board: 'lob:solo', value: 1840, initials: 'PEK', date: Date.now() });
const args = (extra) => ({ hash: `#c=${code}`, game: 'lob', gameName: 'Lob', score: String, rand: () => 0, ...extra });

test('a good link for this game gives the card its line, with the score in the game\'s words', () => {
  assert.equal(challengeLine(args()), 'A challenger has arrived. PEK scored 1840 in Lob. Can you beat it?');
});

test('a link for another game, a bad code or no code gives no card', () => {
  for (const extra of [{ game: 'fuse-box' }, { hash: '#c=AAAAAAAAAAAAA' }, { hash: '' }]) assert.equal(challengeLine(args(extra)), null);
});

test('reading a link never touches browser storage', () => {
  Object.defineProperty(globalThis, 'localStorage', { get: () => { throw new Error('storage touched'); }, configurable: true });
  try {
    assert.ok(challengeLine(args()));
  } finally {
    delete globalThis.localStorage;
  }
});

test('the level is named only when a game has more than one', () => {
  assert.equal(whereWords('Lob', 'lob:solo'), 'Lob');
  assert.equal(whereWords('Notch Up', 'notch-up:tower'), 'Notch Up');
  assert.equal(whereWords('Fuse Box', 'fuse-box:hard'), 'Fuse Box, hard');
});

test('the shared text names who, the score and where', () => {
  assert.equal(shareText({ initials: 'PEK' }, '1840', 'Lob', 'lob:solo'), 'PEK scored 1840 in Lob on the Notchup Arcade. Can you beat it?');
});
