// Fuse Box rules, with no DOM: the game page and the hall's attract mode both play by them.
//
// A panel is a grid of fuses; some are blown. Testing a good fuse lights it and shows how many of its
// (up to eight) neighbours are blown. Testing a blown one sparks and the panel goes dark. Tag the fuses
// you think are blown; test every good one to fix the panel. The first test is always safe, and so
// are its neighbours, because the blown fuses are placed only after it.

import { seeded } from '../../js/random.js';

// Sizes for a landscape screen; on a portrait screen (most phones) the panel turns, see shaped().
export const LEVELS = {
  easy: { cols: 8, rows: 8, blown: 10 },
  medium: { cols: 13, rows: 9, blown: 22 },
  hard: { cols: 18, rows: 10, blown: 40 },
};

/** A level shaped for the screen: on a portrait screen columns and rows swap, so cells stay big. */
export const shaped = (level, portrait) => (portrait && level.cols > level.rows
  ? { ...level, cols: level.rows, rows: level.cols }
  : level);

export const UNTESTED = 0;
export const TESTED = 1;
export const TAGGED = 2;

export { seeded };

/** A fresh panel. status: 'ready' (nothing tested), 'playing', 'won' or 'lost'. */
export function newPanel({ cols, rows, blown }) {
  const n = cols * rows;
  return {
    cols, rows, blown,
    cells: new Uint8Array(n),   // UNTESTED, TESTED or TAGGED
    isBlown: new Uint8Array(n), // 1 for a blown fuse, set on the first test
    count: new Uint8Array(n),   // blown neighbours
    tested: 0,
    tags: 0,
    status: 'ready',
    sparked: -1,                // the blown fuse that was tested, after a loss
  };
}

/** The indices of the cells around `i`. */
export function around(p, i) {
  const x = i % p.cols;
  const y = (i - x) / p.cols;
  const out = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < p.cols && ny < p.rows) out.push(ny * p.cols + nx);
    }
  }
  return out;
}

/** Place the blown fuses anywhere but `safe` and around it (fewer free cells: only `safe` itself). */
function place(p, safe, rand) {
  const keepOut = new Set([safe, ...around(p, safe)]);
  if (p.cols * p.rows - keepOut.size < p.blown) keepOut.clear();
  keepOut.add(safe);
  const free = [];
  for (let i = 0; i < p.cols * p.rows; i++) if (!keepOut.has(i)) free.push(i);
  // A partial Fisher–Yates shuffle: the first `blown` cells of `free` are the blown fuses.
  for (let k = 0; k < p.blown; k++) {
    const j = k + Math.floor(rand() * (free.length - k));
    [free[k], free[j]] = [free[j], free[k]];
    p.isBlown[free[k]] = 1;
  }
  for (let i = 0; i < p.isBlown.length; i++) {
    let c = 0;
    for (const j of around(p, i)) c += p.isBlown[j];
    p.count[i] = c;
  }
}

const goodTotal = (p) => p.cols * p.rows - p.blown;

/**
 * Test fuse `i`. A tested fuse with as many tags around it as blown neighbours tests the rest of its
 * neighbours in one go. Returns the indices whose look changed (empty when nothing happened).
 */
export function testFuse(p, i, rand = Math.random) {
  if (p.status === 'won' || p.status === 'lost') return [];
  if (p.status === 'ready') {
    place(p, i, rand);
    p.status = 'playing';
  }
  if (p.cells[i] === TAGGED) return [];
  if (p.cells[i] === TESTED) return chord(p, i);
  return light(p, [i]);
}

/** Light the fuses in `start`, spreading over every fuse with no blown neighbours. */
function light(p, start) {
  const changed = [];
  const queue = [...start];
  while (queue.length) {
    const i = queue.pop();
    if (p.cells[i] !== UNTESTED) continue;
    if (p.isBlown[i]) {
      p.status = 'lost';
      p.sparked = i;
      // Every blown fuse shows, and so does every wrong tag.
      for (let j = 0; j < p.cells.length; j++) if (p.isBlown[j] || p.cells[j] === TAGGED) changed.push(j);
      return changed;
    }
    p.cells[i] = TESTED;
    p.tested++;
    changed.push(i);
    if (p.count[i] === 0) for (const j of around(p, i)) if (p.cells[j] === UNTESTED) queue.push(j);
  }
  if (p.tested === goodTotal(p)) {
    p.status = 'won';
    // Tag what is left, so the fixed panel shows every blown fuse found.
    for (let j = 0; j < p.cells.length; j++) {
      if (p.cells[j] === UNTESTED) { p.cells[j] = TAGGED; p.tags++; changed.push(j); }
    }
  }
  return changed;
}

function chord(p, i) {
  const next = around(p, i);
  const tags = next.filter((j) => p.cells[j] === TAGGED).length;
  if (p.count[i] === 0 || tags !== p.count[i]) return [];
  return light(p, next.filter((j) => p.cells[j] === UNTESTED));
}

/** Tag or untag fuse `i`. Returns true when it changed. */
export function toggleTag(p, i) {
  if (p.status !== 'playing' && p.status !== 'ready') return false;
  if (p.cells[i] === TESTED) return false;
  const tagging = p.cells[i] === UNTESTED;
  p.cells[i] = tagging ? TAGGED : UNTESTED;
  p.tags += tagging ? 1 : -1;
  return true;
}

/** Blown fuses not tagged yet, as the counter shows it (negative when there are too many tags). */
export const fusesLeft = (p) => p.blown - p.tags;
