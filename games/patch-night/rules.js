// Patch Night rules, with no DOM: the game page and the hall's attract mode both play by them.
//
// One question per wave. A bug crawls in along each lane, each carrying a number; exactly one is the
// answer. Zap the right bug and the next wave comes; zap a wrong one and it is pushed back. If the
// right bug reaches the logo in the middle, a light goes out; three lights out ends the run. A fact
// that was missed comes back a few questions later, until it has been answered right twice.

import { MAX_WEAK } from '../../js/memory.js';
import { seeded } from '../../js/random.js';

export { seeded };

/** Directions are numbered clockwise from up: 0 up, 1 up-right, 2 right, ... 7 up-left. */
export const DIRECTIONS = 8;
export const DIR_NAMES = ['Up', 'Up right', 'Right', 'Down right', 'Down', 'Down left', 'Left', 'Up left'];

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Speeds are the share of the way a bug crawls in a second. */
export const LEVELS = {
  simple: { label: 'Simple', dirs: [0, 2, 4, 6], tables: [1, 2, 3, 4, 5, 10], max: 10, close: false, missing: false, speed: { start: 0.06, cap: 0.12 } },
  medium: { label: 'Medium', dirs: range(0, 7), tables: range(1, 10), max: 10, close: true, missing: false, speed: { start: 0.06, cap: 0.14 } },
  hard: { label: 'Hard', dirs: range(0, 7), tables: range(1, 12), max: 12, close: true, missing: true, speed: { start: 0.06, cap: 0.14 } },
};

export const LIVES = 3;
export const PAUSE_MS = 800;   // between a finished wave and the next
export const FADE_MS = 500;    // a bug curling up and fading
export const ZAP_MS = 350;     // how long a zap line stays
export const BURST_MS = 800;   // how long the sparks of a right zap drift
export const BREAK_EVERY = 10; // answers between breaks
export const MILESTONE_EVERY = 50; // answers between special cheers
const SHOWN_HARD = 2;          // facts a break names as the hardest
const PUSH_BACK = 0.18;        // share of the way a wrong bug is pushed back
const PUSH_RATE = 0.6;         // ...at this many ways per second
const NUDGE = 0.07;            // the other bugs creep this far closer after a wrong zap
const PENALTY = 25;            // what a wrong zap takes off the wave's worth
const SPEED_UP = 0.004;        // after a right answer
const SPEED_DOWN = 0.01;       // after a missed wave
const MAX_BONUS = 100;         // for answering as the bug comes in, falling as it crawls closer
const REVIEW_GAP = [2, 4];     // a missed fact is asked again this many questions later
const LATER_GAP = [5, 8];      // ...and once more after a right answer
const WEAK_FIRST = [1, 3, 4, 6, 7, 9]; // questions where remembered weak facts come back

/** A fact is a pair of factors; 7 × 8 and 8 × 7 are the same fact. */
export const keyOf = (a, b) => `${Math.min(a, b)}x${Math.max(a, b)}`;

export function parseKey(key) {
  const m = /^(\d{1,2})x(\d{1,2})$/.exec(key);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** All facts of a level, once each. */
export function factsOf(cfg) {
  const seen = new Map();
  for (const a of cfg.tables) {
    for (let b = 1; b <= cfg.max; b++) {
      const key = keyOf(a, b);
      if (!seen.has(key)) seen.set(key, { key, a: Math.min(a, b), b: Math.max(a, b) });
    }
  }
  return [...seen.values()];
}

export const equation = (fact) => `${fact.a} × ${fact.b} = ${fact.a * fact.b}`;

const pick = (rand, [lo, hi]) => lo + Math.floor(rand() * (hi - lo + 1));

function shuffle(list, rand) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const unique = (list) => [...new Set(list)];

/** Wrong products near the answer: the neighbours in the same tables first, then the nearest numbers. */
function nearProducts(x, y, max, answer, count, rand) {
  const ok = (n) => n >= 1 && n <= max;
  const around = [];
  for (const d of [1, 2]) {
    for (const s of [-d, d]) {
      if (ok(y + s)) around.push(x * (y + s));
      if (ok(x + s)) around.push((x + s) * y);
    }
  }
  const picked = shuffle(unique(around).filter((n) => n !== answer), rand).slice(0, count);
  if (picked.length < count) {
    const all = unique(range(1, max).flatMap((m) => range(1, max).map((n) => m * n)))
      .filter((n) => n !== answer && !picked.includes(n))
      .sort((p, q) => Math.abs(p - answer) - Math.abs(q - answer) || p - q);
    picked.push(...all.slice(0, count - picked.length));
  }
  return picked;
}

/** Wrong products clearly unlike the answer, from the level's own tables. */
function farProducts(cfg, answer, count, rand) {
  const pool = unique(factsOf(cfg).map((f) => f.a * f.b)).filter((n) => n !== answer);
  for (let gap = Math.max(5, answer * 0.3); gap >= 0; gap -= 1) {
    const far = pool.filter((n) => Math.abs(n - answer) >= gap);
    if (far.length >= count) return shuffle(far, rand).slice(0, count);
  }
  return shuffle(pool, rand).slice(0, count);
}

/** Wrong factors: the nearest numbers to the right one. */
function nearFactors(max, answer, count, rand) {
  const others = shuffle(range(1, max).filter((n) => n !== answer), rand);
  return others.sort((p, q) => Math.abs(p - answer) - Math.abs(q - answer)).slice(0, count);
}

/**
 * The wave for `fact`: the question text and one value per lane. `kind` is 'product' (7 × 8) or
 * 'factor' (7 × ? = 56, the bugs carry factors).
 */
export function makeWave(cfg, fact, kind, rand) {
  const flip = rand() < 0.5;
  const [x, y] = flip ? [fact.b, fact.a] : [fact.a, fact.b];
  const product = fact.a * fact.b;
  const count = cfg.dirs.length - 1;
  let answer;
  let wrong;
  let text;
  if (kind === 'factor') {
    answer = y;
    wrong = nearFactors(cfg.max, answer, count, rand);
    text = `${x} × ? = ${product}`;
  } else {
    answer = product;
    wrong = cfg.close ? nearProducts(x, y, cfg.max, answer, count, rand) : farProducts(cfg, answer, count, rand);
    text = `${x} × ${y}`;
  }
  const values = shuffle([answer, ...wrong], rand);
  const bugs = cfg.dirs.map((dir, i) => ({ dir, value: values[i], right: values[i] === answer, d: 1, back: 0, ahead: 0, fade: -1 }));
  return { fact, kind, text, answer, bugs, done: null, missed: false, penalty: 0 };
}

/** The streak multiplier: x2 at 3 in a row, x3 at 6, x4 at 10. */
export const multiplier = (streak) => (streak >= 10 ? 4 : streak >= 6 ? 3 : streak >= 3 ? 2 : 1);

/**
 * A new run. `weak` is the keys of facts this browser remembers as missed before; they come back early.
 * @param {keyof LEVELS} level
 */
export function newGame(level, rand, weak = []) {
  const cfg = LEVELS[level];
  const facts = factsOf(cfg);
  const g = {
    level, cfg, rand, facts,
    status: 'playing',
    lives: LIVES, score: 0, streak: 0, bestStreak: 0, solved: 0,
    speed: cfg.speed.start,
    asked: 0,            // waves started so far
    wave: null,
    pause: 0,
    zap: null,           // { dir, age, right } while a zap line shows
    burst: null,         // { dir, d, age } while the sparks of a right zap drift
    queue: [],           // facts to ask again: { key, fact, due, need }
    missed: new Map(),   // key -> fact, in the order missed this run
    answered: 0,         // answers in the whole run, for milestones
    rightFirst: 0,       // of them right first time, and the time all of them took, for the hall of fame
    answerMs: 0,
    round: [],           // the answers since the last break: { fact, right, ms }
    rightKeys: new Set(),
    last: '',
  };
  const known = new Map(facts.map((f) => [f.key, f]));
  unique(weak).filter((k) => known.has(k)).slice(0, WEAK_FIRST.length).forEach((key, i) => {
    g.queue.push({ key, fact: known.get(key), due: WEAK_FIRST[i], need: 1 });
  });
  startWave(g);
  return g;
}

function nextFact(g) {
  const due = g.queue.filter((e) => e.due <= g.asked).sort((p, q) => p.due - q.due)[0];
  if (due) return due.fact;
  const pool = g.facts.filter((f) => f.key !== g.last && !g.queue.some((e) => e.key === f.key));
  return pool[Math.floor(g.rand() * pool.length)];
}

function startWave(g) {
  const fact = nextFact(g);
  const kind = g.cfg.missing && fact.a > 1 && g.rand() < 0.3 ? 'factor' : 'product';
  g.wave = makeWave(g.cfg, fact, kind, g.rand);
  g.last = fact.key;
  g.asked += 1;
  g.pause = 0;
  g.wave.age = 0;        // ms since the wave began, to time the answer
}

/** Note a miss: the fact comes back in two to four questions, and needs two right answers. */
function miss(g) {
  const w = g.wave;
  g.streak = 0;
  if (w.missed) return;
  w.missed = true;
  g.missed.set(w.fact.key, w.fact);
  g.queue = g.queue.filter((e) => e.key !== w.fact.key);
  g.queue.push({ key: w.fact.key, fact: w.fact, due: g.asked - 1 + pick(g.rand, REVIEW_GAP), need: 2 });
}

function finishWave(g, how) {
  g.wave.done = how;
  const right = how === 'zapped' && !g.wave.missed;
  g.answered += 1;
  if (right) g.rightFirst += 1;
  g.answerMs += g.wave.age;
  g.round.push({ fact: g.wave.fact, right, ms: g.wave.age });
  g.pause = PAUSE_MS;
  for (const b of g.wave.bugs) if (b.fade < 0) b.fade = 0;
}

/**
 * What the right answer is worth right now, before the streak multiplier: 100, plus up to MAX_BONUS
 * while the right bug is still far out, less PENALTY for each wrong zap this wave. It counts down as
 * the bug crawls in, so the page can show it.
 */
export function worth(g) {
  const bug = g.wave?.bugs.find((b) => b.right);
  if (!bug || g.wave.done) return 0;
  return Math.max(0, 100 + Math.round(MAX_BONUS * bug.d) - g.wave.penalty);
}

/** The live bug in a direction, or null. */
export const bugIn = (g, dir) => g.wave?.bugs.find((b) => b.dir === dir && b.fade < 0) ?? null;

/**
 * Zap a lane. Returns what happened: { type: 'right', points, worth, mult }, { type: 'wrong', penalty, worth } or null
 * when there was nothing to zap.
 */
export function zap(g, dir) {
  if (g.status !== 'playing' || g.wave.done) return null;
  const bug = bugIn(g, dir);
  if (!bug) return null;
  g.zap = { dir, age: 0, right: bug.right };
  if (!bug.right) {
    bug.back = Math.min(PUSH_BACK, 1 - bug.d);
    for (const other of g.wave.bugs) if (other !== bug && other.fade < 0) other.ahead += NUDGE;
    g.wave.penalty += PENALTY;
    miss(g);
    return { type: 'wrong', penalty: PENALTY, worth: worth(g) };
  }
  const now = worth(g);
  g.streak += 1;
  g.bestStreak = Math.max(g.bestStreak, g.streak);
  const mult = multiplier(g.streak);
  const points = now * mult;
  g.score += points;
  g.solved += 1;
  g.speed = Math.min(g.cfg.speed.cap, g.speed + SPEED_UP);
  if (!g.wave.missed) answeredRight(g);
  g.burst = { dir: bug.dir, d: bug.d, age: 0 };
  bug.fade = 0;
  finishWave(g, 'zapped');
  return { type: 'right', points, worth: now, mult };
}

function answeredRight(g) {
  const key = g.wave.fact.key;
  g.rightKeys.add(key);
  const entry = g.queue.find((e) => e.key === key);
  if (!entry) return;
  entry.need -= 1;
  if (entry.need <= 0) g.queue = g.queue.filter((e) => e !== entry);
  else entry.due = g.asked - 1 + pick(g.rand, LATER_GAP);
}

/** Advance by dt ms. Returns the events: 'light' (a light went out), 'over', 'wave', 'break' (time for a pause card; call resume). */
export function step(g, dt) {
  const events = [];
  if (g.status === 'break') return events;
  if (g.zap) {
    g.zap.age += dt;
    if (g.zap.age >= ZAP_MS) g.zap = null;
  }
  if (g.burst) {
    g.burst.age += dt;
    if (g.burst.age >= BURST_MS) g.burst = null;
  }
  const w = g.wave;
  if (!w.done) w.age += dt;
  for (const b of w.bugs) {
    if (b.fade >= 0) { b.fade += dt; continue; }
    if (b.back > 0) {
      const m = Math.min(b.back, (PUSH_RATE * dt) / 1000);
      b.d += m;
      b.back -= m;
    }
    if (b.ahead > 0) {
      const m = Math.min(b.ahead, (PUSH_RATE * dt) / 1000);
      b.d -= m;
      b.ahead -= m;
    }
    b.d -= (g.speed * dt) / 1000;
    if (b.d > 0) continue;
    b.d = 0;
    b.fade = 0;
    if (b.right && !w.done && g.status === 'playing') {
      miss(g);
      g.speed = Math.max(g.cfg.speed.start, g.speed - SPEED_DOWN);
      g.lives -= 1;
      finishWave(g, 'arrived');
      events.push({ type: 'light', lives: g.lives });
      if (g.lives <= 0) {
        g.status = 'over';
        events.push({ type: 'over' });
      }
    }
  }
  if (g.status === 'playing' && w.done) {
    g.pause -= dt;
    if (g.pause <= 0) {
      if (g.round.length >= BREAK_EVERY) {
        g.status = 'break';
        events.push({ type: 'break', summary: { ...summarise(g.round), answered: g.answered } });
      } else {
        startWave(g);
        events.push({ type: 'wave' });
      }
    }
  }
  return events;
}

/** After a break card: the next wave starts and a fresh set of answers is counted. */
export function resume(g) {
  if (g.status !== 'break') return;
  g.status = 'playing';
  g.round = [];
  startWave(g);
}

/**
 * What a break shows: how many answers were right first time, the average time of those, and up to
 * two hardest facts (the misses first, then the slowest right ones), as equations.
 */
export function summarise(round) {
  const right = round.filter((a) => a.right);
  const slow = right.slice().sort((p, q) => q.ms - p.ms);
  const hardest = [...new Set([...round.filter((a) => !a.right), ...slow].map((a) => equation(a.fact)))].slice(0, SHOWN_HARD);
  const avgMs = right.length ? Math.round(right.reduce((sum, a) => sum + a.ms, 0) / right.length) : 0;
  return { total: round.length, right: right.length, avgMs, hardest };
}

/** True while something on the board is still moving (a run that is over still fades its last bugs). */
export const moving = (g) => g.status === 'playing' || g.zap !== null || g.burst !== null
  || g.wave.bugs.some((b) => b.fade >= 0 && b.fade < FADE_MS);

/** The facts missed this run, as lines to practise, e.g. "7 × 8 = 56". */
export const practiseList = (g) => [...g.missed.values()].map(equation);

/**
 * The facts to remember for next time: the ones still waiting for right answers (missed here, or
 * remembered and not yet answered), then older ones this run did not clear. At most MAX_WEAK.
 */
export function mergeWeak(previous, g) {
  const pending = g.queue.map((e) => e.key);
  const kept = previous.filter((k) => parseKey(k) && !g.rightKeys.has(k));
  return unique([...pending, ...kept]).slice(0, MAX_WEAK);
}

const KEY_DIRS = {
  ArrowUp: 0, KeyE: 1, ArrowRight: 2, KeyC: 3, ArrowDown: 4, KeyZ: 5, ArrowLeft: 6, KeyQ: 7,
  Numpad8: 0, Numpad9: 1, Numpad6: 2, Numpad3: 3, Numpad2: 4, Numpad1: 5, Numpad4: 6, Numpad7: 7,
};

/** The direction a key (a KeyboardEvent.code) zaps, if the level has that lane. */
export function dirOfKey(code, dirs) {
  const dir = KEY_DIRS[code];
  return dir !== undefined && dirs.includes(dir) ? dir : -1;
}

const ARROW_STEP = { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] };
const STEP_DIR = { '0,-1': 0, '1,-1': 1, '1,0': 2, '1,1': 3, '0,1': 4, '-1,1': 5, '-1,0': 6, '-1,-1': 7 };

/**
 * The lane the held arrow keys point at: one arrow is a straight lane, two at right angles (up and
 * right) are the corner between them. Opposite arrows cancel. -1 when the level has no such lane.
 */
export function dirOfArrows(held, dirs) {
  let x = 0;
  let y = 0;
  for (const code of held) {
    const step = ARROW_STEP[code];
    if (step) { x += step[0]; y += step[1]; }
  }
  const dir = STEP_DIR[`${x},${y}`];
  return dir !== undefined && dirs.includes(dir) ? dir : -1;
}

/** The lane nearest to an angle (degrees clockwise from up). */
export function nearestDir(angle, dirs) {
  const a = ((angle % 360) + 360) % 360;
  let best = dirs[0];
  let bestGap = Infinity;
  for (const d of dirs) {
    const gap = Math.abs(((a - d * 45 + 540) % 360) - 180);
    if (gap < bestGap) { bestGap = gap; best = d; }
  }
  return best;
}

const CHEERS = {
  flawless: ['Clean sweep.', 'Zero bugs left.', 'Not one got past.', 'Ten for ten.'],
  great: ['Sharp work.', 'Bugs are running out of places to hide.', 'Steady hands.', 'Nearly spotless.'],
  good: ['Decent set.', 'The tables are sinking in.', 'Solid. Keep going.', 'More than half down.'],
  practice: ['Tough set. They stick eventually.', 'The bugs won that one.', 'Rough patch. Next set is yours.', 'Learning the hard ones.'],
  milestone: ['Fifty answers. The bugs have noticed you.', 'Fifty down. Still no mercy.', 'Fifty. Time to ask for a raise.', 'Half a hundred. Not bad for one evening.', 'Fifty. The server room is yours.'],
};

/**
 * The cheer for a break: by how many were right first time, or a special one on every 50th answer.
 * A random line from its pool that is not `previous`, so it stays fresh.
 * @param {() => number} rand a number in [0, 1)
 */
export function cheerFor({ right, total, answered = 0 }, rand, previous = '') {
  const milestone = answered > 0 && answered % MILESTONE_EVERY === 0;
  const pool = CHEERS[milestone ? 'milestone' : right === total ? 'flawless' : right >= total * 0.8 ? 'great' : right >= total * 0.5 ? 'good' : 'practice'];
  const options = pool.filter((c) => c !== previous);
  return options[Math.floor(rand() * options.length)];
}

/** What the hall of fame shows beside a run's score: the share right first time (%) and the average answer time (ms). */
export function fameOf(g) {
  if (!g.answered) return { right: 0, avg: 0 };
  return { right: Math.round((100 * g.rightFirst) / g.answered), avg: Math.round(g.answerMs / g.answered) };
}
