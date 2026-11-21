// The hall: a row of cabinets, each a link to its game. A game that is ready plays itself on its
// cabinet's screen (attract mode, js/attract.js); the rest say "Soon". Without JavaScript the hall is
// still a page of plain links.

import { mountAttract } from './attract.js';
import { logoSvg } from './logo.js';
import { memory } from './memory.js';
import { initSettings } from './settings.js';
import { createDemo } from '../games/fuse-box/demo.js';

const DEMOS = {
  'fuse-box': () => createDemo({ scores: () => memory.scores('fuse-box:easy', 'low') }),
};

document.getElementById('logo').replaceChildren(logoSvg('logo marquee-mark'));
initSettings();
for (const cabinet of document.querySelectorAll('.cabinet[data-game]')) {
  const make = DEMOS[cabinet.dataset.game];
  const canvas = cabinet.querySelector('canvas');
  if (make && canvas) mountAttract(canvas, make());
}
