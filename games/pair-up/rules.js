// Pair Up's rules, with no DOM: a deck of face-down cards, two of each face. Turn two cards; a pair
// stays up, anything else turns back down and costs a chance. Three chances gone ends the run; every
// pair found wins. The deal is seeded, so tests and the hall's demo replay.

import { seeded } from '../../js/random.js';

export { seeded };

export const CHANCES = 3;
export const MISS_MS = 900;      // a wrong pair stays up this long before it turns back down
export const PAIR_POINTS = 100;
export const STREAK_POINTS = 50; // more for every pair found right after another
export const SPARE_POINTS = 150; // for every chance left when the last pair is found

/** The pictures from the other games: the logo, Patch Night's bug, Lob's bulb, Fuse Box's fuse, Notch Up's floor. */
export const SPRITES = ['logo', 'bug', 'bulb', 'fuse', 'floor'];
/** Letters that are hard to mix up with one another. */
export const LETTERS = [...'ABDEFGHKLNPRSTUXZ'];

// Pairs per level; the deck's shape follows the screen (a tall one for a phone held upright).
export const LEVELS = {
  easy: { pairs: 6, tall: [3, 4], wide: [4, 3], sprites: 3 },
  medium: { pairs: 8, tall: [4, 4], wide: [4, 4], sprites: 4 },
  hard: { pairs: 10, tall: [4, 5], wide: [5, 4], sprites: 5 },
};

// The cheers, by how many chances were left: the fewer, the more relieved. Praise word, then a dry line.
export const PRAISE = {
  flawless: ['Flawless', 'Spotless', 'No misses'],
  sharp: ['Sharp', 'Well played', 'Tidy'],
  close: ['Phew', 'Made it', 'Close one'],
};
export const QUIPS = {
  flawless: ['Nobody saw you peek.', 'The cards want a rematch.', 'Filing cabinet for a head.'],
  sharp: ['Mostly from memory.', 'One slip, no witnesses.', 'The cards are impressed.'],
  close: ['One chance was plenty.', 'Nerves of tin.', 'The cards blinked first.'],
};

/** A line from `list` picked at random, never the same as `previous`. */
export function pickLine(list, rand, previous = '') {
  const lines = list.filter((p) => p !== previous);
  return lines[Math.floor(rand() * lines.length)];
}

/** [columns, rows] of a level's deck: tall on a portrait screen, wide on a landscape one. */
export const shape = (level, portrait) => LEVELS[level][portrait ? 'tall' : 'wide'];

const shuffled = (list, rand) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** The faces of a level's deck, one each: its share of sprites, the rest letters. */
export function facesFor(level, rand) {
  const { pairs, sprites } = LEVELS[level];
  return [...shuffled(SPRITES, rand).slice(0, sprites), ...shuffled(LETTERS, rand).slice(0, pairs - sprites)];
}

/** A new run on `level`, dealt with `rand`. */
export function newGame(level, rand) {
  const faces = facesFor(level, rand);
  return {
    level,
    cards: shuffled([...faces, ...faces], rand).map((face) => ({ face, state: 'down' })),
    pairs: faces.length,
    found: 0,
    chances: CHANCES,
    streak: 0,
    score: 0,
    open: [],          // the cards turned up and not yet matched: none, one, or a wrong pair waiting to turn back
    status: 'playing', // 'won' when every pair is found, 'lost' when the chances are gone
    cheer: null,
    lastPraise: '',
    lastQuip: '',
    rand,
  };
}

/** Turn a wrong pair back down. */
export function settle(g) {
  for (const i of g.open) g.cards[i].state = 'down';
  g.open = [];
}

function cheerOf(g) {
  const size = g.chances === CHANCES ? 'flawless' : g.chances > 1 ? 'sharp' : 'close';
  const praise = pickLine(PRAISE[size], g.rand, g.lastPraise);
  const quip = pickLine(QUIPS[size], g.rand, g.lastQuip);
  g.lastPraise = praise;
  g.lastQuip = quip;
  return { size, praise, quip };
}

/**
 * Turn card `i` up. Returns { type: 'ignored' } when nothing happens (the run is over, the card is
 * already up or found), else { type: 'first' | 'match' | 'miss' | 'won' | 'lost' }. Turning a card
 * while a wrong pair is still showing turns that pair back down first, so one of those two can be
 * turned again at once.
 */
export function flip(g, i) {
  if (g.status !== 'playing' || !g.cards[i] || g.cards[i].state === 'matched') return { type: 'ignored' };
  if (g.open.length === 2) settle(g);
  if (g.cards[i].state !== 'down') return { type: 'ignored' };
  g.cards[i].state = 'up';
  g.open.push(i);
  if (g.open.length === 1) return { type: 'first' };

  const [a, b] = g.open;
  if (g.cards[a].face === g.cards[b].face) {
    g.cards[a].state = 'matched';
    g.cards[b].state = 'matched';
    g.open = [];
    g.found++;
    g.streak++;
    g.score += PAIR_POINTS + STREAK_POINTS * (g.streak - 1);
    if (g.found < g.pairs) return { type: 'match' };
    g.status = 'won';
    g.score += SPARE_POINTS * g.chances;
    g.cheer = cheerOf(g);
    return { type: 'won' };
  }
  g.chances--;
  g.streak = 0;
  if (g.chances > 0) return { type: 'miss' };
  g.status = 'lost';
  return { type: 'lost' };
}

/** The picture or letter a card shows, for a screen reader. */
export const nameOf = (face) => ({ logo: 'Notchup logo', bug: 'bug', bulb: 'bulb', fuse: 'fuse', floor: 'floor' }[face] ?? `letter ${face}`);
