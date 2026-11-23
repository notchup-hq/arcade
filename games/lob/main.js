// Lob on its own page. A solo run opens straight into a match against the computer; two players on
// one device is a small switch. You aim by dragging back from your rooftop and letting go (a phone or a
// mouse), with the − and + buttons and Throw, or with the arrow keys and Space. The page fits the screen
// without scrolling; help and the hall of fame open in dialogs.

import { createFame } from '../../js/fame.js';
import { neonColours } from '../../js/attract.js';
import { createLoop } from '../../js/loop.js';
import { logoSvg } from '../../js/logo.js';
import { initSettings } from '../../js/settings.js';
import { sfx } from '../../js/sound.js';
import {
  DEFAULT_ANGLE, DEFAULT_POWER, MAX_ANGLE, MAX_POWER, MIN_ANGLE, MIN_POWER, WINS,
  aimComputer, createMatch, guide, learn, loseRun, matchPoints, newMemory, newRun, rivalFor, shown, stageFor, takeTurn, winMatch,
} from './rules.js';
import { drawScene } from './scene.js';

const BOARD = 'lob:solo';
const ORDER = 'high'; // more points are better
const FLIGHT_SPEED = 1.3;  // path points (1/60 s each) per tick: a throw takes about 2 s
const RING_MS = 350;       // the soft pop where a bulb hits
const PAUSE_MS = 450;      // a beat after a miss
const THINK_MS = 800;      // the computer's turn starts this long after yours ends
const MIN_DRAG = 14;       // CSS px: a shorter drag is a tap, not a throw
const REPEAT_DELAY = 350;
const REPEAT_MS = 70;

const $ = (id) => document.getElementById(id);
const ui = {
  arena: $('arena'),
  canvas: $('scene'),
  angle: $('angle'),
  power: $('power'),
  windArrow: $('wind-arrow'),
  windNumber: $('wind-number'),
  windWords: $('wind-words'),
  sideLabel: $('side-label'),
  sideValue: $('side-value'),
  status: $('status'),
  badge: $('badge'),
  go: $('go'),
  players: $('players'),
  controls: [...document.querySelectorAll('.aim button')],
  help: $('help'),
  fame: $('fame'),
  scores: $('scores'),
  dialog: $('initials'),
};
const ctx = ui.canvas.getContext('2d');
const colours = neonColours();
const still = window.matchMedia('(prefers-reduced-motion: reduce)');

let twoPlayers = false;
let run;
let rival;
let stage;
let match;
let computer;
let aim;
let phase = 'aim';       // 'aim' (waiting for a throw), 'fly' (a bulb is in the air), 'wait' (between turns), 'over'
let anim = null;         // the throw being shown: { flight, at, stage: 'flight' | 'ring', timer }
let trails = [];
let primary = 'throw';   // what the big button does now: 'throw', 'next', 'again'
let drag = null;
let epoch = 0;           // bumped when a match is thrown away, so old timers do nothing
let matches = 0;
let smokeMs = 0;         // the smoke's clock; it stays at 0 for visitors who asked for less motion

const names = () => (twoPlayers ? { left: 'Player 1', right: 'Player 2' } : { left: 'You', right: rival.sign });
const myTurn = () => phase === 'aim' && (twoPlayers || match.turn === 'left');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const say = (text) => { ui.status.textContent = text; };

// ---------- The picture ----------

function render() {
  const w = ui.canvas.clientWidth;
  const h = ui.canvas.clientHeight;
  if (!w || !stage) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const a = aim[match.turn];
  let bulb = null;
  let pop = null;
  if (anim?.stage === 'flight') {
    const path = anim.flight.path;
    const i = Math.min(Math.floor(anim.at), path.length - 1);
    bulb = path[i];
  } else if (anim?.stage === 'ring' && anim.flight.hit) {
    pop = { x: anim.flight.landing.x, y: anim.flight.landing.y, t: Math.min(anim.timer / RING_MS, 1) };
  }
  const seen = shown(match, anim?.flight, anim?.stage === 'ring');
  drawScene(ctx, w, h, colours, {
    stage,
    hits: seen.hits,
    wind: seen.wind,
    rival,
    holding: phase === 'aim' && !match.winner ? match.turn : null,
    target: (anim ? anim.flight.side : match.turn) === 'left' ? 'right' : 'left',
    smoke: smokeMs,
    trails,
    guide: myTurn() ? guide(stage, match.turn, a.angle, a.power, match.wind) : null,
    bulb,
    pop,
  });
}

function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ui.canvas.width = Math.round(ui.canvas.clientWidth * dpr);
  ui.canvas.height = Math.round(ui.canvas.clientHeight * dpr);
  render();
}
sizeCanvas(); // now, so the first frame is already sharp; a view transition photographs that frame
new ResizeObserver(sizeCanvas).observe(ui.canvas);

// ---------- The readouts and the controls ----------

function showAim() {
  const a = aim[twoPlayers ? match.turn : 'left']; // in a solo run the readouts stay on your own aim
  ui.angle.textContent = `${a.angle}°`;
  ui.power.textContent = String(a.power);
}

function showWind() {
  const w = shown(match, anim?.flight, false).wind;
  ui.windArrow.textContent = w > 0 ? '→' : w < 0 ? '←' : '';
  ui.windNumber.textContent = String(Math.abs(w));
  ui.windWords.textContent = w > 0 ? ' blowing right' : w < 0 ? ' blowing left' : ' no wind';
}

function showSide() {
  if (twoPlayers) {
    ui.sideLabel.textContent = 'Turn';
    ui.sideValue.textContent = match.turn === 'left' ? 'P1' : 'P2';
  } else {
    ui.sideLabel.textContent = 'Score';
    ui.sideValue.textContent = String(run.score);
  }
}

function setPrimary(mode) {
  primary = mode;
  ui.go.textContent = { throw: 'Throw', next: 'Next rival', again: twoPlayers ? 'Play again' : 'New run' }[mode];
}

function showAll() {
  showAim();
  showWind();
  showSide();
  const canAim = myTurn();
  for (const b of ui.controls) b.disabled = !canAim;
  ui.go.disabled = primary === 'throw' && !canAim;
  ui.players.setAttribute('aria-pressed', String(twoPlayers));
  render();
}

function setAim(side, angle, power) {
  const a = aim[side];
  a.angle = Math.round(clamp(angle, MIN_ANGLE, MAX_ANGLE));
  a.power = Math.round(clamp(power, MIN_POWER, MAX_POWER));
  showAim();
  render();
}

/** A step on the angle or the power of the side whose turn it is, toward the other roof for power. */
function nudge(what, by) {
  if (!myTurn()) return;
  const a = aim[match.turn];
  if (what === 'angle') setAim(match.turn, a.angle + by, a.power);
  else setAim(match.turn, a.angle, a.power + by);
}

// ---------- A match ----------

function startMatch() {
  epoch++;
  const portrait = ui.arena.clientWidth / ui.arena.clientHeight < 1.1;
  rival = twoPlayers ? { ...rivalFor(matches), sign: 'PLAYER 2', windMax: 5 } : rivalFor(run.level);
  stage = stageFor(rival.street, portrait);
  match = createMatch({ stage, windMax: rival.windMax });
  computer = newMemory();
  aim = { left: { angle: DEFAULT_ANGLE, power: DEFAULT_POWER }, right: { angle: DEFAULT_ANGLE, power: DEFAULT_POWER } };
  trails = [];
  anim = null;
  phase = 'aim';
  matches++;
  ui.badge.className = 'badge-logo';
  setPrimary('throw');
  showAll();
  say(twoPlayers ? 'Player 1: hit the sign. Drag back and let go.' : `Rival ${run.level + 1}: ${rival.sign}. Hit the sign! Drag back and let go.`);
}

function startFresh() {
  run = newRun();
  matches = 0;
  startMatch();
}

function whereText(where) {
  return { roof: 'landed on a roof', street: 'fell in the street', away: 'flew off', own: 'hit its own sign' }[where] ?? 'missed';
}

function resultText(flight) {
  const n = names();
  const victim = flight.side === 'left' ? 'right' : 'left';
  const more = WINS - match.hits[victim];
  if (flight.hit) {
    if (twoPlayers) return `${n[flight.side]} hits ${n[victim]}, ${more} more to go.`;
    return flight.side === 'left' ? `Hit! ${rival.sign} can take ${more} more.` : `Your billboard took a hit, ${more} more and it is out.`;
  }
  const subject = twoPlayers ? `${n[flight.side]}'s bulb` : flight.side === 'left' ? 'Your bulb' : "The rival's bulb";
  return `${subject} ${whereText(flight.where)}.`;
}

function throwNow(angle, power) {
  phase = 'fly';
  drag = null;
  const thrown = { angle, power, wind: match.wind };
  const flight = takeTurn(match, angle, power);
  sfx.lob();
  anim = { flight, thrown, at: 0, stage: 'flight', timer: 0 };
  showAll();
  if (still.matches) {
    (flight.hit ? sfx.pop : sfx.thud)();
    finishThrow();
  } else {
    loop.start();
  }
}

function doThrow() {
  if (!myTurn()) return;
  const a = aim[match.turn];
  throwNow(a.angle, a.power);
}

function computerThrow(token) {
  if (token !== epoch) return;
  const shot = aimComputer({ stage, side: 'right', wind: match.wind, skill: rival.skill, memory: computer, rand: Math.random });
  throwNow(shot.angle, shot.power);
}

const loop = createLoop({
  step(dt) {
    if (!anim) return;
    if (anim.stage === 'flight') {
      anim.at += FLIGHT_SPEED;
      if (anim.at >= anim.flight.path.length - 1) {
        anim.stage = 'ring';
        anim.timer = 0;
        (anim.flight.hit ? sfx.pop : sfx.thud)();
      }
    } else {
      anim.timer += dt;
      if (anim.timer >= (anim.flight.hit ? RING_MS : PAUSE_MS)) finishThrow();
    }
  },
  draw: render,
});

// The smoke drifts slowly: redrawn about 15 times a second, and not at all in a hidden tab or with reduced motion.
const smokeLoop = createLoop({ step: (dt) => { smokeMs += dt; }, draw: render, dt: 1000 / 15 });
if (!still.matches) smokeLoop.start();

function finishThrow() {
  loop.stop();
  const { flight, thrown } = anim;
  anim = null;
  trails = [{ path: flight.path, alpha: 0.35 }, ...trails.slice(0, 1).map((t) => ({ ...t, alpha: 0.15 }))];
  if (flight.side === 'right' && !twoPlayers) learn(computer, stage, 'right', thrown);
  if (match.winner) {
    endMatch();
    return;
  }
  const text = resultText(flight);
  phase = 'wait';
  showAll();
  const next = match.turn;
  const turnText = twoPlayers ? `${names()[next]}: your throw.` : next === 'left' ? 'Your throw.' : '';
  say(`${text} ${turnText}`);
  if (!twoPlayers && next === 'right') {
    const token = epoch;
    setTimeout(() => computerThrow(token), THINK_MS);
  } else {
    phase = 'aim';
    showAll();
  }
}

async function endMatch() {
  phase = 'over';
  const winner = match.winner;
  if (twoPlayers) {
    ui.badge.className = 'badge-logo fixed';
    sfx.win();
    setPrimary('again');
    showAll();
    say(`${names()[winner]} wins with ${match.throws[winner]} throws!`);
    ui.go.focus();
    return;
  }
  if (winner === 'left') {
    const points = matchPoints(match.throws.left);
    winMatch(run, match.throws.left);
    ui.badge.className = 'badge-logo fixed';
    sfx.fanfare();
    setPrimary('next');
    showAll();
    say(`${rival.sign} is out! +${points}. Score ${run.score}. Notch up!`);
    ui.go.focus();
    return;
  }
  loseRun(run);
  ui.badge.className = 'badge-logo sparked';
  sfx.spark();
  setPrimary('again');
  showAll();
  say(`Your billboard is out. Run over: ${run.beaten} ${run.beaten === 1 ? 'rival' : 'rivals'} beaten, ${run.score} points.`);
  if (!(await fame.offer({ value: run.score, shown: `${run.score} points`, extra: { rivals: run.beaten } }))) ui.go.focus();
}

ui.go.addEventListener('click', () => {
  if (primary === 'throw') doThrow();
  else if (primary === 'next') startMatch();
  else startFresh();
});

ui.players.addEventListener('click', () => {
  twoPlayers = !twoPlayers;
  startFresh();
});

// ---------- Aiming: buttons, drag and keys ----------

for (const [id, what, by] of [['angle-down', 'angle', -1], ['angle-up', 'angle', 1], ['power-down', 'power', -1], ['power-up', 'power', 1]]) {
  const b = $(id);
  let delay = 0;
  let repeat = 0;
  const stop = () => { clearTimeout(delay); clearInterval(repeat); };
  // A press steps once, then keeps stepping while held; a keyboard press is a click with no pointer.
  b.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    nudge(what, by);
    stop();
    delay = setTimeout(() => { repeat = setInterval(() => nudge(what, by), REPEAT_MS); }, REPEAT_DELAY);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(type, stop);
  b.addEventListener('click', (e) => { if (e.detail === 0) nudge(what, by); });
}

/** The aim a drag from `from` to `to` (CSS px) stands for: pulled back and down throws up and forward. */
function dragAim(from, to) {
  const dir = match.turn === 'left' ? 1 : -1;
  const up = to.y - from.y;
  const forward = (from.x - to.x) * dir;
  const angle = (Math.atan2(up, Math.max(forward, 0)) * 180) / Math.PI;
  const len = Math.hypot(up, forward);
  const full = clamp(Math.min(ui.canvas.clientWidth, ui.canvas.clientHeight) * 0.45, 90, 200);
  return { angle, power: MIN_POWER + (len / full) * (MAX_POWER - MIN_POWER), len };
}

ui.canvas.addEventListener('pointerdown', (e) => {
  if (!myTurn() || (e.pointerType === 'mouse' && e.button)) return;
  drag = { id: e.pointerId, from: { x: e.clientX, y: e.clientY }, aimed: false };
  ui.canvas.setPointerCapture(e.pointerId);
});
ui.canvas.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const a = dragAim(drag.from, { x: e.clientX, y: e.clientY });
  if (a.len < MIN_DRAG) return;
  drag.aimed = true;
  setAim(match.turn, a.angle, a.power);
});
ui.canvas.addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const aimed = drag.aimed;
  drag = null;
  if (aimed) doThrow();
});
ui.canvas.addEventListener('pointercancel', () => { drag = null; });

// Keys: up and down for the angle, left and right for the power (toward the other roof is more), Space throws.
document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('dialog, input')) return;
  if (e.key === ' ' || e.key === 'Enter') {
    if (e.target.closest?.('button')) return;
    e.preventDefault();
    if (primary === 'throw') doThrow();
    return;
  }
  const by = e.shiftKey ? 5 : 1;
  const toward = match.turn === 'left' ? 1 : -1;
  if (e.key === 'ArrowUp') nudge('angle', by);
  else if (e.key === 'ArrowDown') nudge('angle', -by);
  else if (e.key === 'ArrowRight') nudge('power', by * toward);
  else if (e.key === 'ArrowLeft') nudge('power', -by * toward);
  else return;
  e.preventDefault();
});

// ---------- Hall of fame ----------

const fame = createFame({
  dialog: ui.fame,
  table: ui.scores,
  initials: ui.dialog,
  board: () => BOARD,
  order: ORDER,
  score: { head: 'Score', cell: String },
  columns: [{ key: 'rivals', head: 'Rivals', cell: String }],
  empty: 'No runs on this browser yet. Beat a rival to be the first.',
});

$('help-open').addEventListener('click', () => ui.help.showModal());
$('fame-open').addEventListener('click', () => { fame.render(); ui.fame.showModal(); });

ui.badge.replaceChildren(logoSvg('logo badge-mark'));
initSettings();
fame.render();
startFresh();
