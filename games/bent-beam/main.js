// Bent Beam on its own page: the board is a picture on a canvas with a grid of real buttons over it,
// one per cell, so it works with a mouse, a finger, a keyboard and a screen reader. Nothing moves on
// its own, so the picture is drawn only when a mirror turns or the board changes size. The page fits
// the screen without scrolling: the cells are sized to the room the frame has. Help and the hall of
// fame open in dialogs. The level lives in the link (?level=medium).

import { neonColours } from '../../js/attract.js';
import { cellName, fitCell } from '../../js/cells.js';
import { sharpCanvas } from '../../js/canvas.js';
import { confirmLeave, wireDialogs } from '../../js/dialogs.js';
import { createFame } from '../../js/fame.js';
import { gridKeys } from '../../js/grid.js';
import { pickLevel } from '../../js/levels.js';
import { consoleLogo } from '../../js/logo.js';
import { initSettings } from '../../js/settings.js';
import { sfx } from '../../js/sound.js';
import { replay } from '../../js/replay.js';
import { loadSheet } from '../../js/sheet.js';
import { pickLine } from '../../js/random.js';
import { LEVELS, MEDALS, BACK, SHORT_LINES, SLASH, SPENT_LINES, WALL, burnBulb, fixedBoard, isLit, lampsLeft, newBoard, newRun, outOfTurns, praiseFor, resetBoard, seeded, shortsCrossed, turnMirror, turnsLeft, undoTurn } from './rules.js';
import { beamLength, drawBoard, reach } from './scene.js';

const GAME = 'bent-beam';
const ORDER = 'high'; // more boards fixed is better
const MIN_CELL = 24; // WCAG's smallest target; below it the board scrolls inside its frame
const MAX_CELL = 64;
const SWEEP_CELLS_PER_S = 9; // the winning beam travels this fast, so a long path takes a few calm seconds
const SWEEP_MIN_MS = 1200;
const BEAT_MS = 700;         // the lit board rests this long before the score dialog
const REDUCED = '(prefers-reduced-motion: reduce)';
const LINGER_MS = 3500; // the line stays this long unless a tap or the next turn fades it first
const PAUSE_MS = 1300; // after a reset the board ignores taps this long, so no turn is spent on a board still being read
const LOW_TURNS = 3; // the status line counts the turns down from here
const BORDER = 32;   // the board's border (4) and the room its glow needs (14) on both sides

const $ = (id) => document.getElementById(id);
const ui = {
  frame: $('frame'),
  board: $('board'),
  canvas: $('picture'),
  cells: $('cells'),
  lamps: $('lamps'),
  fixed: $('fixed'),
  turns: $('turns'),
  again: $('again'),
  undo: $('undo'),
  card: $('card'),
  cardTitle: $('card-title'),
  cardText: $('card-text'),
  go: $('go'),
  status: $('status'),
  badge: $('badge'),
  help: $('help'),
  fame: $('fame'),
  leave: $('leave'),
  scores: $('scores'),
  scoresCaption: $('scores-caption'),
  dialog: $('initials'),
  levels: [...document.querySelectorAll('input[name="level"]')],
};
const badge = consoleLogo(ui.badge);
const colours = neonColours();

// Starting over drops a board in progress, so a stray tap on a level or New board asks first.
const mayLeave = () => over || (g.status !== 'playing' && !run.fixed) || confirmLeave(ui.leave);
let level = pickLevel(ui.levels, Object.keys(LEVELS), (chosen) => { level = chosen; start(); }, mayLeave);
let g;
let run;
let over = false; // the run's last bulb has burnt out
let paused = false; // a burnt bulb's line is showing and the board takes no turns yet
let burn = null; // the line over the board, made on the first burn
let lastBurn = '';
let burnTimer = 0;
let buttons = [];
let cell = 0;
const bulb = () => Object.assign(document.createElement('span'), { className: 'lamp on' });

const fame = createFame({
  dialog: ui.fame,
  table: ui.scores,
  caption: ui.scoresCaption,
  initials: ui.dialog,
  board: () => `${GAME}:${level}`,
  order: ORDER,
  label: () => ({ easy: 'Easy', medium: 'Medium', hard: 'Hard' })[level],
  score: { head: 'Boards', cell: String },
});
const say = (text) => { ui.status.textContent = text; };

/** The text a screen reader hears for cell `i`. */
function labelOf(i) {
  const where = cellName(i, g.size);
  const kind = g.cells[i];
  if (kind === WALL) return `${where}: wall`;
  if (kind === SLASH || kind === BACK) {
    const lean = kind === SLASH ? 'leaning right' : 'leaning left';
    return `${where}: ${g.fixed[i] ? 'bolted mirror' : 'mirror'}, ${lean}`;
  }
  if (g.shorts.includes(i)) return `${where}: short circuit, ${g.beam.crossed.has(i) ? 'the beam is crossing it' : 'clear'}`;
  if (g.lamps.includes(i)) return `${where}: lamp, ${isLit(g, i) ? 'lit' : 'not lit'}`;
  return where;
}

/**
 * A bulb burns: the border glows soft red once (burn.css, loaded now; no glow with less motion), a dry line
 * shows over the board for `ms`, and the bulb's sound plays. Nothing flashes.
 */
function burnLine(lines) {
  lastBurn = pickLine(lines, Math.random, lastBurn);
  return lastBurn;
}

async function burnCue(text, ms) {
  sfx.lampOut();
  const board = g;
  if (!burn) {
    burn = Object.assign(document.createElement('p'), { className: 'burn' });
    burn.setAttribute('aria-hidden', 'true'); // the status line says the same
    burn.addEventListener('click', () => burn.classList.remove('show'));
    ui.board.append(burn);
    await loadSheet(new URL('burn.css', import.meta.url).href);
    if (g !== board) return;
  }
  burn.textContent = text;
  burn.classList.add('show');
  replay(ui.board, 'hurt');
  clearTimeout(burnTimer);
  burnTimer = setTimeout(() => burn.classList.remove('show'), ms);
}

function paintCounters() {
  [...ui.lamps.children].forEach((b, k) => b.classList.toggle('on', k < run.bulbs));
  ui.lamps.setAttribute('aria-label', `${run.bulbs} of ${run.max} bulbs left`);
  ui.fixed.textContent = String(run.fixed);
  ui.turns.textContent = `${g.taps}/${g.budget}`;
}

function draw(head = Infinity) {
  const [w, h] = [(g.size + 1) * cell, g.size * cell];
  drawBoard(sharpCanvas(ui.canvas, w, h), w, h, colours, g, -1, head);
}

function paint() {
  ui.undo.disabled = over || g.status !== 'playing' || !g.history.length;
  draw();
  buttons.forEach((b, i) => {
    b.setAttribute('aria-label', labelOf(i));
    b.classList.toggle('turns', (g.cells[i] === SLASH || g.cells[i] === BACK) && !g.fixed[i] && g.status !== 'won');
  });
  paintCounters();
}

/** Size the cells to the room the board has: as big as fits, between MIN_CELL and MAX_CELL. */
function fit() {
  if (!g) return;
  const next = fitCell(ui.frame, ui.board, { cols: g.size + 1, rows: g.size, pad: BORDER, min: MIN_CELL, max: MAX_CELL });
  if (next === cell) return;
  cell = next;
  paint();
}

/** A new run: full bulbs, no boards fixed, and its first board. */
function start() {
  run = newRun(LEVELS[level]);
  over = false;
  ui.lamps.replaceChildren(...Array.from({ length: run.max }, bulb));
  fame.startRun();
  build();
}

/** The next board of the run. */
function build() {
  g = newBoard(LEVELS[level], seeded(Math.floor(Math.random() * 2 ** 32)));
  ui.board.style.setProperty('--n', g.size);
  ui.board.style.setProperty('--row', g.row);
  ui.board.classList.remove('won', 'dark', 'hurt');
  burn?.classList.remove('show');
  paused = false;
  ui.board.style.removeProperty('--glow');
  ui.card.hidden = true;
  ui.cells.inert = false;
  badge.reset();
  ui.again.textContent = 'New run';
  buttons = Array.from({ length: g.size * g.size }, (_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.i = i;
    b.tabIndex = i === 0 ? 0 : -1; // one tab stop; arrows move inside the board
    return b;
  });
  ui.cells.replaceChildren(...buttons);
  cell = 0;
  fit();
  say(`Tap a mirror to turn it. Light every lamp in ${g.budget} turns.`);
  fame.render();
}

/**
 * The win: a gold front runs along the lit beam from the housing, pinging at each mirror and sparkling at
 * each lamp, and the lamps stay lit, so nothing the player won disappears. The board takes no turns
 * meanwhile (it is won). With less motion it is simply lit.
 */
function sweep(board) {
  const length = beamLength(g);
  if (window.matchMedia(REDUCED).matches) return Promise.resolve();
  const ms = Math.max(SWEEP_MIN_MS, (length / SWEEP_CELLS_PER_S) * 1000);
  // Each mirror the gold front reaches pings, each lamp sparkles.
  const marks = [...g.beam.hit.keys()].map((i) => [reach(g, i), sfx.blip]).concat(g.lamps.map((i) => [reach(g, i), sfx.sparkle])).sort((a, b) => a[0] - b[0]);
  return new Promise((resolve) => {
    const from = performance.now();
    let rung = 0;
    const tick = (now) => {
      if (g !== board) { resolve(); return; } // a new board was started meanwhile
      const head = Math.min(length, ((now - from) / ms) * length);
      draw(head);
      ui.board.style.setProperty('--glow', String(Math.sin(Math.PI * (head / length)) * 0.9)); // the edge glows slowly up and down, once
      while (rung < marks.length && marks[rung][0] <= head) { marks[rung][1](); rung++; }
      if (head < length) requestAnimationFrame(tick);
      else { ui.board.style.removeProperty('--glow'); resolve(); }
    };
    sfx.lob();
    draw(0);
    requestAnimationFrame(tick);
  });
}

async function win() {
  const board = g;
  fixedBoard(run);
  ui.board.classList.remove('hurt'); // the gold glow shares the border
  ui.board.classList.add('won');
  say('The beam is through.');
  await sweep(board);
  if (g !== board) return;
  paint();
  sfx.fanfare();
  badge.notchUp();
  say(`Every lamp is lit, in ${g.taps} turns. A bulb is back on. Notch up!`);
  fame.passing(run.fixed);
  await new Promise((resolve) => setTimeout(resolve, BEAT_MS));
  if (g !== board) return;
  ui.cardTitle.textContent = `${MEDALS[g.taps - g.par] ?? ''} Board fixed`.trim();
  ui.cardText.textContent = `${pickLine(praiseFor(g), Math.random)} ${g.taps} turns, ${run.fixed} fixed.`;
  ui.go.textContent = 'Next board';
  ui.cells.inert = true;
  ui.card.hidden = false;
  ui.go.focus();
}

/** The last bulb burnt out: the board goes dark, the run ends, and its boards are the score. */
async function end() {
  const board = g;
  over = true;
  ui.cells.inert = true;
  sfx.lampOut();
  ui.board.classList.add('dark');
  say(`Out of bulbs. ${run.fixed} ${run.fixed === 1 ? 'board' : 'boards'} fixed.`);
  await new Promise((resolve) => setTimeout(resolve, BEAT_MS));
  if (g !== board) return;
  ui.cardTitle.textContent = 'Out of bulbs';
  ui.cardText.textContent = `${run.fixed} ${run.fixed === 1 ? 'board' : 'boards'} fixed.`;
  ui.go.textContent = 'New run';
  ui.cells.inert = true;
  ui.card.hidden = false;
  ui.go.focus();
  if (run.fixed > 0) await fame.offer({ value: run.fixed, shown: `${run.fixed} ${run.fixed === 1 ? 'board' : 'boards'}` });
  if (g === board) ui.go.focus();
}

/**
 * A turn that sends the beam into a short circuit, or uses the board's last turn without fixing it, burns
 * one bulb (one, even when both happen). A board out of turns starts over as it was, with a fresh budget,
 * so one stuck board cannot drain the run. True when the turn cost a bulb.
 */
function punish(shorted) {
  const spent = outOfTurns(g);
  if (!shorted && !spent) return false;
  const out = burnBulb(run);
  if (out) { paintCounters(); end(); return true; }
  const line = burnLine(spent ? SPENT_LINES : SHORT_LINES);
  burnCue(line, LINGER_MS);
  if (spent) {
    resetBoard(g);
    paint();
    pause(PAUSE_MS);
    say(`${line} The mirrors are back as they were. ${run.bulbs} left.`);
  } else {
    paintCounters();
    say(`${line} ${run.bulbs} left.`);
  }
  return true;
}

/** The board takes no turns for `ms`, so a tap meant for the old board is not spent on the reset one. */
function pause(ms) {
  const board = g;
  paused = true;
  setTimeout(() => { if (g === board) paused = false; }, ms);
}

/** The status line after a turn that cost nothing: the lamps still dark, and the turns once they run low. */
function report() {
  const lamps = lampsLeft(g);
  const turns = turnsLeft(g);
  const warn = turns <= LOW_TURNS ? ` ${turns} ${turns === 1 ? 'turn' : 'turns'} left.` : '';
  if (shortsCrossed(g)) say(`The beam still crosses a short circuit. Steer it clear.${warn}`);
  else say(`${lamps === 1 ? '1 lamp left.' : `${lamps} lamps left.`}${warn}`);
}

function act(i) {
  if (paused) return;
  burn?.classList.remove('show');
  const before = shortsCrossed(g);
  const result = turnMirror(g, i);
  if (result === 'fixed') {
    sfx.buzz();
    say('That mirror is bolted down.');
    return;
  }
  if (result === 'ignored') return;
  paint();
  if (result === 'won') { win(); return; }
  if (punish(shortsCrossed(g) > before)) return;
  if (!shortsCrossed(g)) sfx.blip();
  report();
}

ui.cells.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) act(Number(b.dataset.i));
});

// Keyboard: arrows move around the board (js/grid.js), Enter or Space turns a mirror (the button's own click).
gridKeys(ui.cells, () => g.size);

ui.undo.addEventListener('click', () => {
  if (paused) return;
  const i = undoTurn(g);
  if (i < 0) return;
  paint();
  if (punish(false)) { buttons[i].focus(); return; }
  sfx.blip();
  say(`${cellName(i, g.size)} turned back. ${lampsLeft(g)} lamps left.`);
  buttons[i].focus();
});

async function restart() {
  if (!(await mayLeave())) return;
  sfx.start();
  start();
  buttons[0].focus();
}
function next() {
  sfx.start();
  build();
  buttons[0].focus();
}
ui.again.addEventListener('click', restart);
ui.go.addEventListener('click', () => (over ? restart() : next()));

new ResizeObserver(fit).observe(ui.frame);
wireDialogs({ help: ui.help, fame });

initSettings(() => !over && (g.status === 'playing' || run.fixed > 0));
start();
