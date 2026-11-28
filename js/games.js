// The games in the hall, in the order their cabinets stand. To change the order, move a line here and
// run ./dev order, which puts the cabinets in index.html in the same order (tests/site.test.js fails
// until they match). `demo` fetches the cabinet's attract-mode demo; `boards` name the high-score
// tables it shows, one page each (a level without a score is skipped), `order` says which end is best.
// ./dev new-game adds a line here, and the layout check (scripts/check-layout.mjs) loads every game listed.

const levels = (game, names) => names.map((name) => ({ id: `${game}:${name}`, label: name.toUpperCase() }));

export const GAMES = [
  { id: 'fuse-box', demo: () => import('../games/fuse-box/demo.js'), boards: levels('fuse-box', ['easy', 'medium', 'hard']), order: 'low' },
  { id: 'lob', demo: () => import('../games/lob/demo.js'), boards: [{ id: 'lob:solo', label: '' }], order: 'high' },
  { id: 'patch-night', demo: () => import('../games/patch-night/demo.js'), boards: levels('patch-night', ['simple', 'medium', 'hard']), order: 'high' },
  { id: 'notch-up', demo: () => import('../games/notch-up/demo.js'), boards: [{ id: 'notch-up:tower', label: '' }], order: 'high' },
  { id: 'pair-up', demo: () => import('../games/pair-up/demo.js'), boards: levels('pair-up', ['easy', 'medium', 'hard']), order: 'high' },
  { id: 'night-deal', demo: () => import('../games/night-deal/demo.js'), boards: levels('night-deal', ['draw-1', 'draw-3']), order: 'low' },
  { id: 'bent-beam', demo: () => import('../games/bent-beam/demo.js'), boards: levels('bent-beam', ['easy', 'medium', 'hard']), order: 'high' },
];
