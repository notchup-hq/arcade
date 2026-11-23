// {{name}} on its own page. The picture is a canvas with one real button over it, so a keyboard and a
// screen reader can play too; a tap anywhere on the picture taps, and so do Space and Enter. Help and
// the hall of fame open in dialogs, and the game waits while one is open.
//
// This is the starter game ./dev new-game wrote: it shows how a page uses the kit in js/.

import { neonColours } from '../../js/attract.js';
import { sharpCanvas, stillFrames } from '../../js/canvas.js';
import { dialogOpen, wireDialogs } from '../../js/dialogs.js';
import { createFame } from '../../js/fame.js';
import { GRACE_MS, holdButton } from '../../js/grace.js';
import { consoleLogo } from '../../js/logo.js';
import { createLoop } from '../../js/loop.js';
import { memory } from '../../js/memory.js';
import { initSettings } from '../../js/settings.js';
import { sfx } from '../../js/sound.js';
import { drawLight } from './scene.js';
import { newGame, seeded, step, tap } from './rules.js';

const BOARD = '{{id}}:solo';
const ORDER = 'high'; // more points are better

const $ = (id) => document.getElementById(id);
const ui = {
  frame: $('frame'),
  stage: $('stage'),
  canvas: $('board'),
  tap: $('tap'),
  card: $('card'),
  cardTitle: $('card-title'),
  cardText: $('card-text'),
  go: $('go'),
  score: $('score'),
  best: $('best'),
  badge: $('badge'),
  status: $('status'),
  help: $('help'),
  fame: $('fame'),
  scores: $('scores'),
  dialog: $('initials'),
};
const badge = consoleLogo(ui.badge);
const colours = neonColours();

let g = null;      // the run, or null before the first start
let size = 0;      // the canvas in CSS pixels, square

const fame = createFame({
  dialog: ui.fame,
  table: ui.scores,
  initials: ui.dialog,
  board: () => BOARD,
  order: ORDER,
  score: { head: 'Points', cell: String },
});

const say = (text) => { ui.status.textContent = text; };
const bestSoFar = () => memory.scores(BOARD, ORDER)[0]?.value ?? 0;

function paintCounters() {
  ui.score.textContent = String(g?.score ?? 0);
  ui.best.textContent = String(Math.max(bestSoFar(), g?.score ?? 0));
}

function draw() {
  if (size) drawLight(sharpCanvas(ui.canvas, size, size), size, size, colours, !!g?.lit);
}

// The light only comes on and goes out, with nothing in between, so a frame is drawn only when it does,
// with or without reduced motion: the check of what is visible is always on.
const frames = stillFrames({ matches: true }, () => `${size}|${!!g?.lit}`, draw);

const loop = createLoop({
  step(dt) {
    if (g?.status !== 'playing') return loop.stop();
    step(g, dt);
  },
  draw: frames.draw,
});

function tapLight() {
  if (g?.status !== 'playing' || dialogOpen()) return;
  const result = tap(g);
  paintCounters();
  frames.draw();
  if (result.type === 'over') { endRun(); return; }
  sfx.blip();
  if (result.score % 10 === 0) {
    badge.notchUp();
    say(`${result.score} points.`);
  }
}

function startRun() {
  sfx.start();
  g = newGame(seeded(Math.floor(Math.random() * 2 ** 32)));
  badge.reset();
  ui.stage.classList.remove('dark');
  ui.card.hidden = true;
  ui.tap.inert = false;
  paintCounters();
  say('Tap while the light is lit.');
  ui.tap.focus();
  frames.forget();
  frames.draw();
  loop.start();
}

function showCard(title, text) {
  ui.cardTitle.textContent = title;
  ui.cardText.textContent = text;
  ui.go.textContent = g ? 'Play again' : 'Start';
  ui.card.hidden = false;
  ui.tap.inert = true;
}

async function endRun() {
  sfx.lampOut();
  ui.stage.classList.add('dark');
  const shown = g.score === 1 ? '1 point' : `${g.score} points`;
  showCard('Lights out', `${shown}.`);
  say(`Lights out. ${shown}.`);
  holdButton(ui.go); // the player is often still tapping when the card appears
  if (await fame.offer({ value: g.score, shown, grace: GRACE_MS })) paintCounters();
}

// A tap or click anywhere on the picture taps; the button's own click is for the keyboard.
ui.stage.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || e.target.closest('.card')) return;
  e.preventDefault(); // keeps focus on the button and stops a double tap from zooming
  tapLight();
});
ui.tap.addEventListener('click', (e) => {
  if (e.detail === 0) tapLight();
});
ui.go.addEventListener('click', startRun);

/** The picture is a square as big as the frame allows. */
function fit() {
  const side = Math.floor(Math.min(ui.frame.clientWidth, ui.frame.clientHeight));
  ui.stage.style.setProperty('--size', `${side}px`);
  size = side - 4; // the stage's border
  frames.forget();
  frames.draw();
}
fit(); // now, so the first frame already has its size
new ResizeObserver(fit).observe(ui.frame);

wireDialogs({ help: ui.help, fame, pause: () => loop.stop(), resume: () => { if (g?.status === 'playing') loop.start(); } });

initSettings();
fame.render();
paintCounters();
showCard('{{name}}', '{{pitch}}');
