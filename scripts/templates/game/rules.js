// {{name}}'s rules, with no DOM: a light comes on and goes out again. A tap while it is lit scores a
// point and puts it out; a tap in the dark ends the run. The light stays lit for less time as the score
// grows. Everything is seeded, so tests and the hall's demo replay.
//
// This is the starter game ./dev new-game wrote: change it into the game you are making.

import { seeded } from '../../js/random.js';

export { seeded };

export const LIT_MS = 1100;      // how long the light stays lit at first
export const SHORTER_MS = 40;    // and how much less for every point
export const MIN_LIT_MS = 400;
export const DARK_MS = [600, 1600]; // the dark between two lights, at random in this range

const between = (rand, [lo, hi]) => lo + rand() * (hi - lo);
export const litFor = (score) => Math.max(MIN_LIT_MS, LIT_MS - SHORTER_MS * score);

export function newGame(rand) {
  return { rand, status: 'playing', score: 0, lit: false, left: between(rand, DARK_MS) };
}

/** Advance the game by `dt` ms: the light comes on or goes out when its time is up. */
export function step(g, dt) {
  if (g.status !== 'playing') return;
  g.left -= dt;
  while (g.left <= 0) {
    g.lit = !g.lit;
    g.left += g.lit ? litFor(g.score) : between(g.rand, DARK_MS);
  }
}

/** A tap: 'point' while the light is lit, 'over' in the dark, 'ignored' once the run is over. */
export function tap(g) {
  if (g.status !== 'playing') return { type: 'ignored' };
  if (!g.lit) {
    g.status = 'over';
    return { type: 'over', score: g.score };
  }
  g.score += 1;
  g.lit = false;
  g.left = between(g.rand, DARK_MS);
  return { type: 'point', score: g.score };
}
