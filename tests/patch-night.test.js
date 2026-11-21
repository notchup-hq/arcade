import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemory } from '../js/memory.js';
import {
  LEVELS, LIVES, PAUSE_MS, dirOfKey, factsOf, keyOf, makeWave, mergeWeak, multiplier, nearestDir, newGame,
  practiseList, seeded, step, worth, zap, dirOfArrows,
} from '../games/patch-night/rules.js';

const rightBug = (g) => g.wave.bugs.find((b) => b.right);
const wrongBug = (g) => g.wave.bugs.find((b) => !b.right);
/** Let the current wave finish and the next one start. */
const next = (g) => { zap(g, rightBug(g).dir); step(g, PAUSE_MS + 1); };

test('7 × 8 and 8 × 7 are one fact', () => {
  assert.equal(keyOf(7, 8), keyOf(8, 7));
  const keys = factsOf(LEVELS.medium).map((f) => f.key);
  assert.equal(new Set(keys).size, keys.length);
});

for (const [name, lanes] of [['simple', 4], ['medium', 8], ['hard', 8]]) {
  test(`${name}: ${lanes} lanes, one right answer, no answer twice`, () => {
    const rand = seeded(5);
    for (const fact of factsOf(LEVELS[name])) {
      for (const kind of name === 'hard' ? ['product', 'factor'] : ['product']) {
        const w = makeWave(LEVELS[name], fact, kind, rand);
        assert.equal(w.bugs.length, lanes);
        assert.equal(new Set(w.bugs.map((b) => b.value)).size, lanes, w.text);
        assert.equal(w.bugs.filter((b) => b.right).length, 1);
        assert.equal(w.bugs.find((b) => b.right).value, w.answer);
      }
    }
  });
}

test('simple uses only its tables and wrong answers are far from the right one', () => {
  const rand = seeded(2);
  for (const fact of factsOf(LEVELS.simple)) {
    assert.ok([1, 2, 3, 4, 5, 10].includes(fact.a) || [1, 2, 3, 4, 5, 10].includes(fact.b));
    const w = makeWave(LEVELS.simple, fact, 'product', rand);
    for (const b of w.bugs.filter((x) => !x.right)) assert.ok(Math.abs(b.value - w.answer) >= 2, w.text);
  }
});

test('medium wrong answers are the neighbours in the same tables', () => {
  const w = makeWave(LEVELS.medium, { key: '7x8', a: 7, b: 8 }, 'product', seeded(1));
  const near = new Set([48, 54, 63, 49, 64, 72, 40, 42, 70, 56]);
  for (const b of w.bugs) assert.ok(near.has(b.value), `${w.text}: ${b.value}`);
});

test('hard asks for a missing factor and the bugs carry factors', () => {
  const w = makeWave(LEVELS.hard, { key: '7x8', a: 7, b: 8 }, 'factor', seeded(3));
  assert.match(w.text, /^\d+ × \? = 56$/);
  assert.ok(w.bugs.every((b) => b.value >= 1 && b.value <= 12));
  assert.ok([7, 8].includes(w.answer));
});

test('a right zap is worth more the sooner it lands, times the streak multiplier', () => {
  assert.deepEqual([1, 2, 3, 5, 6, 9, 10, 20].map(multiplier), [1, 1, 2, 2, 3, 3, 4, 4]);
  const g = newGame('simple', seeded(1));
  assert.equal(worth(g), 200);
  rightBug(g).d = 0.5;
  assert.equal(worth(g), 150);
  const r = zap(g, rightBug(g).dir);
  assert.equal(r.type, 'right');
  assert.equal(r.points, 150);
  assert.equal(g.score, 150);
  assert.equal(worth(g), 0, 'nothing more to win once the wave is done');
  assert.equal(g.burst.dir, rightBug(g).dir);
  step(g, 900);
  assert.equal(g.burst, null, 'the sparks are gone after under a second');
});

test('a wrong zap pushes the bug back, nudges the others closer, lowers the worth and ends the streak', () => {
  const g = newGame('simple', seeded(1));
  g.streak = 4;
  g.score = 100;
  const bug = wrongBug(g);
  const other = g.wave.bugs.find((b) => b !== bug && !b.right);
  bug.d = 0.5;
  other.d = 0.5;
  rightBug(g).d = 1;
  assert.deepEqual(zap(g, bug.dir), { type: 'wrong', penalty: 25, worth: 175 });
  assert.equal(g.score, 100);
  assert.equal(g.streak, 0);
  assert.equal(g.lives, LIVES);
  step(g, 1000);
  assert.ok(bug.d > 0.5);
  assert.ok(other.d < 0.5 - g.speed * 1 + 0.001, 'moved closer than it would have crawled alone');
  assert.equal(g.wave.done, null);
});

test('wrong zaps can take the worth down to nothing but not below', () => {
  const g = newGame('simple', seeded(1));
  rightBug(g).d = 0;
  for (let k = 0; k < 8; k++) zap(g, wrongBug(g).dir);
  assert.equal(worth(g), 0);
});

test('the right bug reaching the logo puts out a light; three lights out end the run', () => {
  const g = newGame('simple', seeded(4));
  const seen = [];
  for (let k = 0; k < 3; k++) {
    for (let t = 0; t < 60000 && !g.wave.done; t += 100) seen.push(...step(g, 100).map((e) => e.type));
    step(g, PAUSE_MS + 1);
  }
  assert.equal(g.lives, 0);
  assert.equal(g.status, 'over');
  assert.deepEqual(seen.filter((t) => t === 'light').length, 3);
  assert.ok(seen.includes('over'));
});

test('a wrong bug reaching the logo just fades', () => {
  const g = newGame('simple', seeded(4));
  const bug = wrongBug(g);
  bug.d = 0.001;
  step(g, 100);
  assert.ok(bug.fade >= 0);
  assert.equal(g.lives, LIVES);
});

test('speed rises with right answers, up to a cap, and falls after a miss', () => {
  const g = newGame('simple', seeded(6));
  const start = g.speed;
  for (let k = 0; k < 100; k++) next(g);
  assert.equal(g.speed, LEVELS.simple.speed.cap);
  g.speed = start + 0.02;
  rightBug(g).d = 0.001;
  step(g, 100);
  assert.ok(g.speed < start + 0.02);
});

test('a missed fact comes back two to four questions later, and again until answered right twice', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const g = newGame('medium', seeded(seed));
    const missed = g.wave.fact.key;
    zap(g, wrongBug(g).dir);
    next(g); // answered right, but the wave was missed: it does not count
    const asked = [missed];
    for (let k = 0; k < 40 && !asked.slice(1).includes(missed); k++) { asked.push(g.wave.fact.key); next(g); }
    const first = asked.indexOf(missed, 1);
    assert.ok(first >= 2 && first <= 4, `seed ${seed}: came back at question ${first}`);
    // answered right once: asked once more, then done
    assert.equal(g.queue.find((e) => e.key === missed).need, 1);
    let again = 0;
    for (let k = 0; k < 30 && g.queue.some((e) => e.key === missed); k++) {
      if (g.wave.fact.key === missed) again += 1;
      next(g);
    }
    assert.equal(again, 1, `seed ${seed}`);
    assert.ok(!g.queue.some((e) => e.key === missed));
  }
});

test('the game over list shows the facts missed this run', () => {
  const g = newGame('simple', seeded(2));
  const fact = g.wave.fact;
  zap(g, wrongBug(g).dir);
  zap(g, wrongBug(g).dir);
  assert.deepEqual(practiseList(g), [`${fact.a} × ${fact.b} = ${fact.a * fact.b}`]);
});

test('remembered weak facts come back early and are forgotten once answered right', () => {
  const g = newGame('medium', seeded(9), ['7x8', '3x4', 'bad', '99x99']);
  const seen = [];
  for (let k = 0; k < 8; k++) { seen.push(g.wave.fact.key); next(g); }
  assert.ok(seen.includes('7x8') && seen.includes('3x4'), seen.join());
  assert.deepEqual(mergeWeak(['7x8', '3x4', '11x12'], g), ['11x12']);
});

test('the weak list keeps what is still pending, then older ones, at most 20', () => {
  const g = newGame('hard', seeded(3));
  zap(g, wrongBug(g).dir);
  const old = Array.from({ length: 25 }, (_, i) => `1x${i + 1}`);
  const list = mergeWeak(old, g);
  assert.equal(list.length, 20);
  assert.equal(list[0], g.wave.fact.key);
});

test('keys and taps find their lane, and a level has only its own lanes', () => {
  assert.equal(dirOfKey('ArrowUp', LEVELS.simple.dirs), 0);
  assert.equal(dirOfKey('Numpad9', LEVELS.medium.dirs), 1);
  assert.equal(dirOfKey('KeyE', LEVELS.simple.dirs), -1);
  assert.equal(dirOfKey('KeyA', LEVELS.hard.dirs), -1);
  assert.equal(nearestDir(10, LEVELS.medium.dirs), 0);
  assert.equal(nearestDir(60, LEVELS.simple.dirs), 2);
  assert.equal(nearestDir(350, LEVELS.simple.dirs), 0);
});

test('the same seed plays the same run', () => {
  const run = () => { const g = newGame('hard', seeded(8)); return g.wave.bugs.map((b) => `${b.dir}:${b.value}`).join(); };
  assert.equal(run(), run());
});

test('held arrow keys aim at a lane, two at right angles at the corner between them', () => {
  const all = LEVELS.medium.dirs;
  assert.equal(dirOfArrows(['ArrowUp'], all), 0);
  assert.equal(dirOfArrows(['ArrowUp', 'ArrowRight'], all), 1);
  assert.equal(dirOfArrows(['ArrowDown', 'ArrowRight'], all), 3);
  assert.equal(dirOfArrows(['ArrowDown', 'ArrowLeft'], all), 5);
  assert.equal(dirOfArrows(['ArrowUp', 'ArrowLeft'], all), 7);
  assert.equal(dirOfArrows(['ArrowUp', 'ArrowDown'], all), -1);
  assert.equal(dirOfArrows(['ArrowUp', 'ArrowRight'], LEVELS.simple.dirs), -1);
  assert.equal(dirOfArrows([], all), -1);
});
