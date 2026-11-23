// Patch Night on its own page. The board is a canvas (scene.js) with a ring of real buttons over it,
// one per lane, so a screen reader and the keyboard can play: "Up: 42". A tap anywhere in a lane zaps
// the bug in it. Help and the hall of fame open in dialogs, and the game waits while one is open.
// The level lives in the link (?level=medium).

import { dialogOpen, wireDialogs } from '../../js/dialogs.js';
import { GRACE_MS, holdButton } from '../../js/grace.js';
import { createFame } from '../../js/fame.js';
import { createLoop } from '../../js/loop.js';
import { memory } from '../../js/memory.js';
import { initSettings } from '../../js/settings.js';
import { sfx } from '../../js/sound.js';
import { neonColours } from '../../js/attract.js';
import { DIR_NAMES, LEVELS, cheerFor, LIVES, bugIn, dirOfArrows, dirOfKey, fameOf, mergeWeak, moving, multiplier, nearestDir, newGame, practiseList, resume, seeded, step, worth, zap } from './rules.js';
import { aimFor, bugPoint, drawScene, geometry, STEPS, turnToward } from './scene.js';

const GAME = 'patch-night';
const ORDER = 'high';        // more points are better
const MIN_BUG = 20;          // so a number is at least 16 px
const TARGET = 44;           // a lane button, as big as a finger needs
const AIM_MS = 120;          // the arrow's turn settles in about this long
const SHOWN = 6;             // facts listed under "Practise these"
const HINTS = {
  simple: 'Tables 1 to 5 and 10, four lanes.',
  medium: 'Tables 1 to 10, eight lanes, close wrong answers.',
  hard: 'Up to 12 × 12 and missing numbers, eight lanes.',
};

const $ = (id) => document.getElementById(id);
const ui = {
  stage: $('stage'),
  frame: $('frame'),
  canvas: $('board'),
  lanes: $('lanes'),
  card: $('card'),
  cardTitle: $('card-title'),
  cardText: $('card-text'),
  practise: $('practise'),
  go: $('go'),
  score: $('score'),
  streak: $('streak'),
  worth: $('worth'),
  lamps: $('lamps'),
  question: $('question'),
  status: $('status'),
  help: $('help'),
  fame: $('fame'),
  scores: $('scores'),
  scoresCaption: $('scores-caption'),
  dialog: $('initials'),
  levels: [...document.querySelectorAll('input[name="level"]')],
};

const ctx = ui.canvas.getContext('2d');
const colours = neonColours();
const still = window.matchMedia('(prefers-reduced-motion: reduce)');

let level = levelFromUrl();
let g = null;        // the run, or null before the first start
let aim = aimFor(1); // the arrow rests pointing up and to the right
let aimTo = aim;
let aimDir = 0;      // the lane the turret is set on, for the keyboard
const held = new Set(); // arrow keys held down
let buttons = [];
let side = 0;        // the board's size in CSS pixels
let labelled = null; // the wave the lane labels were written for
let lastSignature = '';
let lastCheer = ''; // so a break never repeats the cheer before it

function levelFromUrl() {
  const l = new URLSearchParams(location.search).get('level');
  return l in LEVELS ? l : 'simple';
}

const board = () => `${GAME}:${level}`;
const fame = createFame({
  dialog: ui.fame,
  table: ui.scores,
  caption: ui.scoresCaption,
  initials: ui.dialog,
  board,
  order: ORDER,
  label: () => LEVELS[level].label,
  score: { head: 'Score', cell: String },
  columns: [
    { key: 'right', head: 'Right', cell: (v) => `${v}%` },
    { key: 'avg', head: 'Avg', cell: (v) => `${(v / 1000).toFixed(1)}s` },
  ],
});
const say = (text) => { ui.status.textContent = text; };

/** The lane buttons for the current level: a ring, one per lane. */
function buildLanes() {
  buttons = LEVELS[level].dirs.map((dir) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lane';
    b.dataset.dir = dir;
    b.setAttribute('aria-label', `${DIR_NAMES[dir]}: empty`);
    b.setAttribute('aria-disabled', 'true');
    return b;
  });
  ui.lanes.replaceChildren(...buttons);
  labelled = null;
}

/** Write what each lane holds, once per wave, for a screen reader. */
function label() {
  if (!g || labelled === g.wave) return;
  labelled = g.wave;
  for (const b of buttons) {
    const bug = g.wave.bugs.find((x) => x.dir === Number(b.dataset.dir));
    b.setAttribute('aria-label', `${DIR_NAMES[b.dataset.dir]}: ${bug.value}`);
  }
}

function paintCounters() {
  ui.score.textContent = String(g?.score ?? 0);
  const streak = g?.streak ?? 0;
  const mult = multiplier(streak);
  ui.streak.textContent = mult > 1 ? `${streak} ×${mult}` : String(streak);
  const lives = g?.lives ?? LIVES;
  ui.lamps.setAttribute('aria-label', `${lives} of ${LIVES} lights on`);
  [...ui.lamps.children].forEach((lamp, i) => lamp.classList.toggle('on', i < lives));
}

function draw() {
  const inner = side - 4; // the stage's border
  if (!inner) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (ui.canvas.width !== Math.round(inner * dpr)) {
    ui.canvas.width = Math.round(inner * dpr);
    ui.canvas.height = Math.round(inner * dpr);
  }
  ctx.setTransform(ui.canvas.width / inner, 0, 0, ui.canvas.height / inner, 0, 0);
  drawScene(ctx, inner, inner, colours, { g, aim, aimDir: g?.status === 'playing' ? aimDir : -1, still: still.matches, minBug: MIN_BUG });
  placeLanes(inner);
  paintWorth();
}

/** What the right answer is worth now, with the streak multiplier it would get; it counts down. */
function paintWorth() {
  const points = g && g.status === 'playing' ? worth(g) * multiplier(g.streak + 1) : 0;
  const text = points ? `+${points}` : '';
  if (ui.worth.textContent !== text) ui.worth.textContent = text;
}

/** Keep each lane button over its bug, so its focus ring and a pointer find the bug. */
function placeLanes(inner) {
  const geo = geometry(inner, inner, MIN_BUG);
  for (const b of buttons) {
    const dir = Number(b.dataset.dir);
    const bug = g?.wave.bugs.find((x) => x.dir === dir);
    const d = bug ? (still.matches ? Math.ceil(bug.d * STEPS) / STEPS : bug.d) : 1;
    const { x, y } = bugPoint(geo, dir, d);
    b.style.transform = `translate(${Math.round(x - TARGET / 2)}px, ${Math.round(y - TARGET / 2)}px)`;
    b.setAttribute('aria-disabled', String(!(g && g.status === 'playing' && bugIn(g, dir) && !g.wave.done)));
  }
}

/** With reduced motion a frame is drawn only when something visible changed. */
function signature() {
  if (!g) return 'idle';
  const bugs = g.wave.bugs.map((b) => `${Math.ceil(b.d * STEPS)}${b.fade >= 250 ? 'x' : ''}`).join(',');
  return `${g.asked}|${bugs}|${g.zap ? g.zap.dir : ''}|${aim}|${aimDir}`;
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
    aim = still.matches ? aimTo : turnToward(aim, aimTo, 1 - Math.exp(-dt / AIM_MS));
    for (const e of step(g, dt)) onEvent(e);
    if (g.status === 'over' && !moving(g)) loop.stop();
  },
  draw: frame,
});

function onEvent(e) {
  if (e.type === 'wave') {
    ui.question.textContent = g.wave.text;
    label();
  } else if (e.type === 'light') {
    sfx.lampOut();
    paintCounters();
    const left = e.lives === 1 ? '1 light left' : `${e.lives} lights left`;
    const fact = g.wave.fact;
    if (e.guess) say(`Too many wrong zaps in one wave: the answer was ${fact.a * fact.b}. ${left}.`);
    else say(`That one got through: ${fact.a} × ${fact.b} = ${fact.a * fact.b}. ${left}.`);
  } else if (e.type === 'break') {
    startBreak(e.summary);
  } else if (e.type === 'over') {
    endRun();
  }
}

/** After every ten answers the game waits on a short card; Continue starts the next wave. */
function startBreak(summary) {
  loop.stop();
  saveWeak();
  const seconds = (summary.avgMs / 1000).toFixed(1);
  const speed = summary.right ? ` Average when right: ${seconds} s.` : '';
  const label = summary.right === summary.total ? ' Slowest:' : ' Hardest:';
  showCard({
    title: lastCheer = cheerFor(summary, Math.random, lastCheer),
    text: `${summary.right} of ${summary.total} right first time.${speed}${summary.hardest.length ? label : ''}`,
    facts: summary.hardest,
    button: 'Continue',
  });
  say(`Break. ${summary.right} of ${summary.total} right first time.`);
  holdButton(ui.go); // the player is often still tapping when the card appears
}

/** Set the turret on a lane without firing (the keyboard's way: aim, then Space). */
function aimAt(dir) {
  if (dir < 0 || dir === aimDir) return;
  aimDir = dir;
  aimTo = aimFor(dir);
  const bug = g && bugIn(g, dir);
  say(`Aiming ${DIR_NAMES[dir].toLowerCase()}${bug ? `: ${bug.value}` : ''}.`);
  if (still.matches) frame();
}

function zapLane(dir) {
  if (!g || g.status !== 'playing' || dialogOpen()) return;
  aimDir = dir;
  aimTo = aimFor(dir);
  const result = zap(g, dir);
  if (!result) return;
  sfx.zap();
  if (result.type === 'right') {
    sfx.sparkle();
    say(`Right! +${result.points}${result.mult > 1 ? ` (streak ×${result.mult})` : ''}`);
  } else {
    sfx.buzz();
    if (!result.light) say(`Not that one. Pushed back, and the answer is worth ${result.worth} now.`);
  }
  paintCounters();
  if (still.matches) frame();
}

function startRun() {
  sfx.start();
  g = newGame(level, seeded(Math.floor(Math.random() * 2 ** 32)), memory.weak(board()));
  aimDir = 0;
  aimTo = aim = aimFor(aimDir);
  held.clear();
  labelled = null;
  lastSignature = '';
  ui.card.hidden = true;
  ui.lanes.inert = false;
  ui.stage.classList.remove('dark');
  ui.question.textContent = g.wave.text;
  label();
  paintCounters();
  say('Zap the bug with the right answer.');
  frame();
  loop.start();
  document.activeElement?.blur();
}

/** Show the card over the board: the start card, or the end of a run. */
function showCard({ title, text, facts = [], button = g ? 'Play again' : 'Start' }) {
  ui.cardTitle.textContent = title;
  ui.cardText.textContent = text;
  const lines = facts.slice(0, SHOWN).map((f) => {
    const li = document.createElement('li');
    li.textContent = f;
    return li;
  });
  if (facts.length > SHOWN) {
    const li = document.createElement('li');
    li.textContent = `and ${facts.length - SHOWN} more`;
    lines.push(li);
  }
  ui.practise.replaceChildren(...lines);
  ui.practise.hidden = !lines.length;
  ui.go.textContent = button;
  ui.card.hidden = false;
  ui.lanes.inert = true;
}

function saveWeak() {
  if (g) memory.setWeak(board(), mergeWeak(memory.weak(board()), g));
}

function endRun() {
  saveWeak();
  sfx.lampOut();
  ui.stage.classList.add('dark');
  paintCounters();
  const facts = practiseList(g);
  showCard({
    title: 'Lights out',
    text: `Score ${g.score}. Best streak ${g.bestStreak}.${facts.length ? ' Practise these:' : ''}`,
    facts,
  });
  say(`Lights out. Score ${g.score}.`);
  holdButton(ui.go); // the player is often still tapping when the card appears
  fame.offer({ value: g.score, shown: `${g.score} points`, extra: fameOf(g), grace: GRACE_MS });
}

/** Back to the start card for the current level. */
function toStart() {
  if (g) saveWeak();
  loop.stop();
  g = null;
  aimTo = aim = aimFor(1);
  lastSignature = '';
  ui.stage.classList.remove('dark');
  ui.question.textContent = '';
  buildLanes();
  paintCounters();
  showCard({ title: LEVELS[level].label, text: `Zap the bug that carries the right answer. ${HINTS[level]}` });
  say('');
  frame();
}

// A tap or click anywhere in a lane zaps the bug in it. The button's own click is for the keyboard
// and screen readers (it has no pointer position).
ui.stage.addEventListener('pointerdown', (e) => {
  if (!g || e.target.closest('.card')) return;
  const rect = ui.canvas.getBoundingClientRect();
  const geo = geometry(rect.width, rect.height, MIN_BUG);
  const dx = e.clientX - rect.left - geo.cx;
  const dy = e.clientY - rect.top - geo.cy;
  if (Math.hypot(dx, dy) < geo.logo / 2) return;
  zapLane(nearestDir((Math.atan2(dx, -dy) * 180) / Math.PI, LEVELS[level].dirs));
});
ui.lanes.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b && e.detail === 0) zapLane(Number(b.dataset.dir));
});

// The keyboard: the arrow keys turn the turret (two together, like up and right, aim at the corner
// between them), Q E Z C and the number pad aim at the corners and the sides, and Space or Enter
// fires at the lane it is set on. Taken before a focused level button can use the arrows to change
// level in the middle of a run.
const arrows = new Set(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']);
document.addEventListener('keydown', (e) => {
  if (!g || g.status !== 'playing' || e.ctrlKey || e.metaKey || e.altKey || dialogOpen()) return;
  const dirs = LEVELS[level].dirs;
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat) zapLane(aimDir);
    return;
  }
  let dir = -1;
  if (arrows.has(e.code)) {
    held.add(e.code);
    // Four lanes: the last arrow wins, since there is no corner between two of them.
    dir = dirOfArrows(held, dirs);
    if (dir < 0) dir = dirOfArrows([e.code], dirs);
  } else {
    dir = dirOfKey(e.code, dirs);
  }
  if (dir < 0) return;
  e.preventDefault();
  e.stopPropagation();
  aimAt(dir);
}, true);
document.addEventListener('keyup', (e) => held.delete(e.code));
addEventListener('blur', () => held.clear());

ui.go.addEventListener('click', () => {
  if (g?.status !== 'break') { startRun(); return; }
  resume(g);
  ui.card.hidden = true;
  ui.lanes.inert = false;
  ui.question.textContent = g.wave.text;
  labelled = null;
  label();
  say('Zap the bug with the right answer.');
  frame();
  loop.start();
  document.activeElement?.blur();
});

for (const r of ui.levels) {
  r.checked = r.value === level;
  r.addEventListener('change', () => {
    level = r.value;
    const url = new URL(location.href);
    if (level === 'simple') url.searchParams.delete('level');
    else url.searchParams.set('level', level);
    history.replaceState(null, '', url);
    toStart();
  });
}

/** The board is the biggest square the frame holds. */
function fit() {
  side = Math.floor(Math.min(ui.frame.clientWidth, ui.frame.clientHeight));
  ui.stage.style.setProperty('--size', `${side}px`);
  lastSignature = '';
  draw();
}
fit(); // now, so the first frame already has its size; a view transition photographs that frame
new ResizeObserver(fit).observe(ui.frame);

// The game waits while a dialog is open.
wireDialogs({ help: ui.help, fame, pause: () => loop.stop(), resume: () => { if (g?.status === 'playing') loop.start(); } });
still.addEventListener('change', () => { lastSignature = ''; frame(); });
addEventListener('pagehide', saveWeak);

initSettings();
fame.render();
toStart();
