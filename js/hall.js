// The hall: a row of cabinets, each a link to its game. A game that is ready plays itself on its
// cabinet's screen (attract mode, js/attract.js); the rest say "Soon". Without JavaScript the hall is
// still a page of plain links.

import { mountAttract } from './attract.js';
import { logoSvg, NOTCH_STEP } from './logo.js';
import { memory } from './memory.js';
import { initSettings } from './settings.js';
import { sfx } from './sound.js';
import { createDemo } from '../games/fuse-box/demo.js';

const DEMOS = {
  'fuse-box': () => createDemo({ scores: () => memory.scores('fuse-box:easy', 'low') }),
};

/** The logo as a button: each tap turns the gear four teeth, with a click per tooth, and the arrow
 *  notches up once. It stays still until then, so the hall is calm. */
function notchButton() {
  const mark = logoSvg('logo marquee-mark');
  const gear = mark.querySelector('.logo-gear');
  const arrow = mark.querySelector('.logo-arrow');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'marquee-logo';
  button.setAttribute('aria-label', 'Notch up');
  button.title = 'Notch up';
  button.append(mark);
  let turn = 0;
  button.addEventListener('click', () => {
    turn += 4 * NOTCH_STEP;
    gear.style.transform = `rotate(${turn}deg)`;
    arrow.classList.remove('up');
    void arrow.getBoundingClientRect(); // restart the notch even mid-way
    arrow.classList.add('up');
    for (let i = 0; i < 4; i++) sfx.notch(i * 0.3);
  });
  return button;
}

document.getElementById('logo').replaceWith(notchButton());
initSettings();
for (const cabinet of document.querySelectorAll('.cabinet[data-game]')) {
  const make = DEMOS[cabinet.dataset.game];
  const canvas = cabinet.querySelector('canvas');
  if (make && canvas) mountAttract(canvas, make());
}
