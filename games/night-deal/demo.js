// Night Deal in attract mode: the hall's cabinet screen plays a recorded game, won by the real rules,
// one move after another. Then the logo notches up, this browser's top 5 shows, and it starts over.
// The recording is the line the solver found for one deal (tests/night-deal-demo.test.js plays it
// through the rules and checks it wins), so the demo needs no solver of its own.

import { createTail, drawNotchUp } from '../../js/screens.js';
import { formatTime } from '../../js/scores.js';
import { layout } from './layout.js';
import { drawTable } from './scene.js';
import { newGame, parseMove, play, seeded } from './rules.js';

export const SEED = 4;
export const LINE = 'c0f2 c6c5 c5c1x2 sw sw wc6 c5c6 sw sw sw wc3 sw wc0 c6c0x3 c6f1 c6c0 c6f3 c6f0 c5f0 c2f0 c2c0 c2c0 wc0 wf1 sw wc0 sw wf3 c5f3 c5c6 sw wc6 sw sw sw wf3 sw wf1 sw wc1 c3c1x2 c3c2 c6c3x3 sw wc0 sw wf2 sw wf3 c3f3 sw wf0 sw sw wc4 c1c4x6 c4c1x8 c4f2 c0f2 c1f2 c4c6 c4f3 c4c2 wc2 sw wf0 c5f0 c3f0 c3f3 sw wc6 sw wf1 c0f1 c0f2 c1f1 c0f1 c1f2 c0f2 c1f0 c0f0 wf2 wf1 c1f3 c1f0 c3f1 wf1 c0f2 c3f2 c0f0 c0f2 c2f1 c6f0 c2c0 sw wf3 c1f3 c0f3 c1f1 c0f1 c1f3 c2f0 c6f2'.split(' ').map(parseMove);

const MOVE_MS = 90;      // between two moves
const START_MS = 700;    // the dealt table shows first
const END_MS = 2500;
const SMALL = { floor: 5, minWidth: 8, run: 6 }; // the screen is small: suits without letters

/** @param {{ scores: () => Array<{ label: string, table: Array<{ initials: string, value: number }> }> }} source the top times to show */
export function createDemo({ scores }) {
  const tail = createTail(scores, formatTime);
  let g;
  let played;
  let phase;
  let timer;

  function reset() {
    g = newGame('draw-1', seeded(SEED));
    played = 0;
    phase = 'play';
    timer = -START_MS;
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
      let moved = false;
      while (timer >= MOVE_MS && played < LINE.length) {
        timer -= MOVE_MS;
        g = play(g, LINE[played++]);
        moved = true;
      }
      if (played === LINE.length) { phase = 'end'; timer = 0; }
      return moved || phase === 'end';
    },

    draw(ctx, w, h, c) {
      if (phase === 'scores') return tail.draw(ctx, w, h, c);
      drawTable(ctx, c, g, layout(w, h, g, SMALL));
      if (phase === 'end') drawNotchUp(ctx, w, h, c, 4, 'DEALT OUT');
      return undefined;
    },
  };
}
