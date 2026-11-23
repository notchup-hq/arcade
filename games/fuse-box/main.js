// Fuse Box on its own page: the panel is a grid of real buttons, so it works with a mouse, a finger, a
// keyboard and a screen reader. The page fits the screen without scrolling: the cells are sized to the
// room the panel has, and help and the hall of fame open in dialogs. Tap or click to test a fuse; tag one with a right click, a long press,
// the T key, or the Tag button. The level lives in the link (?level=medium).

import { renderFame } from '../../js/fame.js';
import { askInitials } from '../../js/initials.js';
import { logoSvg } from '../../js/logo.js';
import { memory } from '../../js/memory.js';
import { formatTime, placeOf } from '../../js/scores.js';
import { initSettings } from '../../js/settings.js';
import { sfx } from '../../js/sound.js';
import { LEVELS, TAGGED, TESTED, fusesLeft, newPanel, shaped, testFuse, toggleTag } from './rules.js';

const GAME = 'fuse-box';
const ORDER = 'low'; // a faster time is better
const LONG_PRESS_MS = 450;
const MIN_CELL = 24; // WCAG's smallest target; below it the panel scrolls inside its frame
const MAX_CELL = 52;

const $ = (id) => document.getElementById(id);
const ui = {
  board: $('panel'),
  left: $('left'),
  time: $('time'),
  modeTest: $('mode-test'),
  modeTag: $('mode-tag'),
  again: $('again'),
  status: $('status'),
  badge: $('badge'),
  frame: $('frame'),
  help: $('help'),
  fame: $('fame'),
  scores: $('scores'),
  scoresCaption: $('scores-caption'),
  dialog: $('initials'),
  levels: [...document.querySelectorAll('input[name="level"]')],
};

let level = levelFromUrl();
let p;
let buttons = [];
let started = 0;
let finished = 0;
let clock = 0;
let lastAdded = -1;
let tagging = false; // what a tap does: test a fuse, or tag it

function levelFromUrl() {
  const l = new URLSearchParams(location.search).get('level');
  return l in LEVELS ? l : 'easy';
}

const board = () => `${GAME}:${level}`;
const elapsed = () => (started ? (finished || performance.now()) - started : 0);

/** The text a screen reader hears for fuse `i`. */
function labelOf(i) {
  const where = { row: Math.floor(i / p.cols) + 1, col: (i % p.cols) + 1 };
  const s = p.cells[i];
  if (p.status === 'lost' && p.isBlown[i]) return `Row ${where.row}, column ${where.col}: blown`;
  if (p.status === 'lost' && s === TAGGED) return `Row ${where.row}, column ${where.col}: tagged, but good`;
  if (s === TAGGED) return `Row ${where.row}, column ${where.col}: tagged`;
  if (s !== TESTED) return `Row ${where.row}, column ${where.col}`;
  const n = p.count[i];
  if (n === 0) return `Row ${where.row}, column ${where.col}: good, none blown next to it`;
  if (n === 1) return `Row ${where.row}, column ${where.col}: good, 1 blown next to it`;
  return `Row ${where.row}, column ${where.col}: good, ${n} blown next to it`;
}

function paint(i) {
  const b = buttons[i];
  const s = p.cells[i];
  const lost = p.status === 'lost';
  let cls = 'fuse';
  let text = '';
  if (s === TESTED) {
    cls += ` lit n${p.count[i]}`;
    if (p.count[i]) text = String(p.count[i]);
  } else if (lost && p.isBlown[i] && s !== TAGGED) {
    cls += i === p.sparked ? ' blown sparked' : ' blown';
  } else if (s === TAGGED) {
    cls += lost && !p.isBlown[i] ? ' tagged wrong' : ' tagged';
  }
  if (b.className !== cls) b.className = cls;
  if (b.textContent !== text) b.textContent = text;
  b.setAttribute('aria-label', labelOf(i));
}

function paintAll() {
  for (let i = 0; i < buttons.length; i++) paint(i);
}

/** Tell the visitor (and a screen reader, through the live region) what just happened. */
function say(text) {
  ui.status.textContent = text;
}

function paintCounters() {
  ui.left.textContent = String(fusesLeft(p));
  ui.time.textContent = formatTime(elapsed());
}

function build() {
  // The panel takes the screen's shape when it is made; turning the phone mid-game keeps it as it is.
  p = newPanel(shaped(LEVELS[level], window.matchMedia('(orientation: portrait)').matches));
  started = 0;
  finished = 0;
  clearInterval(clock);
  ui.board.style.setProperty('--cols', p.cols);
  ui.board.style.setProperty('--rows', p.rows);
  ui.board.dataset.level = level;
  ui.board.classList.remove('dark');
  ui.badge.className = 'badge-logo';
  fit();
  const frag = document.createDocumentFragment();
  buttons = [];
  for (let i = 0; i < p.cols * p.rows; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.i = i;
    b.tabIndex = i === 0 ? 0 : -1; // one tab stop; arrows move inside the panel
    buttons.push(b);
    frag.append(b);
  }
  ui.board.replaceChildren(frag);
  paintAll();
  paintCounters();
  setTagging(false); // a new panel starts with testing, since the first tap must test
  say('Tap any fuse. The first is always safe.');
  renderScores();
}

function act(i, tag) {
  if (p.status === 'won' || p.status === 'lost') return;
  if (tag) {
    if (toggleTag(p, i)) {
      (p.cells[i] === TAGGED ? sfx.tag : sfx.untag)();
      paint(i);
      paintCounters();
    }
    return;
  }
  const wasReady = p.status === 'ready';
  const changed = testFuse(p, i);
  if (!changed.length) return;
  if (wasReady) {
    started = performance.now();
    clock = setInterval(paintCounters, 100);
  }
  for (const j of changed) paint(j);
  if (p.status === 'lost') lose();
  else if (p.status === 'won') win();
  else sfx.blip();
  paintCounters();
}

function stopClock() {
  finished = performance.now();
  clearInterval(clock);
}

function lose() {
  stopClock();
  sfx.spark();
  paintAll();
  ui.board.classList.add('dark');
  ui.badge.className = 'badge-logo sparked';
  say('Spark! That one was blown.');
  ui.again.focus();
}

async function win() {
  stopClock();
  const ms = Math.round(elapsed());
  sfx.fanfare();
  paintAll();
  paintCounters();
  ui.badge.className = 'badge-logo fixed';
  say(`Fixed in ${formatTime(ms)} s. Notch up!`);
  const place = placeOf(memory.scores(board(), ORDER), ms, ORDER);
  if (place >= 0) {
    const initials = await askInitials(ui.dialog, { place, score: `${formatTime(ms)} s`, last: memory.initials() });
    if (initials) {
      memory.addScore(board(), ORDER, { initials, value: ms });
      lastAdded = place;
      renderScores();
      lastAdded = -1;
      ui.fame.showModal();
      return;
    }
  }
  ui.again.focus();
}

function renderScores() {
  ui.scoresCaption.textContent = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[level];
  renderFame(ui.scores, memory.scores(board(), ORDER), {
    score: { head: 'Time (s)', cell: formatTime },
    fresh: lastAdded,
    empty: 'No scores on this browser yet. Fix a panel to be the first.',
  });
}

// Pointer: click tests (or tags in tag mode), a right click or a long press tags.
let pressTimer = 0;
let pressed = -1;
ui.board.addEventListener('pointerdown', (e) => {
  pressed = -1;
  const b = e.target.closest('button');
  if (!b || e.pointerType === 'mouse') return;
  pressTimer = setTimeout(() => {
    pressed = Number(b.dataset.i);
    act(pressed, true);
    navigator.vibrate?.(15); // a small buzz where the phone can, so the finger feels the tag
  }, LONG_PRESS_MS);
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  ui.board.addEventListener(type, () => clearTimeout(pressTimer));
}
ui.board.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const i = Number(b.dataset.i);
  if (i === pressed) { pressed = -1; return; } // the long press already tagged it
  act(i, tagging);
});
ui.board.addEventListener('contextmenu', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  e.preventDefault();
  const i = Number(b.dataset.i);
  if (i !== pressed) act(i, true); // a long press on a touch screen also opens the context menu
});

// Keyboard: arrows move, Enter or Space tests (the button's own click), T or F tags.
ui.board.addEventListener('keydown', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const i = Number(b.dataset.i);
  const x = i % p.cols;
  const moves = {
    ArrowLeft: x > 0 ? i - 1 : i,
    ArrowRight: x < p.cols - 1 ? i + 1 : i,
    ArrowUp: i >= p.cols ? i - p.cols : i,
    ArrowDown: i + p.cols < buttons.length ? i + p.cols : i,
    Home: i - x,
    End: i - x + p.cols - 1,
  };
  if (e.key in moves) {
    e.preventDefault();
    b.tabIndex = -1;
    buttons[moves[e.key]].tabIndex = 0;
    buttons[moves[e.key]].focus();
  } else if (e.key === 't' || e.key === 'T' || e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    act(i, true);
  }
});

/** Switch what a tap does. The panel's frame turns gold while tapping tags. */
function setTagging(on) {
  tagging = on;
  ui.modeTest.setAttribute('aria-pressed', String(!on));
  ui.modeTag.setAttribute('aria-pressed', String(on));
  ui.board.classList.toggle('tagging', on);
  if (p.status === 'ready' || p.status === 'playing') say(on ? 'Tapping now tags a fuse as blown.' : 'Tapping now tests a fuse.');
}
ui.modeTest.addEventListener('click', () => setTagging(false));
ui.modeTag.addEventListener('click', () => setTagging(true));

ui.again.addEventListener('click', () => {
  sfx.start();
  build();
  buttons[0].focus();
});

for (const r of ui.levels) {
  r.checked = r.value === level;
  r.addEventListener('change', () => {
    level = r.value;
    const url = new URL(location.href);
    if (level === 'easy') url.searchParams.delete('level');
    else url.searchParams.set('level', level);
    history.replaceState(null, '', url);
    build();
  });
}

/** Size the cells to the room the panel has: as big as fits, between MIN_CELL and MAX_CELL. */
function fit() {
  if (!p) return;
  const pad = 20; // the panel's padding and border
  const w = ui.frame.clientWidth - pad;
  const h = ui.frame.clientHeight - pad;
  const cell = Math.floor(Math.max(MIN_CELL, Math.min(MAX_CELL, w / p.cols, h / p.rows)));
  ui.board.style.setProperty('--cell', `${cell}px`);
}
new ResizeObserver(fit).observe(ui.frame);

$('help-open').addEventListener('click', () => ui.help.showModal());
$('fame-open').addEventListener('click', () => { renderScores(); ui.fame.showModal(); });

ui.badge.replaceChildren(logoSvg('logo badge-mark'));
initSettings();
build();
