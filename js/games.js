// The games in the hall, in the order their cabinets stand. To change the order, move a line here and
// run ./dev order, which puts the cabinets in index.html in the same order (tests/site.test.js fails
// until they match). `demo` fetches the cabinet's attract-mode demo; `board` and `order` name the
// high-score table it shows.

export const GAMES = [
  { id: 'fuse-box', demo: () => import('../games/fuse-box/demo.js'), board: 'fuse-box:easy', order: 'low' },
  { id: 'lob', demo: () => import('../games/lob/demo.js'), board: 'lob:solo', order: 'high' },
  { id: 'patch-night', demo: () => import('../games/patch-night/demo.js'), board: 'patch-night:simple', order: 'high' },
  { id: 'notch-up', demo: () => import('../games/notch-up/demo.js'), board: 'notch-up:tower', order: 'high' },
  { id: 'pair-up', demo: () => import('../games/pair-up/demo.js'), board: 'pair-up:easy', order: 'high' },
];
