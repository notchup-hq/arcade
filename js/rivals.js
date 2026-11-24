// A small cheer when a run passes a friend saved in the Friends table, in every
// game. It is a line at the top edge of the page that fades in and out on its own: it never takes the
// focus or a tap, never covers the play for long, does not flash, and is also read out politely.
// Each friend is announced once per run. The wording, the colour and the side change from one
// cheer to the next so it stays fun; it is loaded only when a friend is saved for the level, and
// fame.js (startRun, passing) is how a game uses it.

import { lead } from './scores.js';
import { pickLine } from './random.js';

const LINES = [
  (who) => `Passed ${who}!`,
  (who) => `${who} is behind you now.`,
  (who) => `Past ${who}. Keep going.`,
  (who) => `Sorry, ${who}.`,
  (who) => `Overtook ${who}. Quietly.`,
  (who) => `${who}, mind the tail lights.`,
  (who) => `Left ${who} in the dust.`,
];
const SHOWN_MS = 2800;
const TONES = ['var(--neon-gold)', 'var(--neon-cyan)', 'var(--neon-magenta)'];

let region = null;
let last = '';
let timer = 0;
let turns = 0;

/** "ABC", "ABC and DEF", "ABC, DEF and GHI". */
export const names = (list) => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`);

// Its own status line: the game's one (`say`) carries the game's own words, which a cheer must not
// overwrite. Made empty when a run starts, so screen readers already watch it when a cheer arrives.
function ensureRegion() {
  if (region) return;
  region = document.createElement('p');
  region.className = 'rival-toast';
  region.setAttribute('role', 'status');
  document.body.append(region);
}

function cheer(who) {
  ensureRegion();
  const text = pickLine(LINES.map((line) => line(who)), Math.random, last);
  last = text;
  // Set through the style object, which the strict CSP allows (an inline style attribute it does not).
  region.style.color = TONES[turns % TONES.length];
  region.style.left = turns % 2 ? 'auto' : '0.5rem';
  region.style.right = turns % 2 ? '0.5rem' : 'auto';
  turns++;
  region.textContent = text;
  region.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => {
    region.classList.remove('show');
    region.textContent = '';
  }, SHOWN_MS);
}

/**
 * Watch one run against `friends` (saved entries of the level, best first). Returns a function to
 * call with the run's score as it changes, and with `final` true when it ends. A score that only
 * counts at the end (`order` low: a time) is checked at `final` only. Announces the friends passed
 * since the last call, never one twice.
 */
export function watchRun(friends, order) {
  ensureRegion();
  const left = new Set(friends);
  return (value, final = false) => {
    if (order === 'low' && !final) return;
    const passed = [...left].filter((f) => lead(order, value, f.value) > 0);
    if (!passed.length) return;
    passed.forEach((f) => left.delete(f));
    cheer(names(passed.map((f) => f.initials)));
  };
}
