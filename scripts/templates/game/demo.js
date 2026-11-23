// {{name}} in attract mode: the hall's cabinet screen plays by the real rules, tapping a moment after
// the light comes on, for a few points. Then the logo notches up, this browser's top 5 shows, and it
// starts over.

import { createTail, drawNotchUp } from '../../js/screens.js';
import { newGame, seeded, step, tap } from './rules.js';
import { drawLight } from './scene.js';

const REACT_MS = 300;  // how long the demo waits after the light comes on
const POINTS = 6;      // points to score before the end
const END_MS = 2500;

/** @param {{ scores: () => Array<{ label: string, table: Array<{ initials: string, value: number }> }> }} source the top runs to show */
export function createDemo({ scores, seed = 5 }) {
  const rand = seeded(seed);
  const tail = createTail(scores, String);
  let g;
  let phase;
  let timer;

  function reset() {
    g = newGame(rand);
    phase = 'play';
    timer = 0;
  }

  reset();

  return {
    step(dt) {
      if (phase === 'scores') {
        if (tail.done) { reset(); return true; }
        return tail.step(dt);
      }
      timer += dt;
      if (phase === 'end') {
        if (timer >= END_MS) { phase = 'scores'; tail.open(); }
        return false;
      }
      const was = g.lit;
      step(g, dt);
      if (g.lit !== was) timer = 0;
      if (g.lit && timer >= REACT_MS) {
        tap(g);
        if (g.score >= POINTS) { phase = 'end'; timer = 0; }
      }
      return g.lit !== was || phase === 'end';
    },

    draw(ctx, w, h, c) {
      if (phase === 'scores') return tail.draw(ctx, w, h, c);
      drawLight(ctx, w, h, c, g.lit);
      if (phase === 'end') drawNotchUp(ctx, w, h, c, 4, `${g.score} POINTS`);
    },
  };
}
