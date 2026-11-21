import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, TAGGED, TESTED, around, fusesLeft, newPanel, seeded, shaped, testFuse, toggleTag } from '../games/fuse-box/rules.js';

const blownCount = (p) => p.isBlown.reduce((a, b) => a + b, 0);

test('the first test is safe, and so is everything around it', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const p = newPanel(LEVELS.easy);
    const first = 27;
    testFuse(p, first, seeded(seed));
    assert.equal(p.status === 'lost', false);
    for (const j of [first, ...around(p, first)]) assert.equal(p.isBlown[j], 0, `seed ${seed}, cell ${j}`);
    assert.equal(blownCount(p), LEVELS.easy.blown);
  }
});

test('every level places exactly its number of blown fuses', () => {
  for (const level of Object.values(LEVELS)) {
    const p = newPanel(level);
    testFuse(p, 0, seeded(3));
    assert.equal(blownCount(p), level.blown);
  }
});

test('counts are the blown neighbours, and a corner has three neighbours', () => {
  const p = newPanel(LEVELS.easy);
  testFuse(p, 0, seeded(9));
  assert.equal(around(p, 0).length, 3);
  assert.equal(around(p, 9).length, 8);
  for (let i = 0; i < p.count.length; i++) {
    assert.equal(p.count[i], around(p, i).reduce((a, j) => a + p.isBlown[j], 0));
  }
});

test('a fuse with no blown neighbours lights everything around it', () => {
  const p = newPanel(LEVELS.easy);
  testFuse(p, 27, seeded(1));
  assert.equal(p.count[27], 0, 'the first fuse never has blown neighbours');
  for (const j of around(p, 27)) assert.equal(p.cells[j], TESTED);
});

test('testing a blown fuse loses and shows where it was', () => {
  const p = newPanel(LEVELS.easy);
  testFuse(p, 27, seeded(2));
  const blown = p.isBlown.indexOf(1);
  const changed = testFuse(p, blown);
  assert.equal(p.status, 'lost');
  assert.equal(p.sparked, blown);
  assert.ok(changed.includes(blown));
  assert.deepEqual(testFuse(p, 0), [], 'nothing moves after the end');
});

test('testing every good fuse wins and tags the blown ones', () => {
  const p = newPanel(LEVELS.easy);
  testFuse(p, 27, seeded(4));
  for (let i = 0; i < p.cells.length; i++) if (!p.isBlown[i]) testFuse(p, i);
  assert.equal(p.status, 'won');
  assert.equal(fusesLeft(p), 0);
  for (let i = 0; i < p.cells.length; i++) assert.equal(p.cells[i], p.isBlown[i] ? TAGGED : TESTED);
});

test('a tagged fuse cannot be tested, and tags count down the blown left', () => {
  const p = newPanel(LEVELS.easy);
  testFuse(p, 27, seeded(5));
  const blown = p.isBlown.indexOf(1);
  assert.ok(toggleTag(p, blown));
  assert.equal(fusesLeft(p), LEVELS.easy.blown - 1);
  assert.deepEqual(testFuse(p, blown), []);
  assert.equal(p.status, 'playing');
  assert.ok(toggleTag(p, blown));
  assert.equal(fusesLeft(p), LEVELS.easy.blown);
  assert.equal(toggleTag(p, 27), false, 'a lit fuse cannot be tagged');
});

test('testing a number again with its blown fuses tagged tests the rest around it', () => {
  const rand = seeded(6);
  const p = newPanel(LEVELS.easy);
  testFuse(p, 27, rand);
  const lit = [...p.cells.keys()].find((i) => p.cells[i] === TESTED && p.count[i] > 0
    && around(p, i).some((j) => p.cells[j] !== TESTED && !p.isBlown[j]));
  assert.ok(lit !== undefined, 'the seed gives a number with untested good neighbours');
  for (const j of around(p, lit)) if (p.isBlown[j]) toggleTag(p, j);
  testFuse(p, lit);
  for (const j of around(p, lit)) if (!p.isBlown[j]) assert.equal(p.cells[j], TESTED);
});

test('on a portrait screen a wide panel turns, with the same fuses', () => {
  assert.deepEqual(shaped(LEVELS.hard, true), { cols: 10, rows: 18, blown: 40 });
  assert.equal(shaped(LEVELS.hard, false), LEVELS.hard);
  assert.equal(shaped(LEVELS.easy, true), LEVELS.easy);
});
