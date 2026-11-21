// The hall: a row of cabinets, each a link to its game. A game that is ready plays itself on its
// cabinet's screen (attract mode, js/attract.js); the rest say "Soon". Without JavaScript the hall is
// still a page of plain links.

import { mountAttract } from './attract.js';
import { gearSvg } from './gear.js';
import { memory } from './memory.js';
import { initSettings } from './settings.js';
import { createDemo } from '../games/fuse-box/demo.js';

const DEMOS = {
  'fuse-box': () => createDemo({ scores: () => memory.scores('fuse-box:easy', 'low') }),
};

document.querySelector('.marquee h1').prepend(gearSvg('gear marquee-gear'));
initSettings();
for (const cabinet of document.querySelectorAll('.cabinet[data-game]')) {
  const make = DEMOS[cabinet.dataset.game];
  const canvas = cabinet.querySelector('canvas');
  if (make && canvas) mountAttract(canvas, make());
}
