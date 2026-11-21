// Fuse Box in attract mode: the hall's cabinet screen plays a small panel by the real rules, shows
// the gear notching up when the panel is fixed, then this browser's hall of fame, and starts over.
// The demo cheats (it knows where the blown fuses are), so it never loses and always looks clever.

import { drawGear, NOTCH_STEP } from '../../js/gear.js';
import { formatTime } from '../../js/scores.js';
import { LEVELS, TAGGED, TESTED, UNTESTED, around, newPanel, seeded, testFuse, toggleTag } from './rules.js';

const MOVE_MS = 330;
const FIXED_MS = 2400;
const SCORES_MS = 3600;
const NOTCH_MS = 200;
const FONT = 'ui-monospace, Menlo, Consolas, monospace';

/** The colour of a count, from calm cyan for 1 to hot red for 5 and up. */
export const countColour = (c, k) => [c.ink, c.cyan, c.green, c.gold, c.magenta, c.red][Math.min(k, 5)];

/** The next move a perfect player would make: tag a known blown fuse, else test a good one next to the lit area. */
function nextMove(p, rand) {
  const frontier = [];
  for (let i = 0; i < p.cells.length; i++) {
    if (p.cells[i] !== UNTESTED) continue;
    if (around(p, i).some((j) => p.cells[j] === TESTED)) frontier.push(i);
  }
  const pool = frontier.length ? frontier : [...p.cells.keys()].filter((i) => p.cells[i] === UNTESTED);
  const pick = pool[Math.floor(rand() * pool.length)];
  return { i: pick, tag: p.isBlown[pick] === 1 };
}

/** @param {{ scores: () => Array<{ initials: string, value: number }> }} source the hall of fame to show */
export function createDemo({ scores, seed = 7 }) {
  const rand = seeded(seed);
  let p;
  let phase;
  let timer;
  let cursor;
  let turn = 0;

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
    const m = nextMove(p, rand);
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
        if (p.status === 'won') phase = 'fixed';
        return true;
      }
      if (phase === 'fixed') {
        // The gear clicks up one notch at a time.
        const notches = Math.min(Math.floor(timer / NOTCH_MS), 360 / NOTCH_STEP);
        if (notches * NOTCH_STEP !== turn % 360 || timer >= FIXED_MS) {
          turn = notches * NOTCH_STEP;
          if (timer >= FIXED_MS) { phase = 'scores'; timer = 0; turn = 0; }
          return true;
        }
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
      if (phase === 'scores') return drawScores(ctx, w, h, c, scores());
      drawPanel(ctx, w, h, c, p, cursor);
      if (phase === 'fixed') drawFixed(ctx, w, h, c, turn);
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
  // The player's cursor, in magenta neon: the one glow per frame.
  ctx.save();
  ctx.shadowColor = c.magenta;
  ctx.shadowBlur = cell * 0.5;
  ctx.strokeStyle = c.magenta;
  ctx.lineWidth = Math.max(1.5, cell * 0.1);
  ctx.strokeRect(x0 + (cursor % p.cols) * cell + 1, y0 + Math.floor(cursor / p.cols) * cell + 1, cell - 2, cell - 2);
  ctx.restore();
}

function drawFixed(ctx, w, h, c, turn) {
  ctx.fillStyle = 'rgb(5 10 20 / 0.72)';
  ctx.fillRect(0, 0, w, h);
  const r = Math.min(w, h) * 0.2;
  ctx.save();
  ctx.shadowColor = c.gold;
  ctx.shadowBlur = r * 0.4;
  drawGear(ctx, { x: w / 2, y: h * 0.42, r, turn, fill: c.gold });
  ctx.restore();
  ctx.fillStyle = c.gold;
  ctx.font = `bold ${Math.round(Math.min(w, h) * 0.09)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PANEL FIXED', w / 2, h * 0.78);
}

function drawScores(ctx, w, h, c, table) {
  const line = Math.min(h / 9, w / 12);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = c.cyan;
  ctx.font = `bold ${Math.round(line * 0.8)}px ${FONT}`;
  ctx.fillText('HALL OF FAME', w / 2, line * 1.3);
  ctx.font = `bold ${Math.round(line * 0.62)}px ${FONT}`;
  if (!table.length) {
    ctx.fillStyle = c.ink;
    ctx.fillText('NO SCORES YET', w / 2, h / 2);
    ctx.fillStyle = c.gold;
    ctx.fillText('BE THE FIRST', w / 2, h / 2 + line);
    return;
  }
  table.slice(0, 5).forEach((e, k) => {
    const y = line * (3 + k * 1.15);
    ctx.fillStyle = k === 0 ? c.gold : c.ink;
    ctx.textAlign = 'left';
    ctx.fillText(`${k + 1}. ${e.initials}`, w * 0.2, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatTime(e.value), w * 0.8, y);
  });
}
