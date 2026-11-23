// The hall: a row of cabinets, each a link to its game. A game that is ready plays itself on its
// cabinet's screen (attract mode, js/attract.js); the rest say "Soon". Without JavaScript the hall is
// still a page of plain links.
//
// A demo's code is fetched only when its cabinet comes near the screen, so the hall's first load stays
// small however many games there are (tests/budget.test.js measures both).
//
// Coming back from a game, by its Arcade link (../../#<game>) or the browser's back button, the hall
// centres that game's cabinet, so the player lands where they left rather than on another game.

import { mountAttract } from './attract.js';
import { GAMES } from './games.js';
import { memory } from './memory.js';
import { initSettings } from './settings.js';

// A ready cabinet's demo, by game id: fetched on demand, showing the high scores of every level of
// the game that has any.
const DEMOS = Object.fromEntries(GAMES.map(({ id, demo, boards, order }) => [
  id,
  () => demo().then((m) => m.createDemo({
    scores: () => boards.map(({ id: board, label }) => ({ label, table: memory.scores(board, order) })).filter((b) => b.table.length),
  })),
]));
const NEAR = '200px'; // start fetching a demo this far before its cabinet scrolls into view

// The address names the game (#notch-up), not an element id: a real fragment target would make the
// browser jump the cabinet to the top of the screen on its own, at a moment of its choosing (after a
// view transition, say), and undo the centring.
const namedCabinet = () => {
  const game = location.hash.slice(1);
  return /^[a-z-]+$/.test(game) ? document.querySelector(`.cabinet[data-game="${game}"]`) : null;
};
const centreCabinet = () => namedCabinet()?.scrollIntoView({ block: 'center' });

initSettings();
// Coming back to a cabinet, it decides where the hall opens, not the last scroll; otherwise the browser does.
if (namedCabinet()) history.scrollRestoration = 'manual';
centreCabinet();
addEventListener('pagereveal', centreCabinet); // before the first frame, so the zoom back shrinks into place
addEventListener('load', centreCabinet); // once everything above it has its size
addEventListener('pageshow', (e) => { if (e.persisted) centreCabinet(); });
let opening = 0;
const OPENING_MS = 300;
// Coming back from a game by the back button must not show the screen as still opening.
addEventListener('pageshow', () => {
  clearTimeout(opening);
  for (const cabinet of document.querySelectorAll('.cabinet.opening')) cabinet.classList.remove('opening');
});
// Opening a game marks its cabinet in this page's address, so the back button comes back to it.
for (const link of document.querySelectorAll('.cabinet[data-game] > a')) {
  link.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    history.replaceState(null, '', `#${link.parentElement.dataset.game}`);
    // A game that is slow to arrive leaves the hall looking frozen; after a moment the screen says it is coming.
    opening = setTimeout(() => link.parentElement.classList.add('opening'), OPENING_MS);
  });
}
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
