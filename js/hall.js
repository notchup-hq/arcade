// The hall: a row of cabinets, each a link to its game. A game that is ready plays itself on its
// cabinet's screen (attract mode, js/attract.js); the rest say "Soon". Without JavaScript the hall is
// still a page of plain links.
//
// A demo's code is fetched only when its cabinet comes near the screen, so the hall's first load stays
// small however many games there are (tests/budget.test.js measures both).

import { mountAttract } from './attract.js';
import { memory } from './memory.js';
import { initSettings } from './settings.js';

const DEMOS = {
  'fuse-box': () => import('../games/fuse-box/demo.js').then((m) => m.createDemo({ scores: () => memory.scores('fuse-box:easy', 'low') })),
  lob: () => import('../games/lob/demo.js').then((m) => m.createDemo({ scores: () => memory.scores('lob:solo', 'high') })),
  'patch-night': () => import('../games/patch-night/demo.js').then((m) => m.createDemo({ scores: () => memory.scores('patch-night:simple', 'high') })),
  'notch-up': () => import('../games/notch-up/demo.js').then((m) => m.createDemo({ scores: () => memory.scores('notch-up:tower', 'high') })),
};
const NEAR = '200px'; // start fetching a demo this far before its cabinet scrolls into view

initSettings();
const near = new IntersectionObserver((entries) => {
  for (const { target, isIntersecting } of entries) {
    if (!isIntersecting) continue;
    near.unobserve(target);
    const canvas = target.querySelector('canvas');
    // A demo that cannot load (offline) leaves its cabinet a plain link, which is all it needs to be.
    DEMOS[target.dataset.game]?.().then((demo) => mountAttract(canvas, demo), () => {});
  }
}, { rootMargin: NEAR });
for (const cabinet of document.querySelectorAll('.cabinet[data-game]')) {
  if (cabinet.querySelector('canvas')) near.observe(cabinet);
}
