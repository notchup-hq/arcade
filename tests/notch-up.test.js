import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIT_MS, PERFECT, PRAISE, QUIPS, START_WIDTH, STILL_STEP, WORLD, built, drop, milestoneAt, moverX, moving, newGame,
  recordAt, seeded, step, swingOf,
} from '../games/notch-up/rules.js';
import { pickLine } from '../js/random.js';

/** Put the sliding floor `off` units right of the floor below (left when negative). */
const place = (g, off) => { g.mover.x = g.floors.at(-1).x + off; };
const stack = (g, n) => { for (let k = 0; k < n; k++) { place(g, 0); drop(g); } };

test('a drop within PERFECT snaps onto the floor below and keeps the width', () => {
  const g = newGame(seeded(1));
  place(g, PERFECT);
  assert.equal(drop(g).type, 'perfect');
  assert.deepEqual(g.floors.at(-1), { x: 0, w: START_WIDTH });
  assert.equal(g.perfect, 1);
});

test('an overhang is cut off: the floor keeps the overlap and the piece fades where it hung', () => {
  const g = newGame(seeded(1));
  place(g, 20);
  const result = drop(g);
  assert.equal(result.type, 'cut');
  assert.deepEqual(g.floors.at(-1), { x: 10, w: START_WIDTH - 20 });
  assert.deepEqual({ x: g.cut.x, w: g.cut.w }, { x: START_WIDTH / 2 + 10, w: 20 });
  assert.equal(g.perfect, 0);
});

test('from the third perfect in a row each perfect wins width back, up to the start width', () => {
  const g = newGame(seeded(1));
  place(g, 30);
  drop(g);
  const narrow = START_WIDTH - 30;
  stack(g, 2);
  assert.equal(g.floors.at(-1).w, narrow);
  stack(g, 1);
  assert.equal(g.floors.at(-1).w, narrow + 8);
  stack(g, 10);
  assert.equal(g.floors.at(-1).w, START_WIDTH);
});

test('a milestone floor is built wider, which helps the floors after it', () => {
  const narrow = newGame(seeded(1));
  place(narrow, 30);
  drop(narrow);                                  // 60 wide
  for (let k = 0; k < 8; k++) { place(narrow, 5); drop(narrow); } // 20 wide
  const before = narrow.floors.at(-1).w;
  place(narrow, 0);
  const result = drop(narrow);
  assert.equal(result.floors, 10);
  assert.equal(result.widened, true);
  assert.equal(narrow.floors.at(-1).w, before + 20);
  assert.equal(narrow.mover.w, before + 20);
});

test('a widened floor stays inside the picture', () => {
  const g = newGame(seeded(1));
  for (let k = 0; k < 9; k++) { place(g, 8); drop(g); }
  const top = g.floors.at(-1);
  place(g, 0);
  drop(g);
  const f = g.floors.at(-1);
  assert.ok(f.w > top.w);
  assert.ok(Math.abs(f.x) + f.w / 2 <= WORLD / 2 + 1e-9);
});

test('a floor that misses the tower ends the run and builds nothing', () => {
  const g = newGame(seeded(1));
  stack(g, 4);
  place(g, START_WIDTH);
  assert.deepEqual(drop(g), { type: 'over', floors: 4 });
  assert.equal(g.status, 'over');
  assert.equal(built(g), 4);
  assert.equal(drop(g), null);
});

test('the sliding floor never leaves the world', () => {
  const g = newGame(seeded(4));
  for (let k = 0; k < 2000; k++) {
    step(g, 16);
    const { x, w } = g.mover;
    assert.ok(Math.abs(x) + w / 2 <= WORLD / 2 + 1e-9, `${x} ± ${w / 2}`);
  }
  assert.equal(swingOf(START_WIDTH), WORLD / 2 - START_WIDTH / 2);
});

test('it slides back and forth, faster the higher it gets, up to a cap', () => {
  const g = newGame(seeded(2));
  const first = g.mover.speed;
  stack(g, 5);
  assert.ok(g.mover.speed > first);
  stack(g, 200);
  const capped = g.mover.speed;
  stack(g, 10);
  assert.equal(g.mover.speed, capped);
});

test('each floor starts from the side opposite the one before', () => {
  const g = newGame(seeded(3));
  const sides = [];
  for (let k = 0; k < 4; k++) { sides.push(Math.sign(g.mover.x)); stack(g, 1); }
  assert.deepEqual(sides, [sides[0], -sides[0], sides[0], -sides[0]]);
});

test('with reduced motion the floor is judged where it is drawn, in steps no bigger than PERFECT', () => {
  assert.ok(STILL_STEP <= PERFECT);
  const g = newGame(seeded(1));
  g.mover.x = 4.4;
  assert.equal(moverX(g, true), 3);
  assert.equal(drop(g, true).type, 'perfect');
});

test('cheers at 10, 50 and 100 floors, then every hundredth', () => {
  assert.deepEqual([1, 9, 10, 20, 50, 99, 100, 150, 200, 300].map(milestoneAt), [null, null, 'small', null, 'medium', null, 'large', null, 'large', 'large']);
});

test('beating a best of 10 or more cheers once, on the first floor past it', () => {
  assert.equal(recordAt(13, 12), true);
  assert.equal(recordAt(14, 12), false);
  assert.equal(recordAt(10, 9), false);
});

test('a record wins over a round number on the same floor', () => {
  const g = newGame(seeded(5), 49);
  stack(g, 50);
  assert.equal(g.cheer.size, 'record');
  assert.equal(g.cheer.count, 'Beat your best of 49');
  assert.ok(PRAISE.record.includes(g.cheer.praise));
});

test('the tenth floor cheers with a few bursts of sparks, and the cheer fades away', () => {
  const g = newGame(seeded(5));
  stack(g, 9);
  assert.equal(g.cheer, null);
  stack(g, 1);
  assert.equal(g.cheer.count, '10 floors');
  assert.equal(g.cheer.bursts.length, 3);
  for (let k = 0; k < 400 && g.cheer; k++) step(g, 16);
  assert.equal(g.cheer, null);
});

test('a cheer never repeats the line before it', () => {
  const rand = seeded(9);
  let last = '';
  for (let k = 0; k < 50; k++) {
    const p = pickLine(PRAISE.small, rand, last);
    assert.notEqual(p, last);
    last = p;
  }
});

test('every cheer has a dry line short enough for a phone', () => {
  for (const [size, lines] of Object.entries(QUIPS)) {
    assert.ok(lines.length >= 4, size);
    for (const line of lines) assert.ok(line.length <= 26, line);
  }
  const g = newGame(seeded(5));
  stack(g, 10);
  assert.ok(QUIPS.small.includes(g.cheer.quip));
});

test('a seed replays the same run', () => {
  const run = (seed) => {
    const g = newGame(seeded(seed));
    for (let k = 0; k < 30; k++) { step(g, 16 * (k % 7 + 3)); drop(g); }
    return JSON.stringify({ floors: g.floors, status: g.status });
  };
  assert.equal(run(8), run(8));
});

test('a finished run keeps drawing until its last piece has faded', () => {
  const g = newGame(seeded(1));
  place(g, START_WIDTH);
  drop(g);
  assert.equal(moving(g), true);
  step(g, 1000);
  assert.equal(moving(g), false);
});

test('the floor just built has its windows lit for a moment', () => {
  const g = newGame(seeded(1));
  stack(g, 1);
  assert.deepEqual(g.lit, { floor: 1, age: 0 });
  step(g, LIT_MS);
  assert.equal(g.lit, null);
});
