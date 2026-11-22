import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS, LETTERS, PAIR_POINTS, PRAISE, QUIPS, SPARE_TOTAL, SPRITES, STREAK_POINTS,
  facesFor, flip, nameOf, newGame, nextRound, pickLine, seeded, settle, shape,
} from '../games/pair-up/rules.js';

/** The positions of the two cards with face `face`. */
const twins = (g, face) => g.cards.flatMap((c, i) => (c.face === face ? [i] : []));
/** Find the pair of the first card, in the order the deck was dealt. */
const pairAt = (g, k) => twins(g, [...new Set(g.cards.map((c) => c.face))][k]);

test('every level deals each face twice, from the sprites and letters, with the level\'s share of sprites', () => {
  for (const [level, { pairs, sprites }] of Object.entries(LEVELS)) {
    const g = newGame(level, seeded(7));
    assert.equal(g.cards.length, pairs * 2);
    const faces = [...new Set(g.cards.map((c) => c.face))];
    assert.equal(faces.length, pairs);
    for (const f of faces) assert.equal(twins(g, f).length, 2);
    assert.equal(faces.filter((f) => SPRITES.includes(f)).length, sprites);
    assert.ok(faces.filter((f) => !SPRITES.includes(f)).every((f) => LETTERS.includes(f)));
  }
});

test('the deal is seeded: the same seed deals the same deck, another seed another', () => {
  const deal = (seed) => newGame('hard', seeded(seed)).cards.map((c) => c.face).join();
  assert.equal(deal(3), deal(3));
  assert.notEqual(deal(3), deal(4));
  assert.deepEqual(facesFor('easy', seeded(1)), facesFor('easy', seeded(1)));
});

test('the deck is tall on a portrait screen and wide on a landscape one, with every card placed', () => {
  for (const level of Object.keys(LEVELS)) {
    const [tc, tr] = shape(level, true);
    const [wc, wr] = shape(level, false);
    assert.equal(tc * tr, LEVELS[level].pairs * 2);
    assert.equal(wc * wr, LEVELS[level].pairs * 2);
    assert.ok(tr >= tc && wc >= wr);
  }
});

test('a pair stays up and scores', () => {
  const g = newGame('easy', seeded(1));
  const [a, b] = pairAt(g, 0);
  assert.equal(flip(g, a).type, 'first');
  assert.equal(flip(g, b).type, 'match');
  assert.deepEqual([g.cards[a].state, g.cards[b].state], ['matched', 'matched']);
  assert.equal(g.found, 1);
  assert.equal(g.score, PAIR_POINTS);
  assert.equal(g.chances, LEVELS.easy.chances);
  assert.deepEqual(g.open, []);
});

test('pairs found one after another score more each time, and a wrong pair ends the streak', () => {
  const g = newGame('hard', seeded(2));
  for (const k of [0, 1, 2]) for (const i of pairAt(g, k)) flip(g, i);
  assert.equal(g.score, 3 * PAIR_POINTS + 3 * STREAK_POINTS);
  flip(g, pairAt(g, 3)[0]);
  flip(g, pairAt(g, 4)[0]);
  assert.equal(g.streak, 0);
  const before = g.score;
  for (const i of pairAt(g, 3)) flip(g, i);
  assert.equal(g.score - before, PAIR_POINTS);
});

test('a wrong pair costs a chance and stays up until the next card turns it back down', () => {
  const g = newGame('easy', seeded(1));
  const [x, y] = [pairAt(g, 0)[0], pairAt(g, 1)[0]];
  flip(g, x);
  assert.equal(flip(g, y).type, 'miss');
  assert.equal(g.chances, LEVELS.easy.chances - 1);
  assert.deepEqual(g.open, [x, y]);
  assert.equal(g.cards[x].state, 'up');
  const z = pairAt(g, 2)[0];
  assert.equal(flip(g, z).type, 'first');
  assert.deepEqual([g.cards[x].state, g.cards[y].state], ['down', 'down']);
  assert.deepEqual(g.open, [z]);
});

test('a card of the wrong pair still showing can be turned again at once', () => {
  const g = newGame('easy', seeded(1));
  const [x, y] = [pairAt(g, 0)[0], pairAt(g, 1)[0]];
  flip(g, x);
  flip(g, y);
  assert.equal(flip(g, x).type, 'first');
  assert.deepEqual(g.open, [x]);
  assert.equal(g.cards[y].state, 'down');
});

test('settle turns a wrong pair back down by itself', () => {
  const g = newGame('easy', seeded(1));
  flip(g, pairAt(g, 0)[0]);
  flip(g, pairAt(g, 1)[0]);
  settle(g);
  assert.deepEqual(g.open, []);
  assert.ok(g.cards.every((c) => c.state === 'down'));
});

test('a card already up, or a found one, does nothing', () => {
  const g = newGame('easy', seeded(1));
  const [a, b] = pairAt(g, 0);
  flip(g, a);
  assert.equal(flip(g, a).type, 'ignored');
  flip(g, b);
  assert.equal(flip(g, a).type, 'ignored');
  assert.equal(flip(g, 99).type, 'ignored');
});

test('running out of chances ends the run, and nothing turns after that', () => {
  const g = newGame('easy', seeded(1));
  const [p, q] = [0, 1].map((k) => pairAt(g, k));
  const types = Array.from({ length: LEVELS.easy.chances }, () => (flip(g, p[0]), flip(g, q[0]).type));
  assert.deepEqual(types, ['miss', 'miss', 'miss', 'lost']);
  assert.equal(g.status, 'lost');
  assert.equal(g.chances, 0);
  assert.equal(flip(g, p[1]).type, 'ignored');
  assert.equal(nextRound(g), undefined);
  assert.equal(g.round, 1);
});

test('every level has its own number of chances, more with more pairs', () => {
  assert.deepEqual(Object.values(LEVELS).map((l) => l.chances), [4, 5, 6]);
  for (const level of Object.keys(LEVELS)) assert.equal(newGame(level, seeded(1)).chances, LEVELS[level].chances);
});

test('every pair found lights one chance back, never above the level\'s number', () => {
  const g = newGame('hard', seeded(2));
  for (let m = 0; m < 2; m++) { flip(g, pairAt(g, 0)[0]); flip(g, pairAt(g, 1)[0]); }
  assert.equal(g.chances, 4);
  for (const i of pairAt(g, 2)) flip(g, i);
  assert.equal(g.chances, 5);
  for (const i of pairAt(g, 0)) flip(g, i);
  assert.equal(g.chances, 6);
  for (const i of pairAt(g, 1)) flip(g, i);
  assert.equal(g.chances, 6);
});

/** Find every pair of the round, returning the chances there were before the last one. */
function clearRound(g) {
  let before;
  for (let k = 0; k < g.pairs; k++) for (const i of pairAt(g, k)) { before = g.chances; flip(g, i); }
  return before;
}

test('every pair found clears the round; the bonus is the same total on every level and the cheer fits the misses', () => {
  for (const level of Object.keys(LEVELS)) {
    for (const [misses, size] of [[0, 'flawless'], [1, 'sharp'], [3, 'close']]) {
      const g = newGame(level, seeded(5));
      for (let m = 0; m < misses; m++) { flip(g, pairAt(g, 0)[0]); flip(g, pairAt(g, 1)[0]); }
      settle(g);
      const before = clearRound(g);
      assert.equal(g.status, 'cleared', `${level} ${misses}`);
      const streak = Array.from({ length: g.pairs }, (_, k) => PAIR_POINTS + k * STREAK_POINTS).reduce((a, b) => a + b);
      assert.equal(g.score, streak + Math.round((SPARE_TOTAL * before) / g.maxChances), `${level} ${misses}`);
      assert.ok(PRAISE[size].includes(g.cheer.praise) && QUIPS[size].includes(g.cheer.quip), `${level} ${misses}`);
      assert.equal(g.chances, Math.min(g.maxChances, before + 1));
    }
  }
});

test('nothing turns between a cleared round and the next one', () => {
  const g = newGame('easy', seeded(5));
  clearRound(g);
  assert.equal(flip(g, 0).type, 'ignored');
});

test('the next round deals a fresh deck and the run goes on with its score, chances and pair count', () => {
  const g = newGame('medium', seeded(5));
  flip(g, pairAt(g, 0)[0]); flip(g, pairAt(g, 1)[0]);
  const old = g.cards.map((c) => c.face).join();
  clearRound(g);
  const { score, chances } = g;
  nextRound(g);
  assert.equal(g.round, 2);
  assert.equal(g.status, 'playing');
  assert.deepEqual([g.found, g.total, g.misses, g.streak, g.open.length], [0, g.pairs, 0, 0, 0]);
  assert.equal(g.score, score);
  assert.equal(g.chances, chances);
  assert.equal(g.cheer, null);
  assert.ok(g.cards.every((c) => c.state === 'down'));
  assert.notEqual(g.cards.map((c) => c.face).join(), old);
  assert.equal(flip(g, 0).type, 'first');
});

test('rounds follow one another until the chances run out, with the pairs of every round counted', () => {
  const g = newGame('easy', seeded(8));
  for (let r = 1; r <= 3; r++) { clearRound(g); nextRound(g); }
  assert.equal(g.round, 4);
  assert.equal(g.total, 3 * g.pairs);
  const [p, q] = [0, 1].map((k) => pairAt(g, k));
  for (let m = g.chances; m > 0; m--) { flip(g, p[0]); flip(g, q[0]); }
  assert.equal(g.status, 'lost');
});

test('a cheer line never repeats the one before it', () => {
  const rand = seeded(9);
  let last = '';
  for (let k = 0; k < 50; k++) {
    const line = pickLine(PRAISE.sharp, rand, last);
    assert.notEqual(line, last);
    last = line;
  }
});

test('every face has a name a screen reader can say', () => {
  assert.equal(nameOf('logo'), 'Notchup logo');
  assert.equal(nameOf('K'), 'letter K');
  for (const s of SPRITES) assert.ok(!nameOf(s).startsWith('letter'));
});
