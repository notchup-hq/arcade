// Patch Night's picture, drawn on a canvas by the game page and the hall's demo alike: a dark server
// room drawn as a circuit board, the Notchup logo in the middle (its arrow turns to aim), and the bugs
// crawling in along their lanes. Nothing flashes: a zap is a gold line that fades, a zapped bug curls
// up and fades. With `still` (reduced motion) bugs step in small still steps and the zap line simply
// disappears.

import { drawLogo } from '../../js/logo.js';
import { BURST_MS, FADE_MS, ZAP_MS } from './rules.js';

export const FONT = 'ui-monospace, Menlo, Consolas, monospace';
export const STEPS = 10;     // a bug's steps along its lane with reduced motion
const STILL_FADE_MS = 250;   // a zapped bug stays this long before it is gone, with reduced motion

/** Where things are on a board of this size: the centre, the logo, the bugs and their lanes. */
export function geometry(w, h, minBug = 0) {
  const size = Math.min(w, h);
  const bug = Math.max(minBug, size * 0.07);
  const logo = size * 0.16;                  // the logo's diameter
  const inner = logo / 2 + bug * 0.7;        // a bug that reaches the logo sits here
  const outer = size / 2 - bug - 2;          // a bug comes in here
  return { cx: w / 2, cy: h / 2, size, bug, logo, inner, outer };
}

/** The centre of a bug in lane `dir` that is `d` of the way from the logo (0) to the edge (1). */
export function bugPoint(geo, dir, d) {
  const r = geo.inner + (geo.outer - geo.inner) * d;
  const a = (dir * Math.PI) / 4;
  return { x: geo.cx + Math.sin(a) * r, y: geo.cy - Math.cos(a) * r };
}

/** The arrow's angle for a lane: the logo's arrow rests pointing up and to the right (45 degrees). */
export const aimFor = (dir) => dir * 45 - 45;

/** Turn `from` towards `to` (degrees) by a share of the way, the short way round. */
export function turnToward(from, to, share) {
  const gap = ((to - from + 540) % 360) - 180;
  return from + gap * share;
}

const quantised = (d) => Math.ceil(d * STEPS) / STEPS;

/**
 * @param {{ g: object | null, aim: number, aimDir?: number, still?: boolean, minBug?: number }} view
 *   g is the game (js/ rules state) or null for an empty board; aim is the arrow's angle in degrees;
 *   aimDir is the lane the turret is set on (its trace turns gold), if any.
 */
export function drawScene(ctx, w, h, c, { g, aim, aimDir = -1, still = false, minBug = 0 }) {
  const geo = geometry(w, h, minBug);
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, w, h);
  drawBoard(ctx, geo, c, g?.cfg.dirs ?? [0, 2, 4, 6], aimDir);
  if (g?.zap) drawZap(ctx, geo, c, g, still);
  if (g?.wave) {
    // The bugs furthest out first, so a bug near the logo is drawn on top.
    const bugs = [...g.wave.bugs].sort((p, q) => q.d - p.d);
    for (const b of bugs) drawBug(ctx, geo, c, b, still);
  }
  if (g?.burst && !still) drawBurst(ctx, geo, c, g.burst);
  drawLogo(ctx, { x: geo.cx, y: geo.cy, size: geo.logo, aim });
}

const SPARKS = 14;

/** The sparks of a right zap: a ring of dots drifting out of the bug, slowing down and fading. Calm: no flash. */
function drawBurst(ctx, geo, c, burst) {
  const t = burst.age / BURST_MS;
  const { x, y } = bugPoint(geo, burst.dir, burst.d);
  const colours = [c.gold, c.cyan, c.magenta];
  ctx.save();
  ctx.globalAlpha = Math.pow(1 - t, 1.5);
  for (let i = 0; i < SPARKS; i++) {
    const a = (i / SPARKS) * Math.PI * 2 + (i % 2) * 0.2;
    const reach = geo.bug * (i % 2 ? 1.6 : 2.4) * (1 - (1 - t) * (1 - t));
    ctx.fillStyle = colours[i % 3];
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * reach, y + Math.sin(a) * reach, Math.max(1.5, geo.bug * 0.2 * (1 - t * 0.5)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The board: a ring around the logo, a trace along every lane ending in a pad. */
function drawBoard(ctx, geo, c, dirs, aimDir) {
  const { cx, cy, inner, outer, bug } = geo;
  ctx.save();
  ctx.strokeStyle = c.dim;
  ctx.fillStyle = c.dim;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.55;
  ctx.setLineDash([4, 6]);
  for (const r of [inner + bug * 0.9, (inner + outer) / 2 + bug * 0.5]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.lineWidth = Math.max(2, bug * 0.18);
  for (const dir of dirs) {
    const a = (dir * Math.PI) / 4;
    const s = Math.sin(a);
    const co = -Math.cos(a);
    // The lane the turret is set on is lit gold.
    ctx.strokeStyle = dir === aimDir ? c.gold : c.dim;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(cx + s * inner, cy + co * inner);
    ctx.lineTo(cx + s * (outer + bug * 0.6), cy + co * (outer + bug * 0.6));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + s * (outer + bug * 0.9), cy + co * (outer + bug * 0.9), bug * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The zap: a gold line from the logo to the bug, fading (or, with `still`, there and then gone). */
function drawZap(ctx, geo, c, g, still) {
  const { zap, wave } = g;
  const target = wave?.bugs.find((b) => b.dir === zap.dir);
  const a = (zap.dir * Math.PI) / 4;
  const reach = target ? bugPoint(geo, zap.dir, target.d) : bugPoint(geo, zap.dir, 1);
  const start = geo.logo * 0.5;
  const end = Math.hypot(reach.x - geo.cx, reach.y - geo.cy) - geo.bug;
  ctx.save();
  ctx.globalAlpha = still ? 1 : Math.max(0, 1 - zap.age / ZAP_MS);
  ctx.strokeStyle = zap.right ? c.gold : c.ink;
  ctx.lineWidth = Math.max(2, geo.bug * 0.2);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(geo.cx + Math.sin(a) * start, geo.cy - Math.cos(a) * start);
  ctx.lineTo(geo.cx + Math.sin(a) * Math.max(start, end), geo.cy - Math.cos(a) * Math.max(start, end));
  ctx.stroke();
  ctx.restore();
}

/** A beetle facing the logo, its number on its back. A bug that has been zapped curls up as it fades. */
function drawBug(ctx, geo, c, b, still) {
  const gone = b.fade >= (still ? STILL_FADE_MS : FADE_MS);
  if (gone) return;
  const t = b.fade < 0 ? 0 : Math.min(b.fade / FADE_MS, 1);
  const { x, y } = bugPoint(geo, b.dir, still ? quantised(b.d) : b.d);
  const r = geo.bug * (1 - 0.3 * t);
  const colour = b.dir % 2 ? c.magenta : c.cyan;
  ctx.save();
  ctx.globalAlpha = still ? 1 : 1 - t;
  ctx.translate(x, y);
  ctx.save();
  ctx.rotate(((b.dir * 45 + 180) * Math.PI) / 180); // the head points at the logo
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.lineCap = 'round';
  const legs = r * (1.45 - 0.5 * t);          // legs fold in as the bug curls up
  ctx.beginPath();
  for (const row of [-0.55, 0, 0.55]) {
    for (const side of [-1, 1]) {
      ctx.moveTo(side * r * 0.8, row * r * 0.9);
      ctx.lineTo(side * legs, row * r * 0.9 + r * 0.3);
    }
  }
  ctx.moveTo(-r * 0.3, -r * 1.05);
  ctx.lineTo(-r * 0.5, -r * 1.45);
  ctx.moveTo(r * 0.3, -r * 1.05);
  ctx.lineTo(r * 0.5, -r * 1.45);
  ctx.stroke();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(0, -r * 1.0, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b1730';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = c.ink;
  ctx.font = `bold ${Math.round(r * (String(b.value).length > 2 ? 0.8 : 0.95))}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(b.value), 0, 1);
  ctx.restore();
}
