// Bent Beam in attract mode: the hall's cabinet screen plays an easy board by the real rules, calmly
// (a mirror turns about once a second, ringed a moment before), shows the Notchup logo notching up when
// every lamp is lit, then this browser's hall of fame, and starts over. The demo cheats (it knows the
// answer), so it never gets stuck.

import { createTail, drawNotchUp } from '../../js/screens.js';
import { LEVELS, newBoard, nextAnswer, seeded, turnMirror } from './rules.js';
import { drawBoard } from './scene.js';

const MOVE_MS = 1100;
const RING_MS = 450; // the mirror is ringed this long before it turns
const LIT_MS = 3500;

/** @param {{ scores: () => Array<{ label: string, table: Array<{ initials: string, value: number }> }> }} source the levels' top runs to show */
export function createDemo({ scores, seed = 11 }) {
  const rand = seeded(seed);
  const tail = createTail(scores, String);
  let g;
  let phase;
  let timer;
  let mark;

  function reset() {
    g = newBoard(LEVELS.easy, rand);
    phase = 'play';
    timer = 0;
    mark = -1;
  }

  reset();

  return {
    step(dt) {
      if (phase === 'scores') {
        if (tail.done) { reset(); return true; }
        return tail.step(dt);
      }
      timer += dt;
      if (phase === 'lit') {
        if (timer >= LIT_MS) { phase = 'scores'; tail.open(); return true; }
        return false;
      }
      const ringed = mark;
      if (timer >= MOVE_MS - RING_MS && mark < 0) mark = nextAnswer(g);
      if (timer >= MOVE_MS) {
        if (turnMirror(g, mark) === 'won') { phase = 'lit'; }
        mark = -1;
        timer = 0;
        return true;
      }
      return mark !== ringed;
    },

    draw(ctx, w, h, c) {
      if (phase === 'scores') return tail.draw(ctx, w, h, c);
      drawBoard(ctx, w, h, c, g, mark);
      if (phase === 'lit') drawNotchUp(ctx, w, h, c, 4, 'ALL LIT');
    },
  };
}
