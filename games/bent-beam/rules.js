// Bent Beam's rules, with no DOM: the game page and the hall's attract mode both play by them.
//
// A board is a square grid with a lamp housing on the left edge that fires a beam to the right. Walls
// stop the beam, mirrors bend it, and a lamp lights when the beam passes through it. Most mirrors turn
// when tapped, between "/" and "\"; some are bolted down. Light every lamp to fix the board.
//
// A board is made backwards, so it always has an answer: mirrors and walls go down, the beam is traced,
// the lamps are put on cells it crosses after the first bend, and then the mirrors are turned away from
// the answer. Everything takes a seeded `rand`, so tests and the demo replay.

import { seeded } from '../../js/random.js';

export { seeded };

// bends: the least mirrors the answer's beam must hit, so a board is never a lamp straight ahead;
// turns: the fewest turns that win, over every answer, so no board is won by a tap;
// shorts: short-circuit cells the beam must keep clear of (the answer never crosses them);
// slack: the turns a board allows above its fewest (`par`), so less room to guess on a harder level;
// bulbs: the run's lives, one burnt out each time a turn sends the beam into a short circuit
// or a board's turns run out.
export const LEVELS = {
  easy: { size: 5, mirrors: 7, fixed: 0, walls: 2, lamps: 2, shorts: 2, bends: 4, turns: 3, bulbs: 4, slack: 4 },
  medium: { size: 6, mirrors: 11, fixed: 2, walls: 3, lamps: 3, shorts: 3, bends: 6, turns: 4, bulbs: 4, slack: 2 },
  hard: { size: 7, mirrors: 15, fixed: 3, walls: 5, lamps: 4, shorts: 6, bends: 7, turns: 4, bulbs: 3, slack: 1 },
};

// A dry line on the win card; one is picked at random.
export const CHEERS = ['The beam found its way.', 'Mirrors in order, lamps on.', 'Nobody was dazzled.', 'That one bent nicely.'];
// Gold, silver and bronze by the turns over the board's fewest (`par`): none, one, two. A slower win gets a plain CHEERS line.
export const GOLD = ['Gold: the fewest turns possible.', 'Gold: not a turn wasted.', 'Gold: straight to the answer.'];
export const SILVER = ['Silver: one turn over the fewest.', 'Silver: just one turn from perfect.', 'Silver: close to perfect, and it shows.'];
export const BRONZE = ['Bronze: two turns over the fewest.', 'Bronze: two extra turns, still a clean fix.', 'Bronze: a little detour, a good finish.'];

// A dry line when a bulb burns out, one is picked at random: from a short circuit, or from running out of turns.
export const SHORT_LINES = ['Zzzt! That bulb gave its all.', 'Short circuit. The bulb took it personally.', 'Pop. One bulb fewer.', 'The beam met a short. The bulb did not enjoy it.'];
export const SPENT_LINES = ['Out of turns. A bulb called it a night.', 'Too many turns. A bulb retired early.', 'No turns left. A bulb dimmed itself.', 'Time is up. A bulb has seen enough.'];

/** The medal for each tier, shown on the win card's title line. */
export const MEDALS = ['🥇', '🥈', '🥉'];

/** The lines to cheer a board `g` won in `g.taps` turns from. */
export function praiseFor(g) {
  return [GOLD, SILVER, BRONZE][g.taps - g.par] ?? CHEERS;
}

export const EMPTY = 0;
export const WALL = 1;
export const SLASH = 2; // "/": a beam going right turns up
export const BACK = 3;  // "\": a beam going right turns down

// Directions turn clockwise: up, right, down, left.
export const UP = 0;
export const RIGHT = 1;
export const DOWN = 2;
export const LEFT = 3;
const STEP = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const BOUNCE = {
  [SLASH]: [RIGHT, UP, LEFT, DOWN], // by the direction the beam arrives in
  [BACK]: [LEFT, DOWN, RIGHT, UP],
};
const ATTEMPTS = 3000;  // boards tried before giving up; a hard board takes a few hundred at worst
const SCRAMBLES = 50;

const isMirror = (kind) => kind === SLASH || kind === BACK;
const turned = (kind) => (kind === SLASH ? BACK : SLASH);

/**
 * Where the beam goes on `board` ({ size, cells, row }). Returns the straight runs it makes as
 * [x0, y0, x1, y1] in cell units (a cell's middle is at +0.5; the start is the left edge, x = 0 minus
 * its housing), the cells it crosses as a Set of indices, and the mirrors it hits.
 */
export function trace({ size, cells, row }) {
  const runs = [];
  const crossed = new Set();
  const hit = new Set();
  let x = -1;
  let y = row;
  let dir = RIGHT;
  let from = [x + 0.5, y + 0.5];
  for (let steps = 0; steps < 4 * size * size; steps++) {
    x += STEP[dir][0];
    y += STEP[dir][1];
    if (x < 0 || y < 0 || x >= size || y >= size) {
      runs.push([...from, x + 0.5, y + 0.5]);
      break;
    }
    const i = y * size + x;
    const kind = cells[i];
    if (kind === WALL) {
      runs.push([...from, x + 0.5 - STEP[dir][0] * 0.5, y + 0.5 - STEP[dir][1] * 0.5]);
      break;
    }
    crossed.add(i);
    if (isMirror(kind)) {
      hit.add(i);
      runs.push([...from, x + 0.5, y + 0.5]);
      from = [x + 0.5, y + 0.5];
      dir = BOUNCE[kind][dir];
    }
  }
  return { runs, crossed, hit };
}

const litLamps = (g, crossed) => g.lamps.filter((i) => crossed.has(i)).length;
const shortsHit = (g, crossed) => g.shorts.filter((i) => crossed.has(i)).length;
/** Won: every lamp lit and the beam clear of every short circuit. */
const wins = (g, crossed) => litLamps(g, crossed) === g.lamps.length && shortsHit(g, crossed) === 0;

/** A made board: `cells`, `fixed` (mirrors that do not turn), `lamps`, the housing's `row`, and the answer. */
function build(level, rand) {
  const { size, mirrors, fixed, walls, lamps, shorts, bends } = level;
  const pick = (n, from) => {
    const pool = [...from];
    const out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    return out;
  };
  const row = Math.floor(rand() * size);
  const spots = Array.from({ length: size * size }, (_, i) => i).filter((i) => i !== row * size);
  const layout = pick(walls + mirrors, spots);
  const cells = new Uint8Array(size * size);
  layout.slice(0, walls).forEach((i) => { cells[i] = WALL; });
  const mirrored = layout.slice(walls);
  mirrored.forEach((i) => { cells[i] = rand() < 0.5 ? SLASH : BACK; });
  const answer = trace({ size, cells, row });
  if (answer.hit.size < bends) return null;
  // Lamps go on empty cells the beam crosses after its first bend, never on the straight run from the housing.
  const first = Math.min(...[...answer.hit].filter((i) => Math.floor(i / size) === row));
  const open = [...answer.crossed].filter((i) => cells[i] === EMPTY && !(Math.floor(i / size) === row && i < first));
  if (open.length < lamps) return null;
  const lampCells = pick(lamps, open);
  // Short circuits sit on empty cells beside the answer's beam, where a wrong turn is likely to cross them.
  const near = (i) => [i - 1, i + 1, i - size, i + size].some((j) => answer.crossed.has(j));
  const quiet = spots.filter((i) => cells[i] === EMPTY && !answer.crossed.has(i) && !lampCells.includes(i));
  const shortCells = pick(shorts, quiet.filter(near));
  if (shortCells.length < shorts) return null;
  return { size, row, cells, answer, mirrored, lampCells, shortCells, fixed: pick(fixed, [...answer.hit]) };
}

/** True when turning at most `limit` of `turning` (cells, from index `from` on) wins: some answer is that close. */
function closeToSolved(g, turning, limit, from = 0) {
  if (wins(g, trace(g).crossed)) return true;
  if (limit === 0) return false;
  for (let k = from; k < turning.length; k++) {
    g.cells[turning[k]] = turned(g.cells[turning[k]]);
    const close = closeToSolved(g, turning, limit - 1, k + 1);
    g.cells[turning[k]] = turned(g.cells[turning[k]]);
    if (close) return true;
  }
  return false;
}

/**
 * Turn mirrors away from the answer until no way of winning is within `turns - 1` turns,
 * so no board is won by a tap or two (any answer counts, not only the one it was made from); false if
 * that never happens.
 */
function scramble(g, rand, turns) {
  const turning = g.mirrored.filter((i) => !g.fixed[i]);
  for (let tries = 0; tries < SCRAMBLES; tries++) {
    for (const i of turning) if (rand() < 0.5) g.cells[i] = turned(g.cells[i]);
    if (!closeToSolved(g, turning, turns - 1)) return true;
  }
  return false;
}

/** The fewest turns that win `g` as it stands, trying every way of turning 0, 1, 2... mirrors; Infinity past `cap`. */
export function parTurns(g, cap = 7) {
  const turning = g.mirrored.filter((i) => !g.fixed[i]);
  for (let n = 0; n <= cap; n++) if (closeToSolved(g, turning, n)) return n;
  return Infinity;
}

/** A fresh board of `level` ({ size, mirrors, ... }). status: 'ready' (not touched), 'playing' or 'won'. */
export function newBoard(level, rand) {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const made = build(level, rand);
    if (!made) continue;
    const fixed = new Uint8Array(made.size * made.size);
    made.fixed.forEach((i) => { fixed[i] = 1; });
    const g = {
      size: made.size,
      row: made.row,
      cells: made.cells,
      fixed,
      lamps: made.lampCells,
      shorts: made.shortCells,
      mirrored: made.mirrored,
      answer: Uint8Array.from(made.cells),
      taps: 0,
      history: [],
      status: 'ready',
    };
    if (!scramble(g, rand, level.turns)) continue;
    g.beam = trace(g);
    g.par = parTurns(g);
    g.budget = g.par + level.slack;
    g.start = Uint8Array.from(g.cells);
    return g;
  }
  // A level this strict can leave a rare seed without a board: settle for one turn fewer rather than none.
  if (level.turns > 1) return newBoard({ ...level, turns: level.turns - 1 }, rand);
  throw new Error('no board found');
}

/** How many lamps the beam has not reached yet. */
export const lampsLeft = (g) => g.lamps.length - litLamps(g, g.beam.crossed);

/** How many short circuits the beam is crossing now; a board is won only with none. */
export const shortsCrossed = (g) => shortsHit(g, g.beam.crossed);

/** Does the beam light lamp `i`? */
export const isLit = (g, i) => g.beam.crossed.has(i);

/** Turn the mirror on cell `i`: 'turn', 'won', 'fixed' (bolted down), or 'ignored' (not a mirror, or the board is fixed). */
export function turnMirror(g, i) {
  if (g.status === 'won' || !isMirror(g.cells[i])) return 'ignored';
  if (g.fixed[i]) return 'fixed';
  g.cells[i] = turned(g.cells[i]);
  g.taps += 1;
  g.history.push(i);
  g.beam = trace(g);
  g.status = wins(g, g.beam.crossed) ? 'won' : 'playing';
  return g.status === 'won' ? 'won' : 'turn';
}

/** How many turns the board still allows (undo takes one too). */
export const turnsLeft = (g) => g.budget - g.taps;

/** The turns ran out before the board was fixed. */
export const outOfTurns = (g) => g.status !== 'won' && turnsLeft(g) <= 0;

/** Put every mirror back as the board began, with a fresh budget of turns. */
export function resetBoard(g) {
  g.cells.set(g.start);
  g.taps = 0;
  g.history = [];
  g.beam = trace(g);
  g.status = 'ready';
}

/** The next mirror a player who knows the answer would turn, or -1 once the board is fixed. */
export function nextAnswer(g) {
  return g.mirrored.find((i) => !g.fixed[i] && g.cells[i] !== g.answer[i]) ?? -1;
}

/** Take back the last turn (it counts as a turn, and the clock goes on): the cell turned back, or -1 when there is nothing to take back. */
export function undoTurn(g) {
  if (g.status !== 'playing' || !g.history.length) return -1;
  const i = g.history.pop();
  g.cells[i] = turned(g.cells[i]);
  g.taps += 1;
  g.beam = trace(g);
  return i;
}

/** A run of boards: `bulbs` left of `max`, `fixed` boards so far. It ends when the last bulb burns out. */
export const newRun = (level) => ({ bulbs: level.bulbs, max: level.bulbs, fixed: 0 });

/** A turn sent the beam into a short circuit, or the turns ran out: one bulb burns out. True when that was the last one. */
export function burnBulb(run) {
  run.bulbs = Math.max(0, run.bulbs - 1);
  return run.bulbs === 0;
}

/** A board is fixed: one bulb comes back on (never more than the run began with). */
export function fixedBoard(run) {
  run.fixed += 1;
  run.bulbs = Math.min(run.max, run.bulbs + 1);
}
