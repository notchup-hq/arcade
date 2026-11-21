// The hall: a row of cabinets, each a link to its game. A game that is ready plays itself on its
// cabinet's screen (attract mode, js/attract.js); the rest say "Soon". Without JavaScript the hall is
// still a page of plain links.

import { mountAttract } from './attract.js';
import { memory } from './memory.js';
import { initSettings } from './settings.js';
import { createDemo } from '../games/fuse-box/demo.js';
import { createDemo as createLobDemo } from '../games/lob/demo.js';
import { createDemo as createPatchNightDemo } from '../games/patch-night/demo.js';

const DEMOS = {
  'fuse-box': () => createDemo({ scores: () => memory.scores('fuse-box:easy', 'low') }),
  lob: () => createLobDemo({ scores: () => memory.scores('lob:solo', 'high') }),
  'patch-night': () => createPatchNightDemo({ scores: () => memory.scores('patch-night:simple', 'high') }),
};

initSettings();
for (const cabinet of document.querySelectorAll('.cabinet[data-game]')) {
  const make = DEMOS[cabinet.dataset.game];
  const canvas = cabinet.querySelector('canvas');
  if (make && canvas) mountAttract(canvas, make());
}
