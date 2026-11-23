// Pair Up on its own page. The deck is a grid of real buttons, so it works with a mouse, a finger, a
// keyboard and a screen reader; each card's face is a small canvas (faces.js) behind the card's back,
// and turning a card is a CSS flip (none with reduced motion). The page fits the screen without
// scrolling: the cards are sized to the room the deck has. Help and the hall of fame open in dialogs.
// A cleared deck gets a cheer card with the logo notching up, then the next round is dealt by itself;
// the run ends when the chances are gone. The level lives in the link (?level=hard).

import { neonColours } from '../../js/attract.js';
import { createFame } from '../../js/fame.js';
import { GRACE_MS } from '../../js/grace.js';
import { logoSvg } from '../../js/logo.js';
import { initSettings } from '../../js/settings.js';
import { sfx } from '../../js/sound.js';
import { drawFace } from './faces.js';
import { LEVELS, MISS_MS, flip, nameOf, newGame, nextRound, seeded, settle, shape } from './rules.js';

const ORDER = 'high';        // more points are better
const MIN_CELL = 44;         // a finger's size; below it the deck scrolls inside its frame
const MAX_CELL = 120;
const GAP = 6;               // between cards, as in styles.css
const CLEAR_MS = 700;        // the last pair shows this long before the cheer
const CHEER_MS = 2600;       // the cheer stays this long before the next round starts, or sooner on a tap
const LOSE_MS = 1600;        // the faces show this long before the end card

const $ = (id) => document.getElementById(id);
const ui = {
  frame: $('frame'),
  deck: $('deck'),
  card: $('card'),
  cardTitle: $('card-title'),
  cardText: $('card-text'),
  badge: $('badge'),
  go: $('go'),
  again: $('again'),
  score: $('score'),
  lamps: $('lamps'),
  round: $('round'),
  pairs: $('pairs'),
  status: $('status'),
  help: $('help'),
  fame: $('fame'),
  scores: $('scores'),
  scoresCaption: $('scores-caption'),
  dialog: $('initials'),
  levels: [...document.querySelectorAll('input[name="level"]')],
};

const colours = neonColours();
let level = levelFromUrl();
let g;
let buttons = [];
let cols = 1;
let cell = 0;
let missTimer = 0;
let endTimer = 0;

function levelFromUrl() {
  const l = new URLSearchParams(location.search).get('level');
  return l in LEVELS ? l : 'easy';
}

const fame = createFame({
  dialog: ui.fame,
  table: ui.scores,
  caption: ui.scoresCaption,
  initials: ui.dialog,
  board: () => `pair-up:${level}`,
  order: ORDER,
  label: () => ({ easy: 'Easy', medium: 'Medium', hard: 'Hard' })[level],
  score: { head: 'Points', cell: String },
  columns: [{ key: 'pairs', head: 'Pairs', cell: String }],
  empty: 'No scores on this browser yet. Clear a round to be the first.',
});
const say = (text) => { ui.status.textContent = text; };
const label = (i) => `Card ${i + 1}`;

function describe(i) {
  const { face, state } = g.cards[i];
  if (state === 'down') return `${label(i)}, face down`;
  return `${label(i)}: ${nameOf(face)}${state === 'matched' ? ', found' : ''}`;
}

function paint(i) {
  const { state } = g.cards[i];
  const shown = state === 'down' && g.status === 'lost' ? 'down shown' : state;
  const cls = `pair ${shown}`;
  if (buttons[i].className !== cls) buttons[i].className = cls;
  buttons[i].setAttribute('aria-label', describe(i));
}

function paintAll() {
  for (let i = 0; i < buttons.length; i++) paint(i);
}

function paintCounters() {
  ui.score.textContent = String(g.score);
  ui.round.textContent = `Round ${g.round}`;
  ui.pairs.textContent = `${g.found}/${g.pairs}`;
  ui.pairs.setAttribute('aria-label', `${g.found} of ${g.pairs} pairs`);
  [...ui.lamps.children].forEach((lamp, k) => lamp.classList.toggle('on', k < g.chances));
  ui.lamps.setAttribute('aria-label', `${g.chances} of ${g.maxChances} chances left`);
}

/** Draw every face at the size the cards have now, sharp on a dense screen. */
function drawFaces() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = Math.round(cell * dpr);
  buttons.forEach((b, i) => {
    const canvas = b.querySelector('canvas');
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(px / cell, 0, 0, px / cell, 0, 0);
    ctx.clearRect(0, 0, cell, cell);
    drawFace(ctx, g.cards[i].face, cell / 2, cell / 2, cell, colours);
  });
}

/** Size the cards to the room the deck has: as big as fits, between MIN_CELL and MAX_CELL. */
function fit() {
  if (!g) return;
  const rows = g.cards.length / cols;
  const pad = 16; // the deck's padding and border
  const w = (ui.frame.clientWidth - pad - GAP * (cols - 1)) / cols;
  const h = (ui.frame.clientHeight - pad - GAP * (rows - 1)) / rows;
  const next = Math.floor(Math.max(MIN_CELL, Math.min(MAX_CELL, w, h)));
  if (next === cell) return;
  cell = next;
  ui.deck.style.setProperty('--cell', `${cell}px`);
  drawFaces();
}

/** Lay out the cards of the deck in `g`, face down. */
function layDeck() {
  ui.deck.classList.remove('dark', 'won');
  ui.card.hidden = true;
  ui.deck.inert = false;
  cell = 0;
  const frag = document.createDocumentFragment();
  buttons = g.cards.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.i = i;
    b.tabIndex = i === 0 ? 0 : -1; // one tab stop; arrows move inside the deck
    const inner = document.createElement('span');
    inner.className = 'pair-inner';
    const back = document.createElement('span');
    back.className = 'pair-back';
    const front = document.createElement('span');
    front.className = 'pair-front';
    front.append(document.createElement('canvas'));
    inner.append(back, front);
    b.append(inner);
    frag.append(b);
    return b;
  });
  ui.deck.replaceChildren(frag);
  fit();
  paintAll();
  paintCounters();
}

const lamp = () => Object.assign(document.createElement('span'), { className: 'lamp on' });

function build() {
  clearTimeout(missTimer);
  clearTimeout(endTimer);
  g = newGame(level, seeded(Math.floor(Math.random() * 2 ** 32)));
  [cols] = shape(level, window.matchMedia('(orientation: portrait)').matches);
  ui.deck.style.setProperty('--cols', cols);
  ui.lamps.replaceChildren(...Array.from({ length: g.maxChances }, lamp));
  layDeck();
  say('Turn a card.');
  fame.render();
}

/** The next round: a fresh deck, the run goes on. */
function startNextRound() {
  clearTimeout(endTimer);
  const open = document.querySelector('dialog[open]');
  if (open) { // help or the hall of fame is open: deal when it closes, not behind it
    open.addEventListener('close', startNextRound, { once: true });
    return;
  }
  nextRound(g);
  layDeck();
  sfx.start();
  say(`Round ${g.round}. Turn a card.`);
  buttons[0].focus();
}

function showCard(title, text, { cleared = false } = {}) {
  ui.cardTitle.textContent = title;
  ui.cardText.textContent = text;
  ui.go.textContent = cleared ? 'Next round' : 'Play again';
  ui.badge.className = 'badge-logo';
  void ui.badge.offsetWidth; // so the logo's animation starts over
  if (cleared) ui.badge.className = 'badge-logo fixed';
  ui.card.hidden = false;
  ui.deck.inert = true;
  ui.go.focus();
}

const chancesLeft = () => `${g.chances} ${g.chances === 1 ? 'chance' : 'chances'} left`;

function roundCleared() {
  showCard(g.cheer.praise, `${g.cheer.quip} Round ${g.round} cleared. ${g.score} points.`, { cleared: true });
  say(`${g.cheer.praise}! Round ${g.round} cleared, ${chancesLeft()}. ${g.score} points. The next round starts in a moment.`);
  endTimer = setTimeout(startNextRound, CHEER_MS);
}

function endRun() {
  const score = g.score;
  const cleared = g.round - 1;
  showCard('Out of chances', `${cleared} ${cleared === 1 ? 'round' : 'rounds'} cleared, ${g.total} pairs found. ${score} points.`);
  say(`Out of chances. ${g.total} pairs found over ${g.round} ${g.round === 1 ? 'round' : 'rounds'}. ${score} points.`);
  fame.offer({ value: score, shown: `${score} points`, extra: { pairs: g.total }, grace: GRACE_MS });
}

function act(i) {
  const result = flip(g, i);
  if (result.type === 'ignored') return;
  clearTimeout(missTimer);
  paintAll();
  paintCounters();
  const name = nameOf(g.cards[i].face);
  if (result.type === 'first') {
    sfx.blip();
    say(`${label(i)}: ${name}. Find its twin.`);
  } else if (result.type === 'match') {
    sfx.sparkle();
    say(`A pair: ${name}. ${chancesLeft()}.`);
  } else if (result.type === 'miss') {
    sfx.buzz();
    say(`Not a pair. ${chancesLeft()}.`);
    missTimer = setTimeout(() => { settle(g); paintAll(); }, MISS_MS);
  } else if (result.type === 'cleared') {
    sfx.fanfare();
    ui.deck.classList.add('won');
    say(`A pair: ${name}.`);
    endTimer = setTimeout(roundCleared, CLEAR_MS);
  } else {
    sfx.lampOut();
    ui.deck.classList.add('dark');
    paintAll(); // the cards still down show their faces
    say('Out of chances.');
    endTimer = setTimeout(endRun, LOSE_MS);
  }
}

ui.deck.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) act(Number(b.dataset.i));
});

// Keyboard: arrows move around the deck; Enter and Space are the button's own click.
ui.deck.addEventListener('keydown', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const i = Number(b.dataset.i);
  const x = i % cols;
  const moves = {
    ArrowLeft: x > 0 ? i - 1 : i,
    ArrowRight: x < cols - 1 && i + 1 < buttons.length ? i + 1 : i,
    ArrowUp: i >= cols ? i - cols : i,
    ArrowDown: i + cols < buttons.length ? i + cols : i,
    Home: i - x,
    End: Math.min(i - x + cols - 1, buttons.length - 1),
  };
  if (!(e.key in moves)) return;
  e.preventDefault();
  buttons[moves[e.key]].focus();
});

// The one tab stop follows the focus, so Tab out and back returns to the card last used.
ui.deck.addEventListener('focusin', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  for (const other of buttons) other.tabIndex = other === b ? 0 : -1;
});

function restart() {
  sfx.start();
  build();
  buttons[0].focus();
}
ui.again.addEventListener('click', restart);
ui.go.addEventListener('click', () => (g.status === 'cleared' ? startNextRound() : restart()));

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

new ResizeObserver(fit).observe(ui.frame);
$('help-open').addEventListener('click', () => ui.help.showModal());
$('fame-open').addEventListener('click', () => { fame.render(); ui.fame.showModal(); });

ui.badge.replaceChildren(logoSvg('logo badge-mark'));
initSettings();
build();
