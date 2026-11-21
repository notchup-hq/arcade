// Fuse Box in attract mode: the hall's cabinet screen plays a small panel by the real rules, calmly
// (about one move a second, the cursor stepping to a fuse near the last one), shows the Notchup logo
// notching up when the panel is fixed, then this browser's hall of fame, and starts over. The demo
// cheats (it knows where the blown fuses are), so it never loses.

import { formatTime } from '../../js/scores.js';
import { FONT, drawNotchUp, drawScores } from '../../js/screens.js';
import { LEVELS, TAGGED, TESTED, UNTESTED, around, newPanel, seeded, testFuse, toggleTag } from './rules.js';

const MOVE_MS = 1100;
const FIXED_MS = 4000;
const SCORES_MS = 5000;
const NOTCH_MS = 600;

/** The colour of a count, from calm cyan for 1 to hot red for 5 and up. */
export const countColour = (c, k) => [c.ink, c.cyan, c.green, c.gold, c.magenta, c.red][Math.min(k, 5)];

/**
 * The next move a perfect player would make, as close to the last one as it can be, so the cursor
 * walks instead of jumping around: an untested fuse next to the lit area, tagged if it is blown.
 */
function nextMove(p, from) {
  const fx = from % p.cols;
  const fy = Math.floor(from / p.cols);
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < p.cells.length; i++) {
    if (p.cells[i] !== UNTESTED) continue;
    const frontier = around(p, i).some((j) => p.cells[j] === TESTED);
    const d = Math.hypot((i % p.cols) - fx, Math.floor(i / p.cols) - fy) + (frontier ? 0 : 100);
    if (d < bestD) { bestD = d; best = i; }
  }
  return { i: best, tag: p.isBlown[best] === 1 };
}

/** @param {{ scores: () => Array<{ initials: string, value: number }> }} source the hall of fame to show */
export function createDemo({ scores, seed = 7 }) {
  const rand = seeded(seed);
  let p;
  let phase;
  let timer;
  let cursor;
  let notches = 0;

  function reset() {
    p = newPanel(LEVELS.easy);
    // Start mid-game, so even a still frame (reduced motion) shows a panel being fixed.
    cursor = Math.floor(p.cells.length / 2) + p.cols / 2;
    testFuse(p, cursor, rand);
    for (let k = 0; k < 6 && p.status === 'playing'; k++) move();
    phase = 'play';
    timer = 0;
  }

  function move() {
    const m = nextMove(p, cursor);
    cursor = m.i;
    if (m.tag) toggleTag(p, m.i);
    else testFuse(p, m.i, rand);
  }

  reset();

  return {
    step(dt) {
      timer += dt;
      if (phase === 'play' && timer >= MOVE_MS) {
        timer = 0;
        move();
        if (p.status === 'won') { phase = 'fixed'; notches = 0; }
        return true;
      }
      if (phase === 'fixed') {
        // The gear turns one tooth at a time, slowly; the arrow rises with it.
        const n = Math.min(Math.floor(timer / NOTCH_MS), 4);
        if (timer >= FIXED_MS) { phase = 'scores'; timer = 0; return true; }
        if (n !== notches) { notches = n; return true; }
        return false;
      }
      if (phase === 'scores' && timer >= SCORES_MS) {
        reset();
        return true;
      }
      return false;
    },

    draw(ctx, w, h, c) {
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, w, h);
      if (phase === 'scores') return drawScores(ctx, w, h, c, scores(), formatTime);
      drawPanel(ctx, w, h, c, p, cursor);
      if (phase === 'fixed') drawNotchUp(ctx, w, h, c, notches, 'PANEL FIXED');
    },
  };
}

function drawPanel(ctx, w, h, c, p, cursor) {
  const size = Math.min(w, h) * 0.9;
  const cell = size / p.cols;
  const x0 = (w - size) / 2;
  const y0 = (h - size) / 2;
  const pad = Math.max(1, cell * 0.12);
  ctx.font = `bold ${Math.round(cell * 0.6)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(1, cell * 0.06);
  for (let i = 0; i < p.cells.length; i++) {
    const x = x0 + (i % p.cols) * cell;
    const y = y0 + Math.floor(i / p.cols) * cell;
    const s = p.cells[i];
    if (s === TESTED) {
      const k = p.count[i];
      if (k) {
        ctx.fillStyle = countColour(c, k);
        ctx.fillText(String(k), x + cell / 2, y + cell / 2 + 1);
      }
      continue;
    }
    ctx.strokeStyle = s === TAGGED ? c.gold : c.dim;
    ctx.strokeRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
    if (s === TAGGED) {
      ctx.fillStyle = c.gold;
      ctx.beginPath();
      ctx.moveTo(x + cell / 2, y + cell * 0.28);
      ctx.lineTo(x + cell * 0.72, y + cell * 0.7);
      ctx.lineTo(x + cell * 0.28, y + cell * 0.7);
      ctx.fill();
    }
  }
  // The player's cursor: a steady magenta frame, no glow, so nothing flashes.
  ctx.save();
  ctx.strokeStyle = c.magenta;
  ctx.lineWidth = Math.max(1.5, cell * 0.1);
  ctx.strokeRect(x0 + (cursor % p.cols) * cell + 1, y0 + Math.floor(cursor / p.cols) * cell + 1, cell - 2, cell - 2);
  ctx.restore();
}
