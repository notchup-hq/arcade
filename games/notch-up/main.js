// Notch Up on its own page. The tower is a canvas (scene.js) with one real button over it, "Drop the
// floor", so a keyboard and a screen reader can play too; a tap anywhere on the tower drops, the frame
// lights up softly and the windows of the floor just built glow for a moment; so do Space and Enter. Every tenth floor the logo in the console
// notches up; round numbers of floors get a cheer on the canvas and in the status line. Help and the
// hall of fame open in dialogs, and the game waits while one is open.

import { neonColours } from '../../js/attract.js';
import { dialogOpen, wireDialogs } from '../../js/dialogs.js';
import { GRACE_MS, holdButton } from '../../js/grace.js';
import { createFame } from '../../js/fame.js';
import { createLoop } from '../../js/loop.js';
import { consoleLogo } from '../../js/logo.js';
import { memory } from '../../js/memory.js';
import { initSettings } from '../../js/settings.js';
import { sfx } from '../../js/sound.js';
import { built, drop, moverX, moving, newGame, seeded, step } from './rules.js';
import { cameraFor, drawScene, easeCamera } from './scene.js';

const BOARD = 'notch-up:tower';
const ORDER = 'high';        // more floors are better
const TALL = 4 / 3;          // the picture is at least this much taller than it is wide
const KEY_CLICK_MS = 400;    // a key's drop also clicks the focused button; that click is not a second drop

const $ = (id) => document.getElementById(id);
const ui = {
  frame: $('frame'),
  stage: $('stage'),
  canvas: $('board'),
  drop: $('drop'),
  card: $('card'),
  cardTitle: $('card-title'),
  cardText: $('card-text'),
  go: $('go'),
  floors: $('floors'),
  best: $('best'),
  badge: $('badge'),
  status: $('status'),
  help: $('help'),
  fame: $('fame'),
  scores: $('scores'),
  dialog: $('initials'),
};
const badge = consoleLogo(ui.badge);

const ctx = ui.canvas.getContext('2d');
const colours = neonColours();
const still = window.matchMedia('(prefers-reduced-motion: reduce)');

let g = null;          // the run, or null before the first start
let camera = 0;        // world y at the bottom of the picture
let size = [0, 0];     // the canvas in CSS pixels
let lastSignature = '';
let keyDropAt = -Infinity;

const fame = createFame({
  dialog: ui.fame,
  table: ui.scores,
  initials: ui.dialog,
  board: () => BOARD,
  order: ORDER,
  score: { head: 'Floors', cell: String },
  columns: [{ key: 'perfect', head: 'Perfect', cell: String }],
});

const say = (text) => { ui.status.textContent = text; };
const bestSoFar = () => memory.scores(BOARD, ORDER)[0]?.value ?? 0;

function paintCounters() {
  ui.floors.textContent = String(g ? built(g) : 0);
  ui.best.textContent = String(Math.max(bestSoFar(), g ? built(g) : 0));
}

/** The frame lights up softly for a drop, gold when it was perfect (styles.css; none with reduced motion). */
function pulse(perfect) {
  ui.stage.classList.remove('pulse', 'perfect');
  void ui.stage.offsetWidth; // so the animation starts over
  ui.stage.classList.add('pulse');
  ui.stage.classList.toggle('perfect', perfect);
}

function draw() {
  const [w, h] = size;
  if (!w) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (ui.canvas.width !== Math.round(w * dpr) || ui.canvas.height !== Math.round(h * dpr)) {
    ui.canvas.width = Math.round(w * dpr);
    ui.canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(ui.canvas.width / w, 0, 0, ui.canvas.height / h, 0, 0);
  drawScene(ctx, w, h, colours, { g, camera, still: still.matches });
}

/** With reduced motion a frame is drawn only when something visible changed. */
function signature() {
  if (!g) return `idle|${camera}`;
  return `${g.floors.length}|${g.status}|${moverX(g, true)}|${!!g.cut}|${!!g.seam}|${!!g.lit}|${!!g.cheer}|${camera}`;
}

function frame() {
  if (still.matches) {
    const sig = signature();
    if (sig === lastSignature) return;
    lastSignature = sig;
  }
  draw();
}

const loop = createLoop({
  step(dt) {
    if (!g) return;
    step(g, dt);
    camera = easeCamera(camera, cameraFor(g, size[1], size[0]), dt, still.matches);
    if (g.status === 'over' && !moving(g)) loop.stop();
  },
  draw: frame,
});

function dropFloor() {
  if (g?.status !== 'playing' || dialogOpen()) return;
  const result = drop(g, still.matches);
  paintCounters();
  if (result.type === 'over') { endRun(); return; }
  if (result.type === 'perfect') sfx.notch();
  else sfx.blip();
  pulse(result.type === 'perfect');
  if (result.floors % 10 === 0) badge.notchUp();
  if (result.cheer) {
    sfx.win();
    say(`${result.cheer.count}. ${result.cheer.praise}! ${result.cheer.quip}${result.widened ? ' The crane widens the floor.' : ''}`);
  } else if (result.floors % 10 === 0) {
    say(`${result.floors} floors.`);
  }
  if (still.matches) frame();
}

function startRun() {
  sfx.start();
  g = newGame(seeded(Math.floor(Math.random() * 2 ** 32)), bestSoFar());
  camera = 0;
  lastSignature = '';
  badge.reset();
  ui.stage.classList.remove('dark', 'pulse', 'perfect');
  ui.card.hidden = true;
  ui.drop.inert = false;
  paintCounters();
  say('Drop the floor on the one below.');
  ui.drop.focus();
  frame();
  loop.start();
}

function showCard(title, text) {
  ui.cardTitle.textContent = title;
  ui.cardText.textContent = text;
  ui.go.textContent = g ? 'Play again' : 'Start';
  ui.card.hidden = false;
  ui.drop.inert = true;
}

async function endRun() {
  sfx.lampOut();
  ui.stage.classList.add('dark');
  const floors = built(g);
  const streak = g.bestPerfect ? ` Most perfects in a row: ${g.bestPerfect}.` : '';
  const count = floors === 1 ? '1 floor' : `${floors} floors`;
  showCard('Topped out', `${count}.${streak}`);
  say(`Topped out at ${floors} floors.`);
  holdButton(ui.go); // the player is often still tapping when the card appears
  if (await fame.offer({ value: floors, shown: count, extra: { perfect: g.bestPerfect }, grace: GRACE_MS })) paintCounters();
}

// A tap or click anywhere on the tower drops. The button's own click is for the keyboard and screen
// readers (it has no pointer position), unless a key press has just dropped already.
ui.stage.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || e.target.closest('.card')) return;
  e.preventDefault(); // keeps focus on the drop button and stops a double tap from zooming
  dropFloor();
});
ui.drop.addEventListener('click', (e) => {
  if (e.detail === 0 && performance.now() - keyDropAt > KEY_CLICK_MS) dropFloor();
});

// Space and Enter drop the moment they go down, unless the focus is on another control (help, sound,
// the back link), which keeps its own Space and Enter.
document.addEventListener('keydown', (e) => {
  if (g?.status !== 'playing' || e.ctrlKey || e.metaKey || e.altKey || dialogOpen()) return;
  if (e.target !== ui.drop && e.target.closest?.('a, button, input, select, summary, textarea')) return;
  if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
  e.preventDefault();
  e.stopPropagation();
  if (e.repeat) return;
  keyDropAt = performance.now();
  dropFloor();
}, true);

ui.go.addEventListener('click', startRun);

/** The picture takes the height the frame has, and at most 1/TALL of that across. */
function fit() {
  const fh = ui.frame.clientHeight;
  const fw = ui.frame.clientWidth;
  const w = Math.floor(Math.min(fw, fh / TALL));
  ui.stage.style.setProperty('--w', `${w}px`);
  ui.stage.style.setProperty('--h', `${Math.floor(fh)}px`);
  size = [w - 4, Math.floor(fh) - 4]; // the stage's border
  if (!g) camera = 0;
  lastSignature = '';
  draw();
}
fit(); // now, so the first frame already has its size; a view transition photographs that frame
new ResizeObserver(fit).observe(ui.frame);

// The game waits while a dialog is open.
wireDialogs({ help: ui.help, fame, pause: () => loop.stop(), resume: () => { if (g?.status === 'playing') loop.start(); } });
still.addEventListener('change', () => { lastSignature = ''; frame(); });

initSettings();
fame.render();
paintCounters();
showCard('Notch Up', 'Drop each floor on the one below. Whatever hangs over is cut off.');
