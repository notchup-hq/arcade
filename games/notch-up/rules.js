// Notch Up's rules, with no DOM: build a tower floor by floor. A floor slides back and forth above the
// top of the tower; drop it, and whatever hangs over the edge is cut off, so the next floor is
// narrower. A drop within PERFECT of the floor below snaps onto it, and from the third perfect in a row
// each one wins some width back. A floor that misses the tower ends the run. Round numbers of floors
// get a cheer and a helping hand: the milestone floor is built wider, so the floors after it are too. Everything is seeded, so tests and the hall's demo replay.
//
// The world is WORLD units across, x from -WORLD/2 to WORLD/2, floors FLOOR units high.

import { seeded } from '../../js/random.js';

export { seeded };

export const WORLD = 200;
export const FLOOR = 12;
export const START_WIDTH = 90;
export const PERFECT = 4;        // a drop this close to the floor below snaps onto it
export const STILL_STEP = 3;     // with reduced motion the floor moves in steps this big, no bigger than PERFECT
const REGROW_FROM = 3;           // perfects in a row before a perfect wins width back
const REGROW = 8;                // width won back
// The help a milestone floor gets: this much wider, up to the start width (Infinity: back to full).
export const WIDEN = { small: 20, medium: 40, large: Infinity };
const SPEED = 60;                // units a second for the first floor
const SPEED_UP = 2;              // more for every floor built
const MAX_SPEED = 150;
export const FADE_MS = 500;      // a cut-off piece fading where it was
export const SEAM_MS = 400;      // the gold line of a perfect drop fading
export const LIT_MS = 500;       // the windows of the floor just built lighting up and fading back
export const CHEER_MS = 2600;    // a cheer's words swelling in and fading out
export const BURST_MS = 1100;    // one burst of sparks drifting out
const MIN_RECORD = 10;           // beating a best lower than this is not worth a cheer

// The cheers, by size: the bigger the milestone, the bigger the words and the more sparks.
export const PRAISE = {
  small: ['Nicely done', 'Looking up', 'Solid work', 'On a roll'],
  medium: ['Sky high', 'Top notch', 'Impressive', 'Outstanding'],
  large: ['Legendary', 'Skyscraper', 'Magnificent', 'Stellar'],
  record: ['New record', 'New best', 'Above it all'],
};
// And a dry line from the building site under the praise, at most 26 characters so it fits a phone.
export const QUIPS = {
  small: ['The lift is on order.', 'Planning permission: TBD.', 'Still under budget.', 'The view is improving.', 'Hard hats on.', 'Mind the scaffolding.'],
  medium: ['Pigeons are impressed.', 'The crane driver waves.', 'Above the billboards now.', 'Fifty floors, no meetings.', 'The lift music is on.'],
  large: ['Mind the clouds.', 'Air traffic has questions.', 'The moon says hi.', 'Satellites, look out.', 'Wi-Fi up here is great.'],
  record: ['Higher than ever. Here.', 'Your old tower is jealous.', 'New view, same night.', 'The skyline just changed.'],
};
const BURSTS = { small: 3, medium: 5, large: 8, record: 8 };
const BURST_GAP_MS = 260;

/** The size of the cheer for `floors` built, or null: 10, 50 and 100, then every hundredth floor. */
export function milestoneAt(floors) {
  if (floors === 10) return 'small';
  if (floors === 50) return 'medium';
  return floors >= 100 && floors % 100 === 0 ? 'large' : null;
}

/** True on the first floor past this browser's best (`best`), when that best is worth beating. */
export const recordAt = (floors, best) => best >= MIN_RECORD && floors === best + 1;

/** A line from `list` picked at random, never the same as `previous`. */
export function pickLine(list, rand, previous = '') {
  const lines = list.filter((p) => p !== previous);
  return lines[Math.floor(rand() * lines.length)];
}

/** The cheer for `floors` built, or null; a new record wins over a round number on the same floor. */
function cheerOf(g, floors) {
  const record = recordAt(floors, g.best);
  const size = record ? 'record' : milestoneAt(floors);
  if (!size) return null;
  const praise = pickLine(PRAISE[size], g.rand, g.lastPraise);
  const quip = pickLine(QUIPS[size], g.rand, g.lastQuip);
  g.lastPraise = praise;
  g.lastQuip = quip;
  // Bursts at seeded spots in the sky, as shares of the picture, one after another.
  const bursts = Array.from({ length: BURSTS[size] }, (_, k) => ({
    x: 0.15 + g.rand() * 0.7,
    y: 0.12 + g.rand() * 0.4,
    delay: k * BURST_GAP_MS,
  }));
  const count = record ? `Beat your best of ${g.best}` : `${floors} floors`;
  return { size, count, praise, quip, bursts, age: 0 };
}

const speedFor = (floors) => Math.min(MAX_SPEED, SPEED + SPEED_UP * floors);

/** How far either way a floor of width `w` may slide: its edge stops at the edge of the world. */
export const swingOf = (w) => WORLD / 2 - w / 2;

/** A floor of width `w` starting at the far edge on side `from` (-1 left, 1 right), sliding inwards. */
function newMover(g, w, from) {
  return { x: from * swingOf(w), w, from, dir: -from, speed: speedFor(built(g)) };
}

/** Floors built on top of the base. */
export const built = (g) => g.floors.length - 1;

/** A new run. `best` is this browser's best so far, for the record cheer. */
export function newGame(rand, best = 0) {
  const g = {
    rand,
    best,
    status: 'playing',
    floors: [{ x: 0, w: START_WIDTH }],
    mover: null,
    perfect: 0,       // perfects in a row
    bestPerfect: 0,
    cut: null,        // { x, w, floor, age }: the piece cut off, fading
    seam: null,       // { floor, age }: the gold line of a perfect drop, fading
    lit: null,        // { floor, age }: the floor just built, its windows lit for a moment
    cheer: null,
    lastPraise: '',
    lastQuip: '',
  };
  g.mover = newMover(g, START_WIDTH, rand() < 0.5 ? -1 : 1);
  return g;
}

/** Where the sliding floor is drawn and judged: with reduced motion (`still`) it moves in steps. */
export const moverX = (g, still = false) => (still ? Math.round(g.mover.x / STILL_STEP) * STILL_STEP : g.mover.x);

/** Slide the floor and age the fading parts by `dt` ms. */
export function step(g, dt) {
  if (g.status === 'playing') {
    const m = g.mover;
    const limit = swingOf(m.w);
    m.x += (m.dir * m.speed * dt) / 1000;
    if (Math.abs(m.x) > limit) {
      m.x = Math.sign(m.x) * (2 * limit - Math.abs(m.x));
      m.dir = -Math.sign(m.x);
    }
  }
  for (const [part, ms] of [['cut', FADE_MS], ['seam', SEAM_MS], ['lit', LIT_MS]]) {
    if (g[part]) {
      g[part].age += dt;
      if (g[part].age >= ms) g[part] = null;
    }
  }
  if (g.cheer) {
    g.cheer.age += dt;
    const last = g.cheer.bursts.at(-1).delay + BURST_MS;
    if (g.cheer.age >= Math.max(CHEER_MS, last)) g.cheer = null;
  }
}

/**
 * Drop the sliding floor where it is drawn. Returns { type: 'over' } when it misses the tower, else
 * { type: 'perfect' | 'cut', floors, cheer } with the cheer it earned, if any.
 */
export function drop(g, still = false) {
  if (g.status !== 'playing') return null;
  const below = g.floors.at(-1);
  const x = moverX(g, still);
  const off = x - below.x;
  const w = g.mover.w;
  const floor = g.floors.length;
  if (Math.abs(off) >= w) {
    g.status = 'over';
    g.cut = { x, w, floor, age: 0 };
    return { type: 'over', floors: built(g) };
  }
  let next;
  let type;
  if (Math.abs(off) <= PERFECT) {
    type = 'perfect';
    g.perfect += 1;
    g.bestPerfect = Math.max(g.bestPerfect, g.perfect);
    next = { x: below.x, w: g.perfect >= REGROW_FROM ? Math.min(START_WIDTH, w + REGROW) : w };
    g.seam = { floor, age: 0 };
  } else {
    type = 'cut';
    g.perfect = 0;
    const over = Math.abs(off);
    next = { x: below.x + off / 2, w: w - over };
    g.cut = { x: below.x + Math.sign(off) * (w / 2 + over / 2), w: over, floor, age: 0 };
  }
  const milestone = milestoneAt(floor);
  const widened = milestone !== null && next.w < START_WIDTH;
  if (widened) {
    next.w = Math.min(START_WIDTH, next.w + WIDEN[milestone]);
    next.x = Math.max(-swingOf(next.w), Math.min(swingOf(next.w), next.x)); // a wider floor stays in the picture
    g.seam = { floor, age: 0 };
  }
  g.floors.push(next);
  g.lit = { floor, age: 0 };
  const cheer = cheerOf(g, built(g));
  if (cheer) g.cheer = cheer;
  g.mover = newMover(g, next.w, -g.mover.from);
  return { type, floors: built(g), cheer, widened };
}

/** True while something is still moving or fading, so the page keeps drawing after a run ends. */
export const moving = (g) => g.status === 'playing' || g.cut !== null || g.seam !== null || g.lit !== null || g.cheer !== null;
