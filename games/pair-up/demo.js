// Pair Up in attract mode: the hall's cabinet screen plays an easy deck by the real rules, calmly: one
// wrong pair first (the demo "forgets" once), then the rest found one after another. Then the logo
// notches up, this browser's top 5 shows, and it starts over.

import { drawNotchUp, drawScores } from '../../js/screens.js';
import { drawBack, drawFace } from './faces.js';
import { CHANCES, flip, newGame, seeded, shape } from './rules.js';

const FLIP_MS = 250;     // a card turning over
const STEP_MS = 700;     // between two turns
const HEAD_START = 3;    // pairs already found, so a still frame (reduced motion) shows a deck at play
const WIN_MS = 900;
const END_MS = 2500;
const SCORES_MS = 5000;

/** The cards to turn, in order: a wrong pair, then every pair in turn. */
function planOf(g) {
  const at = new Map();
  g.cards.forEach((c, i) => at.set(c.face, [...(at.get(c.face) ?? []), i]));
  const pairs = [...at.values()];
  return [pairs[0][0], pairs[1][0], ...pairs.flat()];
}

/** @param {{ scores: () => Array<{ initials: string, value: number }> }} source the top runs to show */
export function createDemo({ scores, seed = 4 }) {
  const rand = seeded(seed);
  let g;
  let plan;
  let turned;   // how far down `plan` the demo has got
  let turn;     // per card, 0 (face down) to 1 (face up)
  let phase;
  let timer;

  function reset() {
    g = newGame('easy', rand);
    plan = planOf(g);
    turn = g.cards.map(() => 0);
    turned = 0;
    // Start with the wrong pair and a few pairs found, no waiting.
    for (; turned < 2 + HEAD_START * 2; turned++) flip(g, plan[turned]);
    turn = g.cards.map((c) => (c.state === 'down' ? 0 : 1));
    phase = 'play';
    timer = 0;
  }

  reset();

  return {
    step(dt) {
      timer += dt;
      if (phase === 'scores') {
        if (timer >= SCORES_MS) { reset(); return true; }
        return false;
      }
      if (phase === 'end') {
        if (timer >= END_MS) { phase = 'scores'; timer = 0; }
        return true;
      }
      let moved = false;
      if (phase === 'play' && g.status === 'playing' && timer >= STEP_MS) {
        flip(g, plan[turned++]);
        timer = 0;
      } else if (g.status === 'won' && timer >= WIN_MS) {
        phase = 'end';
        timer = 0;
      }
      g.cards.forEach((card, i) => {
        const to = card.state === 'down' ? 0 : 1;
        if (turn[i] === to) return;
        turn[i] = to > turn[i] ? Math.min(to, turn[i] + dt / FLIP_MS) : Math.max(to, turn[i] - dt / FLIP_MS);
        moved = true;
      });
      return moved || timer === 0;
    },

    draw(ctx, w, h, c) {
      if (phase === 'scores') return drawScores(ctx, w, h, c, scores(), String);
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, w, h);
      const [cols, rows] = shape('easy', h > w);
      const m = Math.min(w, h) * 0.05;
      const gap = Math.min(w, h) * 0.025;
      const lamps = h * 0.1;
      const size = Math.min((w - 2 * m - gap * (cols - 1)) / cols, (h - 2 * m - lamps - gap * (rows - 1)) / rows);
      const x0 = (w - (size * cols + gap * (cols - 1))) / 2;
      const y0 = m;
      g.cards.forEach((card, i) => {
        const cx = x0 + (i % cols) * (size + gap) + size / 2;
        const cy = y0 + Math.floor(i / cols) * (size + gap) + size / 2;
        const side = Math.abs(Math.cos(turn[i] * Math.PI));
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(Math.max(side, 0.02), 1);
        ctx.fillStyle = turn[i] > 0.5 ? '#0b1730' : '#10223f';
        ctx.strokeStyle = turn[i] > 0.5 ? (card.state === 'matched' ? c.gold : c.cyan) : c.dim;
        ctx.lineWidth = Math.max(2, size * 0.04);
        ctx.beginPath();
        ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.1);
        ctx.fill();
        ctx.stroke();
        if (turn[i] > 0.5) drawFace(ctx, card.face, 0, 0, size, c);
        else drawBack(ctx, 0, 0, size, c);
        ctx.restore();
      });
      const lampSize = lamps * 0.3;
      for (let k = 0; k < CHANCES; k++) {
        ctx.beginPath();
        ctx.arc(w / 2 + (k - 1) * lampSize * 3, h - m - lamps / 2, lampSize, 0, Math.PI * 2);
        ctx.fillStyle = k < g.chances ? c.gold : c.dim;
        ctx.fill();
      }
      if (phase === 'end') drawNotchUp(ctx, w, h, c, 4, 'ALL PAIRS');
    },
  };
}
