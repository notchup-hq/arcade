// What a demo shows after its game: a page of top scores for every level that has some, then the teaser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTail } from '../js/screens.js';
import { GAMES } from '../js/games.js';
import { LEVELS as FUSE } from '../games/fuse-box/rules.js';
import { LEVELS as PATCH } from '../games/patch-night/rules.js';
import { LEVELS as PAIR } from '../games/pair-up/rules.js';

const colours = { bg: 'b', ink: 'i', dim: 'd', gold: 'g', cyan: 'c', magenta: 'm', green: 'n', red: 'r' };

/** A canvas context that only records the text it is asked to draw. */
function recorder() {
  const texts = [];
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'fillText' ? (text) => texts.push(text) : target[key] ?? (() => {})),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  return { ctx, texts };
}
const textOf = (tail) => {
  const { ctx, texts } = recorder();
  tail.draw(ctx, 280, 175, colours);
  return texts;
};
const page = (label, ...initials) => ({ label, table: initials.map((i, k) => ({ initials: i, value: 10 - k })) });

test('the tail shows each level that has scores in turn, then the teaser, then is done', () => {
  const tail = createTail(() => [page('EASY', 'AAA'), page('HARD', 'BBB')], String);
  tail.open();
  assert.ok(textOf(tail).includes('EASY') && textOf(tail).includes('1. AAA'));
  assert.equal(tail.step(3999), false);
  assert.equal(tail.step(2), true, 'the second level appears');
  assert.ok(textOf(tail).includes('HARD') && !textOf(tail).includes('EASY'));
  tail.step(4000);
  assert.ok(textOf(tail).some((t) => /^(PRESS START|TAP TO PLAY)$/.test(t)));
  assert.equal(tail.done, false);
  tail.step(4000);
  assert.equal(tail.done, true);
});

test('with no scores anywhere the tail says so once, then shows the teaser', () => {
  const tail = createTail(() => [], String);
  tail.open();
  assert.ok(textOf(tail).includes('NO SCORES YET'));
  tail.step(4000);
  assert.ok(textOf(tail).some((t) => /START|PLAY/.test(t)));
});

test('a game with one board shows no level label', () => {
  const tail = createTail(() => [page('', 'AAA')], String);
  tail.open();
  assert.deepEqual(textOf(tail).filter((t) => t === t.toUpperCase() && !/\d/.test(t)), ['HALL OF FAME']);
});

test('opening the tail again starts from the first page', () => {
  const tail = createTail(() => [page('EASY', 'AAA')], String);
  tail.open();
  tail.step(9000);
  tail.open();
  assert.equal(tail.done, false);
  assert.ok(textOf(tail).includes('EASY'));
});

test('the teaser never flashes: its brightness changes slowly and stays visible', () => {
  const tail = createTail(() => [], String);
  tail.open();
  tail.step(4000);
  const alphas = [];
  for (let k = 0; k < 120; k++) {
    const ctx = new Proxy({}, { set: (t, key, v) => { if (key === 'globalAlpha') alphas.push(v); return true; }, get: () => () => {} });
    tail.draw(ctx, 280, 175, colours);
    tail.step(1000 / 60);
  }
  const shown = alphas.filter((a) => a < 1);
  assert.ok(Math.min(...shown) >= 0.5, 'never fades out');
  for (let k = 1; k < shown.length; k++) assert.ok(Math.abs(shown[k] - shown[k - 1]) < 0.02, 'no jump between frames');
});

test('a hall cabinet shows the boards of the levels its game has', () => {
  const levels = { 'fuse-box': FUSE, 'patch-night': PATCH, 'pair-up': PAIR };
  for (const { id, boards } of GAMES) {
    assert.ok(boards.length > 0, id);
    if (!levels[id]) continue;
    assert.deepEqual(boards.map((b) => b.id), Object.keys(levels[id]).map((l) => `${id}:${l}`), id);
    assert.ok(boards.every((b) => b.label), `${id}: a label for every level`);
  }
});
