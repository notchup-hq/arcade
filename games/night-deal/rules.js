// Night Deal's rules: the seven-column patience, with no DOM, so the page, the hall's demo and the tests
// share them. A state is plain data and every move returns a new one, which is what undo and the
// solver need.
//
// Piles have ids: 's' the draw pile, 'w' the discard pile, 'f0'..'f3' the four stacks (one per suit,
// in SUITS order), 'c0'..'c6' the columns. A column is { down, up }: its face-down cards, and its
// face-up run, always a valid descending run of alternating colours, the last card on top. Every pile
// lists its top card last. A move is { from, to, n }: n cards from a pile to another; dealing a card
// from the draw pile (or turning the discard pile over when the draw pile is empty) is from 's'.

import { seeded } from '../../js/random.js';
import { shuffled } from '../../js/shuffle.js';
import { WINNABLE } from './deals.js';

export { seeded };

export const LEVELS = { 'draw-1': { drawBy: 1 }, 'draw-3': { drawBy: 3 } };
export const SUITS = ['spades', 'clubs', 'hearts', 'diamonds'];
export const RANKS = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
export const COLUMNS = 7;
export const STACKS = SUITS.map((_, k) => `f${k}`);
export const COLUMN_IDS = Array.from({ length: COLUMNS }, (_, i) => `c${i}`);
export const PILES = ['s', 'w', ...STACKS, ...COLUMN_IDS];

/** Every card once, by id (suit * 13 + rank - 1), shared by all states. */
export const CARDS = Array.from({ length: 52 }, (_, id) => ({ id, suit: Math.floor(id / 13), rank: (id % 13) + 1 }));

export const isRed = (card) => card.suit >= 2;
export const nameOf = (card) => `${RANKS[card.rank - 1]} of ${SUITS[card.suit]}`;
export const place = (pile) => Number(pile.slice(1));

const clone = (g) => ({
  ...g,
  cols: g.cols.map((c) => ({ down: c.down.slice(), up: c.up.slice() })),
  stock: g.stock.slice(),
  waste: g.waste.slice(),
  found: g.found.slice(),
});

/** A new deal for `level`: column i gets i face-down cards and one face up, the other 24 are the draw pile. */
export function newGame(level, rand) {
  const deck = shuffled(CARDS, rand);
  let at = 0;
  const cols = Array.from({ length: COLUMNS }, (_, i) => {
    const down = deck.slice(at, at + i);
    const up = [deck[at + i]];
    at += i + 1;
    return { down, up };
  });
  return { level, drawBy: LEVELS[level].drawBy, cols, stock: deck.slice(at).reverse(), waste: [], found: [0, 0, 0, 0] };
}

/** The `n` top cards of `pile` as a run (bottom first), or null when it has no such run to lift. */
export function cardsAt(g, pile, n = 1) {
  const i = place(pile);
  switch (pile[0]) {
    case 'w': return n === 1 && g.waste.length ? [g.waste.at(-1)] : null;
    case 'f': return n === 1 && g.found[i] ? [CARDS[i * 13 + g.found[i] - 1]] : null;
    case 'c': return n >= 1 && n <= g.cols[i].up.length ? g.cols[i].up.slice(-n) : null;
    default: return null;
  }
}

/** Whether `cards` (a run, bottom first) may be put on `pile`: a stack takes its suit's next card, a column an opposite colour one rank lower, or a king when empty. */
export function accepts(g, pile, cards) {
  const i = place(pile);
  const first = cards[0];
  if (pile[0] === 'f') return cards.length === 1 && first.suit === i && first.rank === g.found[i] + 1;
  if (pile[0] !== 'c') return false;
  const top = g.cols[i].up.at(-1);
  if (!top) return first.rank === 13;
  return first.rank === top.rank - 1 && isRed(first) !== isRed(top);
}

export function canMove(g, { from, to, n = 1 }) {
  if (from === to) return false;
  const cards = cardsAt(g, from, n);
  return cards !== null && accepts(g, to, cards);
}

export const canDeal = (g) => g.stock.length > 0 || g.waste.length > 0;

/** Turn the next `drawBy` cards of the draw pile over onto the discard pile, or the discard pile back over when it is empty. */
function deal(g) {
  const next = clone(g);
  if (next.stock.length === 0) {
    next.stock = next.waste.reverse();
    next.waste = [];
  } else {
    for (let k = 0; k < next.drawBy && next.stock.length; k++) next.waste.push(next.stock.pop());
  }
  return next;
}

/** The state after `move`, or null when it is not allowed. */
export function play(g, move) {
  if (move.from === 's') return canDeal(g) ? deal(g) : null;
  if (!canMove(g, move)) return null;
  const { from, to, n = 1 } = move;
  const next = clone(g);
  const cards = cardsAt(next, from, n);
  if (from[0] === 'w') next.waste.pop();
  else if (from[0] === 'f') next.found[place(from)]--;
  else {
    const col = next.cols[place(from)];
    col.up.length -= n;
    if (!col.up.length && col.down.length) col.up.push(col.down.pop());
  }
  if (to[0] === 'f') next.found[place(to)]++;
  else next.cols[place(to)].up.push(...cards);
  return next;
}

export const isWon = (g) => g.found.every((n) => n === 13);

/** Every card face up and nothing left to draw: the rest is just moving cards to the stacks, so the win is certain. */
export const canFinish = (g) => g.stock.length === 0 && g.waste.length === 0 && g.cols.every((c) => c.down.length === 0);

/** The move that plays the next card onto its stack once `canFinish`: a column's top card that fits. */
export function finishMove(g) {
  for (let i = 0; i < COLUMNS; i++) {
    const top = g.cols[i].up.at(-1);
    if (top && top.rank === g.found[top.suit] + 1) return { from: `c${i}`, to: `f${top.suit}`, n: 1 };
  }
  return null;
}

const SOURCES = ['w', ...COLUMN_IDS];
const TARGETS = [...STACKS, ...COLUMN_IDS];

/**
 * Every move worth considering: cards from the discard pile or a column to a stack or a column, and the
 * deal; with `back`, also a card taken back off a stack. Carrying a king's whole column to an empty
 * one is left out, since it changes nothing.
 */
export function legalMoves(g, back = false) {
  const out = [];
  for (const from of back ? [...SOURCES, ...STACKS] : SOURCES) {
    const col = from[0] === 'c' ? g.cols[place(from)] : null;
    const most = col ? col.up.length : cardsAt(g, from) ? 1 : 0;
    for (let n = 1; n <= most; n++) {
      const cards = cardsAt(g, from, n);
      for (const to of TARGETS) {
        if (to === from || !accepts(g, to, cards)) continue;
        const idle = col && n === col.up.length && col.down.length === 0 && cards[0].rank === 13;
        if (!idle) out.push({ from, to, n });
      }
    }
  }
  if (canDeal(g)) out.push({ from: 's', to: 'w', n: 1 });
  return out;
}

/** A move that gets somewhere for good: a card to a stack, a card off the discard pile, or a column's whole run moved (which turns a card over or empties the column). */
export function isProgress(g, { from, to, n }) {
  if (from === 's' || from[0] === 'f') return false;
  return to[0] === 'f' || from === 'w' || n === g.cols[place(from)].up.length;
}

const ids = (cards) => cards.map((c) => String.fromCharCode(48 + c.id)).join('');

/** The position as text, ignoring how it was reached, to tell when a search is back where it was. */
export const positionKey = (g) =>
  `${g.cols.map((c) => `${c.down.length}${ids(c.up)}`).join('|')}/${ids(g.stock)}/${ids(g.waste)}/${g.found.join(',')}`;

const STUCK_LOOK = 3000;

/**
 * No moves left: nothing the player can do, however the draw pile turns, the columns shift and cards
 * come back off the stacks, gets a card to a stack, off the discard pile or a column turned over. It looks through every position
 * those moves lead to (up to a limit, past which it says "not stuck"), so it never claims it by guess.
 */
export function isStuck(g) {
  const seen = new Set([positionKey(g)]);
  const todo = [g];
  while (todo.length) {
    const here = todo.pop();
    for (const move of legalMoves(here, true)) {
      if (isProgress(here, move)) return false;
      const next = play(here, move);
      const key = positionKey(next);
      if (seen.has(key)) continue;
      if (seen.size >= STUCK_LOOK) return false;
      seen.add(key);
      todo.push(next);
    }
  }
  return true;
}

/**
 * What a tap on `pile` does with its top `n` cards: a single card goes to its stack if it fits,
 * otherwise to the column that hides the fewest face-down cards (the leftmost of equals), so a hidden
 * card is not buried. The draw pile deals. Null when nothing fits.
 */
export function bestMove(g, pile, n = 1) {
  if (pile === 's') return canDeal(g) ? { from: 's', to: 'w', n: 1 } : null;
  const cards = cardsAt(g, pile, n);
  if (!cards || pile[0] === 'f') return null;
  const fits = TARGETS.filter((to) => to !== pile && accepts(g, to, cards));
  const stack = fits.find((to) => to[0] === 'f');
  if (stack) return { from: pile, to: stack, n };
  const best = fits.reduce((a, b) => (a && g.cols[place(a)].down.length <= g.cols[place(b)].down.length ? a : b), null);
  return best && { from: pile, to: best, n };
}

/** A move as a few characters ("c2c5x3", "wf0", "sw"), for a recorded game. */
export const moveText = ({ from, to, n }) => `${from}${to}${n > 1 ? `x${n}` : ''}`;

/** The move `moveText` wrote. */
export function parseMove(text) {
  const [, from, to, n] = /^(s|w|[fc]\d)(s|w|[fc]\d)(?:x(\d+))?$/.exec(text);
  return { from, to, n: n ? Number(n) : 1 };
}

let winnable;

/** Every seed deals.js lists, in order. */
function winnableSeeds() {
  const bytes = atob(WINNABLE);
  const seeds = [];
  for (let seed = 0; seed < bytes.length * 8; seed++) {
    if ((bytes.charCodeAt(seed >> 3) >> (seed & 7)) & 1) seeds.push(seed);
  }
  return seeds;
}

/** The seed of a deal that can be won, picked with `rand`. */
export function winnableSeed(rand) {
  winnable ??= winnableSeeds();
  return winnable[Math.floor(rand() * winnable.length)];
}
