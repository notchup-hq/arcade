// Where everything sits on Night Deal's table, and what is under a finger. Pure geometry, so the page,
// the hall's demo and the tests share it. The table is one row of seven cells: the draw pile, the
// discard pile (which fans out over the next cell when three cards are turned at a time), the undo
// slot and the four stacks; below it the seven columns, each fanned down by as much as fits.

import { COLUMNS, PILES, accepts, cardsAt, place } from './rules.js';

const ASPECT = 1.4;       // card height over width
const MAX_WIDTH = 104;
const DOWN_FLOOR = 4;     // how little of a face-down card shows at the very least

/** What the page asks for: text of 16 px or more, cards at least 30 px wide, room for a run of 13. The hall's little screen asks for less. */
export const PAGE = { floor: 16, minWidth: 30, run: 12 };

/** The text size of a card's corner: the floor on a phone, bigger on a big card. */
const fontFor = (cw, floor) => Math.min(26, Math.max(floor, Math.round(cw * 0.3)));
const gapFor = (w) => (w < 400 ? 4 : w < 800 ? 6 : 10);

/** The height a table needs at card width `cw` when its tallest column (6 cards down, then the run) is squeezed as far as it goes. */
const tallest = (cw, gap, { floor, run }) => {
  const ch = Math.round(cw * ASPECT);
  return gap + ch + gap * 2 + ch + 6 * DOWN_FLOOR + run * (fontFor(cw, floor) + 1) + gap;
};

/**
 * The table for a state `g` in a `w` by `h` box, sized to what `want` asks for (PAGE unless the caller is a small picture). `cards` lists every card to draw, bottom of each pile
 * first, so later ones are on top. `slots` has each pile's first place (where an empty pile shows its
 * outline) and `undo` the undo slot; `reach` is the room each pile takes up, the area a card dropped
 * on it counts for.
 */
export function layout(w, h, g, want = PAGE) {
  const gap = gapFor(w);
  const pad = gap + 2;
  let cw = Math.min(MAX_WIDTH, Math.floor((w - 2 * pad - 6 * gap) / COLUMNS));
  while (cw > want.minWidth && tallest(cw, gap, want) > h) cw--;
  const ch = Math.round(cw * ASPECT);
  const font = fontFor(cw, want.floor);
  const fanLeft = Math.round(cw * 0.14);
  const left = Math.round((w - COLUMNS * cw - 6 * gap) / 2);
  const cellX = (i) => left + i * (cw + gap);
  const rowTwo = gap + ch + gap * 2;
  const slots = {};
  const reach = {};
  const cards = [];
  const rect = (x, y) => ({ x, y, w: cw, h: ch });

  slots.s = rect(cellX(0), gap);
  slots.w = rect(cellX(1), gap);
  for (let k = 0; k < 4; k++) slots[`f${k}`] = rect(cellX(3 + k), gap);
  for (let i = 0; i < COLUMNS; i++) slots[`c${i}`] = rect(cellX(i), rowTwo);
  // The undo slot starts after what the discard pile's fan can reach.
  const inset = Math.max(0, 2 * fanLeft - gap);
  const undo = { x: cellX(2) + inset, y: gap, w: cw - inset, h: ch };

  const put = (card, pile, i, x, y, up) => cards.push({ id: card.id, pile, i, x, y, up });
  // Only what shows is listed: the back of the draw pile, the top of each stack, the last few cards
  // of the discard pile (a fan of drawBy), and the whole of each column.
  if (g.stock.length) put(g.stock.at(-1), 's', g.stock.length - 1, slots.s.x, slots.s.y, false);
  g.waste.slice(-g.drawBy).forEach((card, row, shown) => {
    put(card, 'w', g.waste.length - shown.length + row, slots.w.x + row * fanLeft, slots.w.y, true);
  });
  g.found.forEach((n, k) => {
    if (n) put({ id: k * 13 + n - 1 }, `f${k}`, n - 1, slots[`f${k}`].x, slots[`f${k}`].y, true);
  });
  reach.s = slots.s;
  reach.w = { ...slots.w, w: cw + 2 * fanLeft };
  for (let k = 0; k < 4; k++) reach[`f${k}`] = slots[`f${k}`];

  const room = h - gap - rowTwo - ch;
  g.cols.forEach((col, i) => {
    const down = col.down.length;
    const ups = col.up.length;
    let fd = Math.round(font * 0.4);
    let fu = Math.round(font * 1.4);
    const span = () => down * fd + Math.max(0, ups - 1) * fu;
    if (span() > room && ups > 1) fu = Math.max(font + 1, Math.floor((room - down * fd) / (ups - 1)));
    if (span() > room && down) fd = Math.max(DOWN_FLOOR, Math.floor((room - Math.max(0, ups - 1) * fu) / down));
    const x = cellX(i);
    let y = rowTwo;
    col.down.forEach((card, k) => { put(card, `c${i}`, k, x, y, false); y += fd; });
    col.up.forEach((card, k) => { put(card, `c${i}`, down + k, x, y, true); y += fu; });
    reach[`c${i}`] = { x, y: rowTwo, w: cw, h: span() + ch };
  });
  return { w, h, cw, ch, font, gap, slots, undo, reach, cards };
}

const inside = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/**
 * What is at the point (x, y): { pile, n } where n is how many cards a finger there lifts (the face-up
 * card touched and those on top of it in a column; one from the discard pile or a stack; 1 on the draw
 * pile), 0 for a pile's empty place or a face-down card; { pile: 'u' } for the undo slot; null for
 * nothing.
 */
export function hit(lay, g, x, y) {
  if (inside(lay.undo, x, y)) return { pile: 'u', n: 0 };
  for (let k = lay.cards.length - 1; k >= 0; k--) {
    const c = lay.cards[k];
    if (!inside({ x: c.x, y: c.y, w: lay.cw, h: lay.ch }, x, y)) continue;
    if (c.pile[0] === 'c') {
      const col = g.cols[place(c.pile)];
      return { pile: c.pile, n: c.up ? col.up.length - (c.i - col.down.length) : 0 };
    }
    return { pile: c.pile, n: 1 };
  }
  for (const pile of PILES) if (inside(lay.slots[pile], x, y)) return { pile, n: 0 };
  return null;
}

/**
 * The pile a run dropped with its top-left corner at (x, y) lands on: of the stacks and columns that
 * accept it, the one its card overlaps most, or null when it overlaps none by a fifth of a card.
 */
export function dropTarget(lay, g, { pile, n }, x, y) {
  const cards = cardsAt(g, pile, n);
  if (!cards) return null;
  let best = null;
  let most = lay.cw * lay.ch * 0.2;
  for (const to of PILES.filter((p) => p[0] === 'f' || p[0] === 'c')) {
    if (to === pile || !accepts(g, to, cards)) continue;
    const r = to[0] === 'c' ? lay.reach[to] : lay.slots[to];
    // A column takes a card at its end, so what counts is the room at the end, not the whole fan.
    const end = to[0] === 'c' ? { ...r, y: r.y + r.h - lay.ch, h: lay.ch } : r;
    const overlap = Math.max(0, Math.min(x + lay.cw, end.x + end.w) - Math.max(x, end.x))
      * Math.max(0, Math.min(y + lay.ch, end.y + end.h) - Math.max(y, end.y));
    if (overlap > most) { most = overlap; best = to; }
  }
  return best;
}

/** The rectangle the top `n` cards of `pile` cover (a run in a column, the card on top elsewhere), or the pile's empty place. */
export function runRect(lay, pile, n = 1) {
  const mine = lay.cards.filter((c) => c.pile === pile);
  const last = mine.at(-1);
  if (!last) return lay.slots[pile];
  const first = mine[Math.max(0, mine.length - n)];
  return { x: first.x, y: first.y, w: lay.cw, h: last.y - first.y + lay.ch };
}
