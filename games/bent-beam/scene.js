// Bent Beam's picture, shared by the page and the hall's demo: the lamp housing in a gutter on the left,
// the grid to its right, the beam over it, mirrors and lamps on top. A lamp is a small gear, the Notchup
// mark's shape: outlined when it waits, filled when it is lit. A mirror is gold when it turns and white
// with rivets when it is bolted down, so colour is never the only difference. Drawn only when something changed.

import { BACK, SLASH, WALL, isLit } from './rules.js';

/** The size of a cell and where the grid starts, for a `w` by `h` picture of a board `size` cells wide. */
export function layout(w, h, size) {
  const cell = Math.floor(Math.min(w / (size + 1), h / size));
  return { cell, x: Math.round((w - (size + 1) * cell) / 2) + cell, y: Math.round((h - size * cell) / 2) };
}

function drawGrid(ctx, { cell, x, y }, g, c) {
  ctx.strokeStyle = c.dim;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= g.size; k++) {
    ctx.moveTo(x + k * cell + 0.5, y);
    ctx.lineTo(x + k * cell + 0.5, y + g.size * cell);
    ctx.moveTo(x, y + k * cell + 0.5);
    ctx.lineTo(x + g.size * cell, y + k * cell + 0.5);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.dim;
  g.cells.forEach((kind, i) => {
    if (kind !== WALL) return;
    ctx.fillRect(x + (i % g.size) * cell + 2, y + Math.floor(i / g.size) * cell + 2, cell - 3, cell - 3);
  });
}

function drawHousing(ctx, { cell, x, y }, g, c) {
  const top = y + g.row * cell;
  ctx.fillStyle = c.cyan;
  ctx.fillRect(x - cell * 0.9, top + cell * 0.25, cell * 0.65, cell * 0.5);
  ctx.beginPath();
  ctx.moveTo(x - cell * 0.25, top + cell * 0.25);
  ctx.lineTo(x - cell * 0.05, top + cell * 0.5);
  ctx.lineTo(x - cell * 0.25, top + cell * 0.75);
  ctx.fill();
}

const runLength = ([x0, y0, x1, y1]) => Math.abs(x1 - x0) + Math.abs(y1 - y0);

/** How far the beam goes in all, in cells. */
export const beamLength = (g) => g.beam.runs.reduce((n, r) => n + runLength(r), 0);

/** The beam's runs cut off `head` cells from the housing (the whole beam for Infinity). */
function upTo(runs, head) {
  const out = [];
  let left = head;
  for (const r of runs) {
    if (left <= 0) break;
    const len = runLength(r);
    const t = Math.min(1, left / len);
    out.push([r[0], r[1], r[0] + (r[2] - r[0]) * t, r[1] + (r[3] - r[1]) * t]);
    left -= len;
  }
  return out;
}

/** How far along the beam the middle of cell `i` is, in cells; Infinity if the beam never crosses it. */
export function reach(g, i) {
  const px = (i % g.size) + 0.5;
  const py = Math.floor(i / g.size) + 0.5;
  let along = 0;
  for (const r of g.beam.runs) {
    const [x0, y0, x1, y1] = r;
    const on = y0 === y1 ? py === y0 && px >= Math.min(x0, x1) && px <= Math.max(x0, x1) : px === x0 && py >= Math.min(y0, y1) && py <= Math.max(y0, y1);
    if (on) return along + Math.abs(px - x0) + Math.abs(py - y0);
    along += runLength(r);
  }
  return Infinity;
}

function strokeRuns(ctx, { cell, x, y }, runs, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(2, cell * 0.08);
  ctx.lineCap = 'round';
  ctx.shadowColor = colour;
  ctx.shadowBlur = cell * 0.3;
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of runs) {
    ctx.moveTo(x + x0 * cell, y + y0 * cell);
    ctx.lineTo(x + x1 * cell, y + y1 * cell);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/** The beam in cyan; once won it is gold, and while the win runs a gold front travels over the cyan from the housing to `head`. */
function drawBeam(ctx, at, g, c, head) {
  const running = head < Infinity;
  const runs = drawnRuns(g);
  strokeRuns(ctx, at, runs, g.status === 'won' && !running ? c.gold : c.cyan);
  if (running) strokeRuns(ctx, at, upTo(runs, head), c.gold);
}

const SOCKET = 0.2; // the end dot's radius when lit, in cells

/** The beam's runs with the last one stopped a dot's radius short of the board's edge or the wall, so the end dot shows whole. */
function drawnRuns(g) {
  const [x0, y0, x1, y1] = g.beam.runs[g.beam.runs.length - 1];
  const ex = Math.min(g.size, Math.max(0, x1));
  const ey = Math.min(g.size, Math.max(0, y1));
  const len = Math.abs(ex - x0) + Math.abs(ey - y0);
  const back = Math.min(SOCKET, len);
  const end = [ex - Math.sign(ex - x0) * back, ey - Math.sign(ey - y0) * back];
  return [...g.beam.runs.slice(0, -1), [x0, y0, ...end]];
}

/** Where the beam ends: a dot in a socket at the board's edge or on the wall it hits. Gold once the won beam has reached it. */
function drawEnd(ctx, { cell, x, y }, g, c, head) {
  const [, , ex, ey] = drawnRuns(g).at(-1);
  const lit = g.status === 'won' && head >= beamLength(g);
  ctx.fillStyle = lit ? c.gold : c.cyan;
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = cell * (lit ? 0.5 : 0.25);
  ctx.beginPath();
  ctx.arc(x + ex * cell, y + ey * cell, cell * (lit ? SOCKET : 0.12), 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/** A short circuit: a red cross, filled and glowing while the beam crosses it. */
function drawShort(ctx, { cell, x, y }, g, c, i) {
  const cx = x + ((i % g.size) + 0.5) * cell;
  const cy = y + (Math.floor(i / g.size) + 0.5) * cell;
  const r = cell * 0.2;
  ctx.strokeStyle = c.red;
  ctx.lineWidth = Math.max(3, cell * 0.09);
  ctx.lineCap = 'round';
  if (g.beam.crossed.has(i)) {
    ctx.fillStyle = c.red;
    ctx.shadowColor = c.red;
    ctx.shadowBlur = cell * 0.4;
    ctx.fillRect(cx - r * 1.4, cy - r * 1.4, r * 2.8, r * 2.8);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = c.bg;
  }
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r);
  ctx.lineTo(cx + r, cy + r);
  ctx.moveTo(cx + r, cy - r);
  ctx.lineTo(cx - r, cy + r);
  ctx.stroke();
}

function drawMirror(ctx, { cell, x, y }, g, c, i) {
  const cx = x + (i % g.size) * cell;
  const cy = y + Math.floor(i / g.size) * cell;
  const [a, b] = g.cells[i] === SLASH ? [[0.2, 0.8], [0.8, 0.2]] : [[0.2, 0.2], [0.8, 0.8]];
  const bolted = g.fixed[i] === 1;
  ctx.strokeStyle = bolted ? c.ink : c.gold;
  ctx.lineWidth = Math.max(3, cell * 0.11);
  ctx.beginPath();
  ctx.moveTo(cx + a[0] * cell, cy + a[1] * cell);
  ctx.lineTo(cx + b[0] * cell, cy + b[1] * cell);
  ctx.stroke();
  if (!bolted) return;
  ctx.fillStyle = c.bg;
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2;
  for (const [px, py] of [a, b]) {
    ctx.beginPath();
    ctx.arc(cx + px * cell, cy + py * cell, cell * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

const TEETH = 8;

/** A small gear (the Notchup mark's shape) around (cx, cy): `r` to the tips of its teeth. */
function gearPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let k = 0; k < TEETH * 2; k++) {
    const a = (k * Math.PI) / TEETH - Math.PI / 2;
    const rim = k % 2 === 0 ? r : r * 0.78;
    ctx.lineTo(cx + Math.cos(a) * rim, cy + Math.sin(a) * rim);
    ctx.lineTo(cx + Math.cos(a + Math.PI / (TEETH * 2)) * rim, cy + Math.sin(a + Math.PI / (TEETH * 2)) * rim);
  }
  ctx.closePath();
}

function drawLamp(ctx, { cell, x, y }, g, c, i) {
  const cx = x + ((i % g.size) + 0.5) * cell;
  const cy = y + (Math.floor(i / g.size) + 0.5) * cell;
  gearPath(ctx, cx, cy, cell * 0.3);
  if (isLit(g, i)) {
    ctx.fillStyle = c.green;
    ctx.shadowColor = c.green;
    ctx.shadowBlur = cell * 0.4;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = c.green;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * Draw board `g` on a `w` by `h` picture in the neon colours `c`; `mark` is a cell to ring (the demo's
 * finger). While the win runs, `head` is how far the gold front has travelled along the beam.
 */
export function drawBoard(ctx, w, h, c, g, mark = -1, head = Infinity) {
  const at = layout(w, h, g.size);
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, at, g, c);
  drawHousing(ctx, at, g, c);
  drawBeam(ctx, at, g, c, head);
  drawEnd(ctx, at, g, c, head);
  g.shorts.forEach((i) => drawShort(ctx, at, g, c, i));
  g.lamps.forEach((i) => drawLamp(ctx, at, g, c, i));
  g.cells.forEach((kind, i) => { if (kind === SLASH || kind === BACK) drawMirror(ctx, at, g, c, i); });
  if (mark < 0) return;
  ctx.strokeStyle = c.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(at.x + (mark % g.size) * at.cell + 3, at.y + Math.floor(mark / g.size) * at.cell + 3, at.cell - 6, at.cell - 6);
}
