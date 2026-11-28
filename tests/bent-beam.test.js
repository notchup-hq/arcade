import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BACK, EMPTY, LEVELS, SLASH, WALL, BRONZE, CHEERS, GOLD, MEDALS, SILVER, burnBulb, fixedBoard, isLit, lampsLeft, newBoard, newRun, nextAnswer, praiseFor, seeded, shortsCrossed, trace, turnMirror, undoTurn,
} from '../games/bent-beam/rules.js';

const SEEDS = Array.from({ length: 60 }, (_, k) => k + 1);
const boards = (level) => SEEDS.map((s) => newBoard(LEVELS[level], seeded(s)));
/** The fewest turns that win the board, by trying every way of turning 0, 1, 2... of its mirrors. */
const fewestTurns = (g) => {
  const turning = [...g.cells.keys()].filter((i) => (g.cells[i] === SLASH || g.cells[i] === BACK) && !g.fixed[i]);
  for (let n = 0; n <= turning.length; n++) {
    const tryFrom = (h, from, left) => {
      if (lampsLeft(h) === 0 && shortsCrossed(h) === 0) return true;
      if (!left) return false;
      for (let k = from; k < turning.length; k++) {
        const c = Uint8Array.from(h.cells);
        c[turning[k]] = c[turning[k]] === SLASH ? BACK : SLASH;
        if (tryFrom({ ...h, cells: c, beam: trace({ ...h, cells: c }) }, k + 1, left - 1)) return true;
      }
      return false;
    };
    if (tryFrom(g, 0, n)) return n;
  }
  return Infinity;
};
const isMirror = (kind) => kind === SLASH || kind === BACK;

/** A board of our own: `rows` are strings of "." (empty), "#" (wall), "/" and "\". */
const drawn = (rows, row, lamps = [], fixed = [], shorts = []) => {
  const size = rows.length;
  const kinds = { '.': EMPTY, '#': WALL, '/': SLASH, '\\': BACK };
  const cells = Uint8Array.from(rows.join('').split('').map((c) => kinds[c]));
  const bolted = new Uint8Array(size * size);
  fixed.forEach((i) => { bolted[i] = 1; });
  const g = { size, row, cells, fixed: bolted, lamps, shorts, taps: 0, history: [], status: 'ready' };
  g.beam = trace(g);
  return g;
};

test('a beam from the housing goes straight on until it leaves the board', () => {
  const { runs, crossed } = trace(drawn(['...', '...', '...'], 1));
  assert.deepEqual(runs, [[-0.5, 1.5, 3.5, 1.5]]);
  assert.deepEqual([...crossed], [3, 4, 5]);
});

test('a backslash turns a beam going right down, and a slash turns it up', () => {
  assert.deepEqual(trace(drawn(['...', '.\\.', '...'], 1)).runs, [[-0.5, 1.5, 1.5, 1.5], [1.5, 1.5, 1.5, 3.5]]);
  assert.deepEqual(trace(drawn(['...', './.', '...'], 1)).runs, [[-0.5, 1.5, 1.5, 1.5], [1.5, 1.5, 1.5, -0.5]]);
});

test('a mirror hit from its other side bends the beam the other way', () => {
  // Right, down off the backslash, then a beam going down meets a slash and leaves to the left.
  const { runs } = trace(drawn(['...', '.\\.', './.'], 1));
  assert.deepEqual(runs.at(-1), [1.5, 2.5, -0.5, 2.5]);
});

test('a wall stops the beam at its near face', () => {
  const { runs, crossed } = trace(drawn(['...', '.#.', '...'], 1));
  assert.deepEqual(runs, [[-0.5, 1.5, 1, 1.5]]);
  assert.equal(crossed.has(4), false);
});

test('a lamp lights where the beam crosses it, and the beam goes on through it', () => {
  const g = drawn(['...', '...', '...'], 1, [4]);
  assert.equal(isLit(g, 4), true);
  assert.equal(lampsLeft(g), 0);
  assert.equal(g.beam.runs[0][2], 3.5);
});

test('turning a mirror swings the beam, and lighting the last lamp wins', () => {
  const g = drawn(['...', '.\\.', '...'], 1, [1]);
  assert.equal(lampsLeft(g), 1);
  assert.equal(turnMirror(g, 4), 'won');
  assert.equal(g.status, 'won');
  assert.equal(g.taps, 1);
});

test('a bolted mirror does not turn, and nothing but a mirror does', () => {
  const g = drawn(['...', '.\\.', '..#'], 1, [1], [4]);
  assert.equal(turnMirror(g, 4), 'fixed');
  assert.equal(turnMirror(g, 0), 'ignored');
  assert.equal(turnMirror(g, 8), 'ignored');
  assert.equal(g.taps, 0);
  assert.equal(g.status, 'ready');
});

test('a fixed board takes no more turns', () => {
  const g = drawn(['...', '.\\.', '...'], 1, [1]);
  turnMirror(g, 4);
  assert.equal(turnMirror(g, 4), 'ignored');
  assert.equal(g.taps, 1);
});

for (const level of Object.keys(LEVELS)) {
  const want = LEVELS[level];

  test(`${level} boards are made to the level, start unsolved and replay from their seed`, () => {
    for (const g of boards(level)) {
      assert.equal(g.size, want.size);
      assert.equal(g.lamps.length, want.lamps);
      assert.equal(g.shorts.length, want.shorts);
      assert.ok(g.shorts.every((i) => g.cells[i] === EMPTY && !g.lamps.includes(i)));
      assert.equal(g.cells.filter(isMirror).length, want.mirrors);
      assert.equal(g.cells.filter((k) => k === WALL).length, want.walls);
      assert.equal(g.fixed.reduce((n, f) => n + f, 0), want.fixed);
      assert.ok(g.lamps.every((i) => g.cells[i] === EMPTY));
      assert.ok(g.cells[g.row * g.size] !== WALL);
      assert.ok(lampsLeft(g) > 0);
      assert.ok(fewestTurns(g) >= want.turns);
      assert.equal(g.status, 'ready');
    }
    assert.deepEqual(newBoard(want, seeded(9)).cells, newBoard(want, seeded(9)).cells);
  });

  test(`${level} boards have an answer that bends the beam at least ${want.bends} times`, () => {
    for (const g of boards(level)) {
      const answer = trace({ size: g.size, row: g.row, cells: g.answer });
      assert.ok(answer.hit.size >= want.bends);
      assert.ok(g.lamps.every((i) => answer.crossed.has(i)));
      assert.ok(g.shorts.every((i) => !answer.crossed.has(i)));
    }
  });

  test(`${level} boards are solved by turning the mirrors the answer differs on`, () => {
    for (const g of boards(level)) {
      let result;
      for (let i = nextAnswer(g); i >= 0 && g.status !== 'won'; i = nextAnswer(g)) result = turnMirror(g, i);
      assert.equal(result, 'won');
      assert.equal(lampsLeft(g), 0);
    }
  });
}

test('boards are found for hundreds of seeds of every level', () => {
  for (const level of Object.values(LEVELS)) {
    for (let seed = 1; seed <= 500; seed++) assert.ok(newBoard(level, seeded(seed)));
  }
});

test('undo turns the last mirror back, counts as a turn, and does nothing before a turn or after a win', () => {
  const g = drawn(['...', '.\\.', './.'], 1, [7]);
  assert.equal(undoTurn(g), -1);
  turnMirror(g, 4);
  const turnedCells = [...g.cells];
  assert.equal(undoTurn(g), 4);
  assert.notDeepEqual([...g.cells], turnedCells);
  assert.equal(g.taps, 2);
  const h = drawn(['...', '.\\.', '...'], 1, [1]);
  turnMirror(h, 4);
  assert.equal(undoTurn(h), -1);
});

test('lighting every lamp does not win while the beam crosses a short circuit', () => {
  const g = drawn(['/..', '...', '...'], 1, [4], [], [5]); // the beam lights the lamp and crosses the short beyond it
  assert.equal(lampsLeft(g), 0);
  assert.equal(shortsCrossed(g), 1);
  assert.equal(turnMirror(g, 0), 'turn');
  assert.equal(g.status, 'playing');
});

test('the beam clear of every short circuit with every lamp lit wins', () => {
  const g = drawn(['...', '.\\.', '...'], 1, [1], [], [7]); // beam goes down over the short; turn it up to the lamp
  assert.equal(shortsCrossed(g), 1);
  assert.equal(turnMirror(g, 4), 'won');
});

test('a run burns a bulb for each short circuit and lights one back for each board, never past the start', () => {
  const run = newRun(LEVELS.easy);
  assert.equal(run.bulbs, LEVELS.easy.bulbs);
  fixedBoard(run);
  assert.deepEqual([run.bulbs, run.fixed], [LEVELS.easy.bulbs, 1]);
  assert.equal(burnBulb(run), false);
  assert.equal(run.bulbs, LEVELS.easy.bulbs - 1);
  fixedBoard(run);
  assert.equal(run.bulbs, LEVELS.easy.bulbs);
  for (let k = 1; k < LEVELS.easy.bulbs; k++) assert.equal(burnBulb(run), false);
  assert.equal(burnBulb(run), true);
  assert.equal(burnBulb(run), true);
  assert.equal(run.bulbs, 0);
});

test('par is the fewest turns that win the board', () => {
  for (const g of boards('medium').slice(0, 20)) assert.equal(g.par, fewestTurns(g));
});

test('a win is cheered gold, silver or bronze by the turns over the fewest, and plainly after that', () => {
  const lines = (over) => praiseFor({ par: 3, taps: 3 + over });
  assert.deepEqual([lines(0), lines(1), lines(2), lines(3), lines(9)], [GOLD, SILVER, BRONZE, CHEERS, CHEERS]);
});

test('each medal tier has an emoji for the card title', () => {
  assert.equal(MEDALS.length, 3);
  assert.ok(MEDALS.every((m) => m.length > 0));
});
