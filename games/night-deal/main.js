// Night Deal's page: the table is one canvas (layout.js and scene.js, which the hall's demo draws too),
// with a real button over each pile so a keyboard and a screen reader can play. A tap or a drag lands
// on the canvas; the buttons answer to keys. Help and the hall of fame open in dialogs, and the clock
// waits while one is open.

import { neonColours } from '../../js/attract.js';
import { sharpCanvas } from '../../js/canvas.js';
import { confirmLeave, dialogOpen, wireDialogs } from '../../js/dialogs.js';
import { createFame } from '../../js/fame.js';
import { GRACE_MS, holdButton } from '../../js/grace.js';
import { gridKeys } from '../../js/grid.js';
import { pickLevel } from '../../js/levels.js';
import { consoleLogo } from '../../js/logo.js';
import { createLoop } from '../../js/loop.js';
import { memory } from '../../js/memory.js';
import { formatTime } from '../../js/scores.js';
import { initSettings } from '../../js/settings.js';
import { sfx } from '../../js/sound.js';
import { createClock } from './clock.js';
import { dropTarget, hit, layout, runRect } from './layout.js';
import { drawTable } from './scene.js';
import {
  COLUMN_IDS, LEVELS, STACKS, SUITS, bestMove, canFinish, canMove, cardsAt, finishMove, isStuck, isWon, nameOf, newGame, place,
  play, seeded, winnableSeed,
} from './rules.js';

const GAME = 'night-deal';
const ORDER = 'low';        // a shorter time is better
const DRAG_PX = 6;          // a press that moves less than this is a tap
const SLIDE_MS = 130;
const FINISH_MS = 140;      // between the cards that Finish plays onto the stacks
const STUCK_WAIT_MS = 400;  // the table must stay still this long, and the browser idle, before it says "no moves left"
const MAX_MS = 2 ** 24 - 1; // the longest time a score can hold: what a shared link packs in 24 bits
const ROW = ['s', 'w', 'u', ...STACKS, ...COLUMN_IDS];

const $ = (id) => document.getElementById(id);
const ui = {
  frame: $('frame'),
  stage: $('stage'),
  canvas: $('board'),
  piles: $('piles'),
  card: $('card'),
  cardTitle: $('card-title'),
  cardText: $('card-text'),
  go: $('go'),
  again: $('again'),
  finish: $('finish'),
  moves: $('moves'),
  best: $('best'),
  badge: $('badge'),
  status: $('status'),
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
const still = window.matchMedia('(prefers-reduced-motion: reduce)');
const clock = createClock();

let g;
let level;
let history = [];        // the states before each move, for undo
let count = 0;           // moves made, undo included
let over = false;        // won, or the clock stopped because only moving cards to the stacks is left
let size = { w: 0, h: 0 };
let lay;
let press = null;        // a finger or mouse down on the table: { at, from, drag }
let hand = null;         // cards picked up with the keyboard: { pile, n }
let pick = { pile: '', n: 1 }; // how many cards of a column the keyboard means
let slide = null;        // cards moving: { from: Map id -> { x, y }, t }
let finishTimer = 0;
let finishing = false;   // Finish is playing cards onto the stacks; the table ignores input till it is done
let stuckTimer = 0;
const buttons = new Map();

const fame = createFame({
  dialog: ui.fame,
  table: ui.scores,
  caption: ui.scoresCaption,
  initials: ui.dialog,
  board: () => `${GAME}:${level}`,
  order: ORDER,
  label: () => ({ 'draw-1': 'Draw 1', 'draw-3': 'Draw 3' })[level],
  score: { head: 'Time', cell: formatTime },
  columns: [{ key: 'moves', head: 'Moves', cell: String }],
});

// The same words twice in a row would not be read out again, so the second time ends in a space.
const say = (text) => { ui.status.textContent = text === ui.status.textContent ? `${text}\u00a0` : text; };

/** Starting over drops a deal in progress, so it asks first, with the clock stopped while it does. */
async function mayLeave() {
  if (over || count === 0) return true;
  clock.pause();
  const leave = await confirmLeave(ui.leave);
  if (!leave) resume();
  return leave;
}

// ---------- Drawing ----------

let view = {};

function paint() {
  if (!size.w) return;
  const ctx = sharpCanvas(ui.canvas, size.w, size.h);
  drawTable(ctx, colours, g, lay, { ...view, undo: history.length > 0 });
}

const loop = createLoop({
  step(dt) {
    if (!slide) return loop.stop();
    slide.t += dt;
    const k = Math.min(1, slide.t / SLIDE_MS);
    const ease = 1 - (1 - k) ** 3;
    const at = new Map();
    for (const card of lay.cards) {
      const from = slide.from.get(card.id);
      if (from && k < 1) at.set(card.id, { x: from.x + (card.x - from.x) * ease, y: from.y + (card.y - from.y) * ease });
    }
    view = { ...view, at };
    if (k >= 1) {
      slide = null;
      view = { ...view, at: undefined };
    }
  },
  draw: paint,
});

/**
 * Start the cards that moved sliding from where `before` had them, or from `drop` where a drag let go.
 * A card that was not on show before (turned over from the draw pile) comes from the draw pile.
 */
function startSlide(before, drop, dealt) {
  const from = new Map();
  for (const card of lay.cards) {
    const old = drop?.get(card.id) ?? before.cards.find((c) => c.id === card.id) ?? (dealt ? before.slots.s : card);
    if (old.x !== card.x || old.y !== card.y) from.set(card.id, { x: old.x, y: old.y });
  }
  if (!from.size || still.matches) return;
  slide = { from, t: 0 };
  loop.start();
}

function refresh() {
  lay = layout(size.w, size.h, g);
  syncButtons();
  paint();
}

// ---------- The buttons over the piles (keys and screen readers) ----------

const countOf = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function describe(pile) {
  const i = place(pile);
  switch (pile[0]) {
    case 's': return g.stock.length ? `Draw pile, ${countOf(g.stock.length, 'card')}` : g.waste.length ? 'Draw pile, empty. Turn the discard pile over' : 'Draw pile, empty';
    case 'w': return g.waste.length ? `Discard pile, ${nameOf(g.waste.at(-1))} on top` : 'Discard pile, empty';
    case 'u': return history.length ? 'Undo' : 'Undo, nothing to undo';
    case 'f': return g.found[i] ? `${SUITS[i]} stack, up to ${nameOf(cardsAt(g, pile)[0])}` : `${SUITS[i]} stack, empty`;
    default: {
      const { down, up } = g.cols[i];
      if (!up.length) return `Column ${i + 1}, empty`;
      const run = pick.pile === pile && pick.n > 1 ? `, ${pick.n} cards chosen from ${nameOf(up.at(-pick.n))}` : '';
      return `Column ${i + 1}: ${nameOf(up.at(-1))} on top, ${down.length} face down, ${up.length} face up${run}`;
    }
  }
}

function buildButtons() {
  ui.piles.replaceChildren();
  ROW.forEach((pile, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.pile = pile;
    b.tabIndex = k === 0 ? 0 : -1; // one tab stop; arrows move around the table
    buttons.set(pile, b);
    ui.piles.append(b);
  });
}

function syncButtons() {
  for (const [pile, b] of buttons) {
    const r = pile === 'u' ? lay.undo : lay.reach[pile];
    Object.assign(b.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    const text = describe(pile);
    if (b.getAttribute('aria-label') !== text) b.setAttribute('aria-label', text);
  }
}

// ---------- Playing ----------

function paintCounters() {
  ui.moves.textContent = String(count);
  const best = memory.scores(`${GAME}:${level}`, ORDER)[0];
  ui.best.textContent = best ? formatTime(best.value) : '–';
}

function setHand(next, quiet = false) {
  hand = next;
  view = { ...view, targets: undefined, mark: undefined };
  if (hand) {
    const cards = cardsAt(g, hand.pile, hand.n);
    view.targets = [...buttons.keys()].filter((p) => (p[0] === 'f' || p[0] === 'c') && p !== hand.pile && canMove(g, { from: hand.pile, to: p, n: hand.n })).map((p) => lay.reach[p]);
    view.mark = runRect(lay, hand.pile, hand.n);
    if (!quiet) say(`Holding ${nameOf(cards[0])}${hand.n > 1 ? ` and ${countOf(hand.n - 1, 'card')} on it` : ''}. ${view.targets.length ? 'Move to a place and press Enter.' : 'Nowhere to put it.'} Escape puts it back.`);
  }
}

function clearChoice() {
  pick = { pile: '', n: 1 };
  if (hand) setHand(null);
  view = { ...view, mark: undefined, targets: undefined };
}

/** A move in words, for the status line (a live region, so a screen reader hears it). */
function told(move, before) {
  if (move.from === 's') return before.stock.length ? `${nameOf(g.waste.at(-1))}.` : 'Discard pile turned back over.';
  const where = move.to[0] === 'f' ? `${SUITS[place(move.to)]} stack` : `column ${place(move.to) + 1}`;
  return `${nameOf(cardsAt(before, move.from, move.n)[0])} to ${where}.`;
}

/** Make `move` if it is allowed; `drop` is where a drag let the cards go. Returns whether it was made. */
function act(move, drop) {
  const next = play(g, move);
  if (!next) return false;
  const before = lay;
  history.push(g);
  g = next;
  count++;
  clearChoice();
  if (!over) clock.run();
  say(told(move, history.at(-1)));
  afterMove(before, drop, move);
  return true;
}

function afterMove(before, drop, move) {
  lay = layout(size.w, size.h, g);
  startSlide(before, drop, move?.from === 's');
  ui.again.classList.remove('primary');
  syncButtons();
  paintCounters();
  paint();
  if (move?.to[0] === 'f') sfx.sparkle();
  else sfx.blip();
  clearTimeout(stuckTimer);
  if (isWon(g)) { win(); return; }
  if (canFinish(g) && !over) readyToFinish();
  else if (!over) stuckTimer = setTimeout(() => idle(checkStuck), STUCK_WAIT_MS);
}

// The search for "no moves left" is short but not free, so it waits for the browser to be idle.
const idle = window.requestIdleCallback ? (fn) => window.requestIdleCallback(fn) : (fn) => setTimeout(fn, 0);

function checkStuck() {
  if (over || dialogOpen() || !isStuck(g)) return;
  say('No moves left. Undo, or deal again.');
  ui.again.classList.add('primary');
}

/**
 * Every card is up and nothing is left to draw, so the win is certain. The clock stops here, on purpose:
 * what follows (Finish, or moving the cards by hand) is only carrying cards to the stacks, and `over`
 * keeps `act` from starting the clock again. Undo brings it back.
 */
function readyToFinish() {
  over = true;
  clock.pause();
  ui.finish.hidden = false;
  ui.again.hidden = true;
  say('Every card is up. Press Finish, or play them yourself.');
}

function finish() {
  finishing = true;
  ui.finish.hidden = true;
  const step = () => {
    const move = finishMove(g);
    if (!move) return;
    act(move);
    if (!isWon(g)) finishTimer = setTimeout(step, still.matches ? 0 : FINISH_MS);
  };
  step();
}

async function win() {
  clearTimeout(finishTimer);
  finishing = false;
  over = true;
  clock.pause();
  ui.finish.hidden = true;
  ui.again.hidden = false;
  const ms = Math.min(MAX_MS, Math.max(1, Math.round(clock.ms)));
  const shown = formatTime(ms);
  sfx.fanfare();
  badge.notchUp();
  ui.cardTitle.textContent = 'Dealt out';
  ui.cardText.textContent = `${shown} and ${countOf(count, 'move')}.`;
  ui.card.hidden = false;
  ui.piles.inert = true;
  say(`Every card is on its stack. ${shown}, ${countOf(count, 'move')}. Notch up!`);
  holdButton(ui.go);
  fame.passing(ms, true);
  if (await fame.offer({ value: ms, shown, extra: { moves: count }, grace: GRACE_MS })) paintCounters();
}

function undo() {
  if (!history.length || finishing || (over && isWon(g))) return;
  const before = lay;
  g = history.pop();
  count++;
  over = false;
  ui.finish.hidden = true;
  ui.again.hidden = false;
  clearTimeout(finishTimer);
  clearChoice();
  clock.run();
  sfx.tag();
  say('Undone.');
  afterMove(before, null, null);
}

function nowhere() {
  sfx.buzz();
  say('Nowhere for that card.');
}

/** What a tap on `pile` does with its top `n` cards. */
function tap(pile, n) {
  if (pile === 'u') undo();
  else if (pile === 's') {
    const move = bestMove(g, 's');
    if (!move || !act(move)) say('Nothing to draw.');
  } else if (n && pile[0] !== 'f') {
    const move = bestMove(g, pile, n);
    if (!move || !act(move)) nowhere();
  }
}

function build() {
  clearTimeout(finishTimer);
  finishing = false;
  clearTimeout(stuckTimer);
  g = newGame(level, seeded(winnableSeed(Math.random)));
  fame.startRun();
  history = [];
  count = 0;
  over = false;
  slide = null;
  view = {};
  press = null;
  clearChoice();
  clock.reset();
  badge.reset();
  ui.card.hidden = true;
  ui.piles.inert = false;
  ui.finish.hidden = true;
  ui.again.hidden = false;
  ui.again.classList.remove('primary');
  paintCounters();
  say('Tap a card to move it, or drag it.');
  fame.render();
  if (size.w) refresh();
}

// ---------- Pointer ----------

const pointAt = (e) => {
  const r = ui.canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

ui.stage.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || press || finishing || (over && isWon(g)) || dialogOpen() || e.target.closest('.card')) return;
  const at = pointAt(e);
  const from = hit(lay, g, at.x, at.y);
  if (!from) return;
  e.preventDefault();
  ui.stage.setPointerCapture(e.pointerId);
  slide = null; // cards still sliding settle where they are going
  view = { ...view, at: undefined };
  press = { id: e.pointerId, at, from, drag: null };
});

ui.stage.addEventListener('pointermove', (e) => {
  if (!press || e.pointerId !== press.id) return;
  const at = pointAt(e);
  const { from } = press;
  if (!press.drag) {
    const lifts = from.n > 0 && from.pile !== 's' && from.pile !== 'u' && cardsAt(g, from.pile, from.n);
    if (!lifts || Math.hypot(at.x - press.at.x, at.y - press.at.y) < DRAG_PX) return;
    const run = lay.cards.filter((c) => c.pile === from.pile).slice(-from.n);
    press.drag = { run, home: new Map(run.map((c) => [c.id, { x: c.x, y: c.y }])) };
  }
  const dx = at.x - press.at.x;
  const dy = at.y - press.at.y;
  press.drag.now = new Map(press.drag.run.map((c) => [c.id, { x: c.x + dx, y: c.y + dy }]));
  view = { ...view, at: press.drag.now };
  paint();
});

function release(e, cancelled) {
  if (!press || e.pointerId !== press.id) return;
  const { from, drag } = press;
  press = null;
  if (!drag) {
    if (!cancelled) tap(from.pile, from.n);
    return;
  }
  const first = drag.run[0];
  const spot = drag.now.get(first.id);
  const to = cancelled ? null : dropTarget(lay, g, from, spot.x, spot.y);
  view = { ...view, at: undefined };
  if (to && act({ from: from.pile, to, n: from.n }, drag.now)) return;
  // Nowhere to land: the cards slide back.
  if (!cancelled && (Math.abs(spot.x - first.x) > lay.cw / 2 || Math.abs(spot.y - first.y) > lay.ch / 2)) say('Nowhere for that card.');
  slide = { from: drag.now, t: 0 };
  if (still.matches) { slide = null; paint(); } else loop.start();
}
ui.stage.addEventListener('pointerup', (e) => release(e, false));
ui.stage.addEventListener('pointercancel', (e) => release(e, true));

// ---------- Keyboard ----------

// Arrows, Home and End move around the table (js/grid.js); Enter and Space are the button's own click.
gridKeys(ui.piles, () => 7);

ui.piles.addEventListener('click', (e) => {
  const pile = e.target.closest('button')?.dataset.pile;
  if (!pile || finishing || (over && isWon(g))) return;
  if (hand) {
    const move = { from: hand.pile, to: pile, n: hand.n };
    if (!act(move)) say('That card cannot go there.');
    return;
  }
  tap(pile, pick.pile === pile ? pick.n : 1);
});

ui.piles.addEventListener('keydown', (e) => {
  const pile = e.target.closest('button')?.dataset.pile;
  if (e.key === 'Escape' && hand) {
    e.stopPropagation();
    setHand(null);
    say('Put back.');
    paint();
    return;
  }
  if (!pile) return;
  if (e.key === 'u' || e.key === 'U') {
    undo();
  } else if ((e.key === '[' || e.key === ']') && pile[0] === 'c') {
    const most = g.cols[place(pile)].up.length;
    const n = pick.pile === pile ? pick.n : 1;
    pick = { pile, n: Math.min(most, Math.max(1, n + (e.key === ']' ? 1 : -1))) };
    view = { ...view, mark: most ? runRect(lay, pile, pick.n) : undefined };
    say(most ? `${countOf(pick.n, 'card')}, from ${nameOf(g.cols[place(pile)].up.at(-pick.n))}.` : 'Nothing to choose.');
    syncButtons();
    paint();
  } else if ((e.key === 'm' || e.key === 'M') && !hand) {
    const n = pick.pile === pile ? pick.n : 1;
    if (!cardsAt(g, pile, n)) return say('Nothing to pick up there.');
    setHand({ pile, n });
    paint();
  }
});

// ---------- The page ----------

function fit() {
  const w = ui.stage.clientWidth;
  const h = ui.stage.clientHeight;
  if (!w || !h || (w === size.w && h === size.h)) return;
  size = { w, h };
  if (g) {
    press = null; // a drag was measured on the old table
    slide = null;
    view = {};
    refresh();
    // What a hand or a chosen run outlines is laid out again for the new table.
    if (hand) setHand(hand, true);
    else if (pick.pile) view = { mark: runRect(lay, pick.pile, pick.n) };
    paint();
  }
}

ui.go.addEventListener('click', () => restart());
ui.again.addEventListener('click', async () => { if (await mayLeave()) restart(); });
ui.finish.addEventListener('click', finish);

function restart() {
  sfx.start();
  build();
  buttons.get('s').focus();
}

new ResizeObserver(fit).observe(ui.stage);

const pause = () => clock.pause();
const resume = () => { if (count > 0 && !over && !dialogOpen() && !document.hidden) clock.run(); };
document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
wireDialogs({ help: ui.help, fame, pause, resume });

initSettings(() => !over && count > 0);
buildButtons();
level = pickLevel(ui.levels, Object.keys(LEVELS), (next) => { level = next; build(); }, mayLeave);
fit();
build();
