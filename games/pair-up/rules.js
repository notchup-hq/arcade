// Pair Up's rules, with no DOM: a deck of face-down cards, two of each face. Turn two cards; a pair
// stays up, anything else turns back down and costs a chance, and every pair found lights one chance
// back (up to the level's own number: 4, 5 or 6), and a cleared deck lights a few more (clearBack). A deck with every pair found is a round cleared: the
// next round deals a fresh deck and the run goes on with the chances it has, until they are all gone.
// The deal is seeded, so tests and the hall's demo replay.

import { seeded } from '../../js/random.js';

export { seeded };

const SHARP_MISSES = 2;         // up to this many wrong pairs is still sharp
export const MISS_MS = 900;      // a wrong pair stays up this long before it turns back down
export const PAIR_POINTS = 100;
export const STREAK_POINTS = 50; // more for every pair found right after another
export const SPARE_TOTAL = 450;  // for clearing a round with every chance left; fewer chances left win their share

/** Bugs look alike on purpose: the more of them in a deck, the harder it is to tell the cards apart. */
export const BUGS = ['bug', 'ladybug', 'spider', 'butterfly'];
/** The pictures: the logo, Lob's bulb, Fuse Box's fuse, Notch Up's floor, and the bugs (Patch Night's is the first). */
export const SPRITES = ['logo', 'bulb', 'fuse', 'floor', ...BUGS];
/** Letters that are hard to mix up with one another. */
export const LETTERS = [...'ABDEFGHKLNPRSTUXZ'];

// Pairs and chances per level (more pairs, more chances), and the chances a cleared deck lights back on top of its last pair's; the deck's shape follows the screen (a tall one for a phone held upright).
export const LEVELS = {
  easy: { pairs: 6, tall: [3, 4], wide: [4, 3], sprites: 3, bugs: 1, chances: 4, clearBack: 1 },
  medium: { pairs: 8, tall: [4, 4], wide: [4, 4], sprites: 4, bugs: 2, chances: 5, clearBack: 1 },
  hard: { pairs: 10, tall: [4, 5], wide: [5, 4], sprites: 5, bugs: 3, chances: 6, clearBack: 2 },
};

// The cheers, by how many wrong pairs it took: none, a couple, more (relieved). Praise word, then a dry line.
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

/** The faces of a level's deck, one each: its share of sprites (of them as many bugs as the level says), the rest letters. */
export function facesFor(level, rand) {
  const { pairs, sprites, bugs } = LEVELS[level];
  const others = SPRITES.filter((f) => !BUGS.includes(f));
  return [
    ...shuffled(BUGS, rand).slice(0, bugs),
    ...shuffled(others, rand).slice(0, sprites - bugs),
    ...shuffled(LETTERS, rand).slice(0, pairs - sprites),
  ];
}

const dealt = (level, rand) => {
  const faces = facesFor(level, rand);
  return shuffled([...faces, ...faces], rand).map((face) => ({ face, state: 'down' }));
};

/** A new run on `level`, dealt with `rand`. */
export function newGame(level, rand) {
  return {
    level,
    cards: dealt(level, rand),
    pairs: LEVELS[level].pairs,
    round: 1,
    found: 0,          // pairs found in this round's deck
    total: 0,          // pairs found in the whole run
    maxChances: LEVELS[level].chances,
    chances: LEVELS[level].chances,
    misses: 0,         // wrong pairs in this round
    streak: 0,
    score: 0,
    open: [],          // the cards turned up and not yet matched: none, one, or a wrong pair waiting to turn back
    status: 'playing', // 'cleared' when every pair of the round is found, 'lost' when the chances are gone
    cheer: null,
    lastPraise: '',
    lastQuip: '',
    rand,
  };
}

/** Deal the next round after a cleared one: a fresh deck, the chances as they are, the streak and misses counted anew. */
export function nextRound(g) {
  if (g.status !== 'cleared') return;
  g.cards = dealt(g.level, g.rand);
  g.round++;
  g.found = 0;
  g.misses = 0;
  g.streak = 0;
  g.open = [];
  g.cheer = null;
  g.status = 'playing';
}

/** Turn a wrong pair back down. */
export function settle(g) {
  for (const i of g.open) g.cards[i].state = 'down';
  g.open = [];
}

function cheerOf(g) {
  const size = g.misses === 0 ? 'flawless' : g.misses <= SHARP_MISSES ? 'sharp' : 'close';
  const praise = pickLine(PRAISE[size], g.rand, g.lastPraise);
  const quip = pickLine(QUIPS[size], g.rand, g.lastQuip);
  g.lastPraise = praise;
  g.lastQuip = quip;
  return { size, praise, quip };
}

/**
 * Turn card `i` up. Returns { type: 'ignored' } when nothing happens (the run is over, the card is
 * already up or found), else { type: 'first' | 'match' | 'miss' | 'cleared' | 'lost' }. Turning a card
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
    g.total++;
    g.streak++;
    g.score += PAIR_POINTS + STREAK_POINTS * (g.streak - 1);
    if (g.found === g.pairs) {
      g.status = 'cleared';
      g.score += Math.round((SPARE_TOTAL * g.chances) / g.maxChances);
      g.cheer = cheerOf(g);
    }
    const back = 1 + (g.status === 'cleared' ? LEVELS[g.level].clearBack : 0); // a pair found lights a chance back, a cleared deck more
    g.chances = Math.min(g.maxChances, g.chances + back);
    return { type: g.status === 'cleared' ? 'cleared' : 'match' };
  }
  g.chances--;
  g.misses++;
  g.streak = 0;
  if (g.chances > 0) return { type: 'miss' };
  g.status = 'lost';
  return { type: 'lost' };
}

/** The picture or letter a card shows, for a screen reader. */
export const nameOf = (face) => ({ logo: 'Notchup logo', bug: 'beetle', ladybug: 'ladybird', spider: 'spider', butterfly: 'butterfly', bulb: 'bulb', fuse: 'fuse', floor: 'floor' }[face] ?? `letter ${face}`);
