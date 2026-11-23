// Lob's rules: no DOM, so the page, the hall's demo and the tests share them. Two rooftops face each
// other across a street. A bulb is thrown with an angle and a power, pulled by gravity and pushed by
// the wind, and a billboard that takes three hits is out. A chimney stands in the middle of the street, so a
// flat throw at full power hits it and the bulb has to be lobbed. Coordinates are in world units with y up;
// the left rooftop belongs to the first player (the visitor in a solo run), the right one to the rival.

import { seeded } from '../../js/random.js';

export { seeded };

export const WINS = 3;                 // hits that put a billboard out
export const MIN_ANGLE = 5;
export const MAX_ANGLE = 85;
export const MIN_POWER = 10;
export const MAX_POWER = 100;
export const DEFAULT_ANGLE = 50;
export const DEFAULT_POWER = 60;
export const MAX_WIND = 9;
export const FIRST_STACK = 18;         // how far the chimney first stands above the higher roof
const STACK_PER_LEVEL = 1.5;           // and how much higher it gets with each rival
const MAX_STACK = 26;                  // the chimney stops growing here, so the last rivals stay beatable
const LIFT_STEP = 2;                   // degrees the computer tries higher, one by one, after a bulb hit the chimney

const GRAVITY = 40;                    // units per s²
const SPEED_PER_POWER = 0.8;           // units per s for each point of power
const WIND_PUSH = 0.8;                 // sideways units per s² for each point of wind
const STEP = 1 / 120;                  // physics step, s; the path keeps every second one (1/60 s)
const MAX_STEPS = 1200;                // a throw that has not landed by then (10 s) is lost
const GUIDE_SECONDS = 0.5;             // the dotted guide shows only the start of the arc

const other = (side) => (side === 'left' ? 'right' : 'left');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- Streets: each rival has a stretch of its own ----------

/** Roof heights are for a landscape stage; an upright stage stretches them (see stageFor). */
export const STREETS = [
  { name: 'Harbour Row', left: 30, right: 38, seed: 11 },
  { name: 'Tram Street', left: 40, right: 30, seed: 23 },
  { name: 'Old Market', left: 34, right: 34, seed: 37 },
  { name: 'Clock Lane', left: 28, right: 44, seed: 41 },
  { name: 'Mill Yard', left: 44, right: 32, seed: 59 },
  { name: 'Skybridge Walk', left: 36, right: 42, seed: 73 },
];

const SIGNS = [
  'PIXEL PIZZA', 'NIGHT OWL', 'LUCKY LAUNDRY', 'TURBO TACOS', 'ZEN ZEPPELIN', 'DISCO DINER',
  'COSMIC CAFE', 'HOTEL ORBIT', 'MOON BAKERY', 'NEON NOODLES',
];
const SIGN_COLOURS = ['magenta', 'cyan', 'green', 'gold'];

/** The rival at `level` (0 for the first): its sign, its street and how well it aims. */
export function rivalFor(level) {
  const skill = Math.min(0.9, 0.3 + 0.06 * level);
  return {
    level,
    sign: SIGNS[level % SIGNS.length],
    colour: SIGN_COLOURS[level % SIGN_COLOURS.length],
    street: STREETS[level % STREETS.length],
    skill,
    windMax: Math.min(MAX_WIND, 2 + level),
    stack: Math.min(MAX_STACK, FIRST_STACK + STACK_PER_LEVEL * level),
  };
}

/**
 * The stage for a street. `stack` is how far the chimney in the middle stands above the higher roof.
 * On an upright screen the rooftops are closer and taller, so the tall screen is
 * used for higher arcs. Each side has its building, the spot the thrower stands on, and the billboard
 * (`board`, a box a bulb can hit) on the outer end of the roof.
 */
export function stageFor(street, portrait, stack = FIRST_STACK) {
  const w = portrait ? 100 : 160;
  const h = portrait ? 150 : 100;
  const building = portrait ? 30 : 44;
  const roofs = portrait
    ? { left: Math.round(street.left * 1.5 + 6), right: Math.round(street.right * 1.5 + 6) }
    : { left: street.left, right: street.right };
  const boardW = portrait ? 18 : 22;
  const mk = (side) => {
    const left = side === 'left';
    const roof = roofs[side];
    const x0 = left ? 0 : w - building;
    const x1 = left ? building : w;
    return {
      dir: left ? 1 : -1,
      x0,
      x1,
      roof,
      stand: { x: left ? x1 - 6 : x0 + 6, y: roof + 3 },
      board: { x: left ? 2 : w - 2 - boardW, y: roof + 5, w: boardW, h: 15 },
    };
  };
  const chimneyW = portrait ? 4 : 5;
  const chimney = {
    x0: (w - chimneyW) / 2,
    x1: (w + chimneyW) / 2,
    top: Math.max(roofs.left, roofs.right) + (portrait ? stack * 1.5 : stack),
  };
  return { street, portrait, w, h, chimney, sides: { left: mk('left'), right: mk('right') } };
}

// ---------- Flight ----------

/** Where bulbs go: everything a throw can hit or land on. */
function collide(stage, side, x, y) {
  const target = stage.sides[other(side)];
  const own = stage.sides[side];
  const inBox = (b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  if (inBox(target.board)) return 'board';
  if (inBox(own.board)) return 'own';
  for (const s of [own, target]) if (x >= s.x0 && x <= s.x1 && y <= s.roof) return 'roof';
  if (x >= stage.chimney.x0 && x <= stage.chimney.x1 && y <= stage.chimney.top) return 'chimney';
  if (y <= 0) return 'street';
  if (x < -30 || x > stage.w + 30) return 'away';
  return null;
}

/**
 * Throw a bulb from `side`'s roof. `angle` is degrees above flat, toward the other roof; `power` 10 to 100;
 * `wind` an integer, positive blowing to the right. Returns the path (a point every 1/60 s), whether it
 * hit the other billboard, where it landed and what it landed on ('board', 'roof', 'own', 'chimney', 'street', 'away').
 * With `seconds` it stops early, for the guide.
 */
export function fly(stage, side, angle, power, wind, seconds = Infinity) {
  const s = stage.sides[side];
  const rad = (angle * Math.PI) / 180;
  const speed = power * SPEED_PER_POWER;
  const ax = wind * WIND_PUSH;
  let { x, y } = s.stand;
  let vx = Math.cos(rad) * speed * s.dir;
  let vy = Math.sin(rad) * speed;
  const path = [[x, y]];
  let where = 'away';
  const steps = Math.min(MAX_STEPS, Math.floor(seconds / STEP));
  for (let i = 1; i <= steps; i++) {
    vx += ax * STEP;
    vy -= GRAVITY * STEP;
    x += vx * STEP;
    y += vy * STEP;
    const hit = collide(stage, side, x, y);
    if (hit) { where = hit; path.push([x, y]); break; }
    if (i % 2 === 0) path.push([x, y]);
    if (i === steps) where = null;
  }
  const landing = path[path.length - 1];
  return { path, where, hit: where === 'board', landing: { x: landing[0], y: landing[1] } };
}

/** The start of the arc, for the dotted guide. */
export const guide = (stage, side, angle, power, wind) => fly(stage, side, angle, power, wind, GUIDE_SECONDS).path;

// ---------- A match ----------

/** A new wind for the next throw: an integer from -windMax to windMax. */
export function rollWind(rand, windMax) {
  return Math.round((rand() * 2 - 1) * windMax);
}

/** A match between the left and right rooftops; the left one throws first. */
export function createMatch({ stage, windMax, rand = Math.random }) {
  return {
    stage,
    windMax,
    rand,
    turn: 'left',
    wind: rollWind(rand, windMax),
    hits: { left: 0, right: 0 },     // hits each billboard has taken
    throws: { left: 0, right: 0 },
    winner: null,                    // 'left' or 'right' once a billboard is out
  };
}

/** Take the current side's throw. Returns the flight with `side` added; moves the match on. */
export function takeTurn(match, angle, power) {
  if (match.winner) throw new Error('the match is over');
  const side = match.turn;
  const usedWind = match.wind;
  const flight = fly(match.stage, side, clamp(angle, MIN_ANGLE, MAX_ANGLE), clamp(power, MIN_POWER, MAX_POWER), usedWind);
  match.throws[side] += 1;
  if (flight.hit) match.hits[other(side)] += 1;
  if (match.hits[other(side)] >= WINS) {
    match.winner = side;
  } else {
    match.turn = other(side);
    match.wind = rollWind(match.rand, match.windMax);
  }
  return { ...flight, side, wind: usedWind };
}

/**
 * What the board shows while `flight` (the latest throw) is still being shown: its hit counts once it has
 * landed, and the wind is the one it was thrown in, not the one for the next turn. With no flight, the match as it is.
 */
export function shown(match, flight, landed) {
  if (!flight) return { hits: match.hits, wind: match.wind };
  const hits = { ...match.hits };
  if (flight.hit && !landed) hits[flight.side === 'left' ? 'right' : 'left'] -= 1;
  return { hits, wind: flight.wind };
}

// ---------- A solo run ----------

export const newRun = () => ({ level: 0, beaten: 0, score: 0, over: false });

/** What a won match is worth: 100, and 10 more for every throw under ten. */
export const matchPoints = (throws) => 100 + Math.max(0, 10 - throws) * 10;

/** Record a won match and move on to the next rival. */
export function winMatch(run, throws) {
  run.beaten += 1;
  run.score += matchPoints(throws);
  run.level += 1;
}

/** A lost match ends the run. */
export function loseRun(run) {
  run.over = true;
}

// ---------- The computer: aims like a person ----------

/** The horizontal distance from the thrower to the middle of the other billboard. */
const reachNeeded = (stage, side) => {
  const t = stage.sides[other(side)].board;
  return Math.abs(t.x + t.w / 2 - stage.sides[side].stand.x);
};

/**
 * How far a throw carries: the horizontal distance it has gone when it comes down to the height of the
 * other billboard's middle. Nothing is in the way in this sum, so it measures the throw, not the street.
 */
export function carry(stage, side, angle, power, wind) {
  const s = stage.sides[side];
  const t = stage.sides[other(side)].board;
  const mid = t.y + t.h / 2;
  const rad = (angle * Math.PI) / 180;
  let x = s.stand.x;
  let y = s.stand.y;
  let vx = Math.cos(rad) * power * SPEED_PER_POWER * s.dir;
  let vy = Math.sin(rad) * power * SPEED_PER_POWER;
  for (let i = 0; i < MAX_STEPS && !(vy < 0 && y <= mid); i++) {
    vx += wind * WIND_PUSH * STEP;
    vy -= GRAVITY * STEP;
    x += vx * STEP;
    y += vy * STEP;
  }
  return Math.abs(x - s.stand.x);
}

/** The power that carries a throw at this angle to the middle of the other billboard, if the wind is `wind`. */
export function solvePower(stage, side, angle, wind) {
  const need = reachNeeded(stage, side);
  let lo = MIN_POWER;
  let hi = MAX_POWER;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (carry(stage, side, angle, mid, wind) < need) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** A normal random number, from two uniform ones. */
const gauss = (rand) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());

/** What a computer player remembers: its last throw. Make one per match and side. */
export const newMemory = () => ({ last: null });

/**
 * The computer's next throw as { angle, power }. The first guess is rough and only half notices the wind.
 * After a miss it scales its power by how far off the bulb landed, as a person would, and adds what it
 * thinks the change in wind is worth; a computer that reads the wind badly overcorrects when the wind
 * changes a lot. After a bulb hit the chimney it raises its angle until the throw it has worked out clears it.
 * Better rivals (higher `skill`) read the wind better and are steadier.
 */
export function aimComputer({ stage, side, wind, skill, memory, rand }) {
  const sense = skill * 0.9;                    // how much of the wind it reads
  const wobble = 30 * (1 - skill);              // how unsteady its hand is, in power points
  const base = stage.portrait ? 64 : 45;
  const first = base + gauss(rand) * 6 * (1 - skill);
  let angle = Math.round(clamp(memory.last ? memory.last.angle : first, MIN_ANGLE, MAX_ANGLE));
  while (memory.last?.blocked && angle < MAX_ANGLE && fly(stage, side, angle, solvePower(stage, side, angle, wind * sense), wind * sense).where === 'chimney') {
    angle = Math.min(MAX_ANGLE, angle + LIFT_STEP);
  }
  let power = solvePower(stage, side, angle, wind * sense);
  if (memory.last) {
    const m = memory.last;
    const scaled = m.power * Math.sqrt(reachNeeded(stage, side) / Math.max(m.reach, 5));
    power = scaled + (power - solvePower(stage, side, angle, m.wind * sense));
  }
  power = Math.round(clamp(power + gauss(rand) * wobble, MIN_POWER, MAX_POWER));
  return { angle, power };
}

/** Tell the computer how its throw turned out; `flight` is the result of the throw, if it has one. */
export function learn(memory, stage, side, { angle, power, wind }, flight = null) {
  memory.last = { angle, power, wind, reach: carry(stage, side, angle, power, wind), blocked: flight?.where === 'chimney' };
}
