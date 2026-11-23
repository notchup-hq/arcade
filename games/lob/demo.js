// Lob in attract mode: two computer players trade throws on the cabinet's screen by the real rules,
// calmly (a long look at the wind, a slow bulb, a soft pop), until one billboard has taken three hits.
// Then the logo notches up, this browser's top 5 shows, and the next street starts. Nothing shakes or
// flashes.

import { createTail, drawNotchUp } from '../../js/screens.js';
import { aimComputer, createMatch, learn, newMemory, rivalFor, seeded, shown, stageFor, takeTurn } from './rules.js';
import { drawScene } from './scene.js';

const AIM_MS = 1200;
const RING_MS = 400;
const WON_MS = 3600;
const NOTCH_MS = 600;
const SPEED = 0.9;       // path points (1/60 s each) per tick
const SMOKE_FRAME = 1000 / 12; // the smoke is redrawn this often, so a waiting screen stays cheap
const SKILL = 0.55;      // good enough to hit now and then

/** @param {{ scores: () => Array<{ label: string, table: Array<{ initials: string, value: number }> }> }} source the levels' top runs to show */
export function createDemo({ scores, seed = 5 }) {
  const rand = seeded(seed);
  let level = 0;
  let rival;
  let match;
  let memory;
  const tail = createTail(scores, String);
  let phase;
  let timer;
  let anim;
  let trails;
  let notches;
  let smoke = 0;

  function reset() {
    rival = rivalFor(level++);
    match = createMatch({ stage: stageFor(rival.street, false, rival.stack), windMax: 4, rand });
    memory = { left: newMemory(), right: newMemory() };
    trails = [];
    anim = null;
    phase = 'aim';
    timer = 0;
    notches = 0;
    // Start with a throw already traded, so even a still frame (reduced motion) shows a duel under way.
    const first = turn();
    const second = turn();
    trails = [{ path: second.path, alpha: 0.35 }, { path: first.path, alpha: 0.15 }];
  }

  /** The computer on the current side throws, and learns how it went. */
  function turn() {
    const side = match.turn;
    const wind = match.wind;
    const shot = aimComputer({ stage: match.stage, side, wind, skill: SKILL, memory: memory[side], rand });
    const flight = takeTurn(match, shot.angle, shot.power);
    learn(memory[side], match.stage, side, { ...shot, wind }, flight);
    return flight;
  }

  reset();

  function advance(dt) {
    timer += dt;
    if (phase === 'aim' && timer >= AIM_MS) {
      anim = { flight: turn(), at: 0 };
      phase = 'fly';
      return true;
    }
    if (phase === 'fly') {
      anim.at += SPEED;
      if (anim.at >= anim.flight.path.length - 1) { phase = 'ring'; timer = 0; }
      return true;
    }
    if (phase === 'ring') {
      if (timer < RING_MS) return anim.flight.hit;
      trails = [{ path: anim.flight.path, alpha: 0.35 }, ...trails.slice(0, 1).map((t) => ({ ...t, alpha: 0.15 }))];
      anim = null;
      phase = match.winner ? 'won' : 'aim';
      timer = 0;
      return true;
    }
    if (phase === 'won') {
      const n = Math.min(Math.floor(timer / NOTCH_MS), 4);
      if (timer >= WON_MS) { phase = 'scores'; tail.open(); return true; }
      if (n !== notches) { notches = n; return true; }
      return false;
    }
    if (phase === 'scores') {
      if (tail.done) { reset(); return true; }
      return tail.step(dt);
    }
    return false;
  }

  return {
    step(dt) {
      smoke += dt;
      const drifted = Math.floor(smoke / SMOKE_FRAME) !== Math.floor((smoke - dt) / SMOKE_FRAME);
      return advance(dt) || (drifted && phase !== 'scores');
    },

    draw(ctx, w, h, c) {
      if (phase === 'scores') return tail.draw(ctx, w, h, c);
      const path = anim?.flight.path;
      const seen = shown(match, anim?.flight, phase === 'ring');
      drawScene(ctx, w, h, c, {
        stage: match.stage,
        hits: seen.hits,
        wind: seen.wind,
        rival,
        holding: phase === 'aim' ? match.turn : null,
        target: (anim ? anim.flight.side : match.turn) === 'left' ? 'right' : 'left',
        trails,
        smoke,
        guide: null,
        bulb: phase === 'fly' ? path[Math.min(Math.floor(anim.at), path.length - 1)] : null,
        pop: phase === 'ring' && anim.flight.hit ? { x: anim.flight.landing.x, y: anim.flight.landing.y, t: timer / RING_MS } : null,
      });
      if (phase === 'won') drawNotchUp(ctx, w, h, c, notches, 'THREE HITS');
    },
  };
}
