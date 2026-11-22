// Notch Up's picture, drawn on a canvas by the game page and the hall's demo alike: the Notchup tower
// rising over the night city of notchup.fi. The Notchup logo hangs over the lobby, every tenth floor
// wears a magenta neon band, and the floor sliding above the top is trimmed in gold. Nothing flashes
// or shakes: a cut-off piece fades where it was, a perfect drop leaves a gold seam that fades, and a
// cheer's words swell in and fade over calm sparks. With `still` (reduced motion) the sliding floor
// moves in steps, nothing swells and there are no sparks.
//
// The sky and the distant city never change, so they are drawn once into off-screen canvases and
// copied; only the floors in view are drawn each frame.

import { skyline } from '../../js/city.js';
import { drawLogo } from '../../js/logo.js';
import { drawSparks } from '../../js/sparks.js';
import { BURST_MS, CHEER_MS, FADE_MS, FLOOR, SEAM_MS, START_WIDTH, WORLD, moverX, seeded } from './rules.js';

export const FONT = 'ui-monospace, Menlo, Consolas, monospace';
const WALL = '#0e1b33';
const WINDOW_OFF = 'rgb(24 42 72)';
const WINDOW_ON = 'rgb(242 201 76 / 0.8)';
const TOP_AT = 0.6;          // the camera keeps the sliding floor at about this share of the height
const CITY_DRIFT = 0.4;      // the distant city sinks this much slower than the tower: depth, calmly

/** Scale (px per world unit) and how much of the world fits in a canvas of w by h. */
export function viewOf(w, h) {
  const s = w / WORLD;
  return { s, high: h / s };
}

/** Where the camera wants to be (the world y at the bottom of the picture) for the tower as it is. */
export function cameraFor(g, h, w) {
  const { high } = viewOf(w, h);
  return g ? Math.max(0, (g.floors.length + 1) * FLOOR - high * TOP_AT) : 0;
}

/** Ease the camera from `from` toward `to` over about `ms`; with reduced motion it jumps. */
export const easeCamera = (from, to, dt, still, ms = 350) => (still ? to : from + (to - from) * (1 - Math.exp(-dt / ms)));

// A window is lit or not by its floor and column, so the same tower comes back on every frame.
const lit = (floor, col) => ((Math.imul(floor + 1, 2654435761) ^ Math.imul(col + 7, 40503)) >>> 0) % 100 < 45;

let sky = null;
let city = null;

function cached(slot, key, w, h, dpr, paint) {
  if (slot?.key === key) return slot;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  paint(g);
  return { key, canvas };
}

function paintSky(g, w, h, c) {
  g.fillStyle = c.bg;
  g.fillRect(0, 0, w, h);
  const glow = g.createLinearGradient(0, 0, 0, h);
  glow.addColorStop(0.4, 'rgb(94 242 255 / 0)');
  glow.addColorStop(1, 'rgb(94 242 255 / 0.1)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
  const rand = seeded(7);
  g.fillStyle = 'rgb(232 238 245 / 0.55)';
  for (let i = 0; i < 50; i++) g.fillRect(rand() * w, rand() * h * 0.8, 1, 1);
}

function paintCity(g, w, h) {
  const { s } = viewOf(w, h);
  const rand = seeded(3);
  g.save();
  g.translate(0, h);
  g.scale(s, -s);
  skyline(g, rand, -10, WORLD + 10, { top: 70, base: 30, wall: '#0a1429', windowOn: ['rgb(94 242 255 / 0.28)', 'rgb(242 201 76 / 0.3)'], lit: 0.14 });
  skyline(g, rand, -10, WORLD + 10, { top: 45, base: 18, wall: '#0c1830', windowOn: ['rgb(242 201 76 / 0.5)', 'rgb(94 242 255 / 0.4)'], lit: 0.22 });
  g.restore();
}

/** One floor of the tower: wall, a row of windows (or a neon band every tenth floor), a lit top edge. */
function drawFloor(ctx, c, n, x, w) {
  const left = x - w / 2;
  const y = n * FLOOR;
  ctx.fillStyle = WALL;
  ctx.fillRect(left, y, w, FLOOR);
  if (n > 0 && n % 10 === 0) {
    ctx.fillStyle = c.magenta;
    ctx.fillRect(left + 1.5, y + 4, w - 3, 3.5);
  } else if (n > 0) {
    for (let k = 0, wx = left + 2.5; wx < left + w - 5.5; k++, wx += 7) {
      ctx.fillStyle = lit(n, k) ? WINDOW_ON : WINDOW_OFF;
      ctx.fillRect(wx, y + 3.5, 3.6, 4.5);
    }
  }
  ctx.fillStyle = 'rgb(94 242 255 / 0.6)';
  ctx.fillRect(left, y + FLOOR - 0.6, w, 0.9);
}

/**
 * Draw one frame. `view`: g (the run, or null for the empty lot), camera (world y at the bottom of
 * the picture) and still (reduced motion).
 */
export function drawScene(ctx, w, h, c, { g, camera = 0, still = false }) {
  const dpr = ctx.getTransform().a;
  const { s, high } = viewOf(w, h);
  sky = cached(sky, `${w}x${h}@${dpr}`, w, h, dpr, (x) => paintSky(x, w, h, c));
  ctx.drawImage(sky.canvas, 0, 0, w, h);
  const sink = camera * CITY_DRIFT * s;
  if (sink < h) {
    city = cached(city, `${w}x${h}@${dpr}`, w, h, dpr, (x) => paintCity(x, w, h));
    ctx.drawImage(city.canvas, 0, sink, w, h);
  }

  ctx.save();
  ctx.translate(w / 2, h + camera * s);
  ctx.scale(s, -s);
  ctx.fillStyle = '#03070f';
  ctx.fillRect(-WORLD, -camera - 1, WORLD * 2, camera + 1);   // the street
  const floors = g?.floors ?? [{ x: 0, w: START_WIDTH }];
  const first = Math.max(0, Math.floor(camera / FLOOR));
  const last = Math.min(floors.length - 1, Math.ceil((camera + high) / FLOOR));
  for (let n = first; n <= last; n++) drawFloor(ctx, c, n, floors[n].x, floors[n].w);
  if (first === 0) {
    // The logo over the lobby door, drawn upright in the flipped world.
    ctx.save();
    ctx.translate(floors[0].x, FLOOR / 2);
    ctx.scale(1, -1);
    drawLogo(ctx, { x: 0, y: 0, size: FLOOR * 0.85 });
    ctx.restore();
  }

  if (g?.seam) {
    const f = floors[g.seam.floor];
    ctx.globalAlpha = still ? 1 : 1 - g.seam.age / SEAM_MS;
    ctx.fillStyle = c.gold;
    ctx.fillRect(f.x - f.w / 2 - 2, g.seam.floor * FLOOR - 0.8, f.w + 4, 1.6);
    ctx.globalAlpha = 1;
  }
  if (g?.cut) {
    ctx.globalAlpha = still ? 0.5 : 0.7 * (1 - g.cut.age / FADE_MS);
    drawFloor(ctx, c, g.cut.floor, g.cut.x, g.cut.w);
    ctx.globalAlpha = 1;
  }
  if (g?.status === 'playing') {
    const { w: mw } = g.mover;
    const mx = moverX(g, still);
    const n = floors.length;
    drawFloor(ctx, c, n, mx, mw);
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(mx - mw / 2, n * FLOOR, mw, FLOOR);
  }
  ctx.restore();

  if (g?.cheer) drawCheer(ctx, w, h, c, g.cheer, still);
}

/** A cheer: sparks bursting one after another in the sky; the count, the praise and a dry line swelling and fading. */
function drawCheer(ctx, w, h, c, cheer, still) {
  const unit = Math.min(w, h);
  if (!still) {
    for (const b of cheer.bursts) {
      const t = (cheer.age - b.delay) / BURST_MS;
      if (t >= 0 && t < 1) drawSparks(ctx, c, b.x * w, b.y * h, unit * (cheer.size === 'small' ? 0.035 : 0.05), t);
    }
  }
  const p = Math.min(1, cheer.age / CHEER_MS);
  const alpha = still ? 1 : p < 0.12 ? p / 0.12 : p > 0.7 ? (1 - p) / 0.3 : 1;
  const grow = still ? 1 : p < 0.12 ? 0.6 + (0.4 * p) / 0.12 : p < 0.6 ? 1 + (0.04 * (p - 0.12)) / 0.48 : 1.04 + (0.16 * (p - 0.6)) / 0.4;
  const big = Math.round(Math.min(w * (cheer.size === 'small' ? 0.1 : 0.12), h * 0.09));
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(w / 2, h * 0.24);
  ctx.scale(grow, grow);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `bold ${Math.round(big * 0.38)}px ${FONT}`;
  ctx.fillStyle = c.ink;
  ctx.fillText(cheer.count.toUpperCase(), 0, -big * 0.85);
  ctx.font = `900 ${big}px ${FONT}`;
  ctx.strokeStyle = c.bg;
  ctx.lineWidth = big * 0.16;
  ctx.strokeText(`${cheer.praise.toUpperCase()}!`, 0, 0);
  ctx.fillStyle = c.gold;
  ctx.fillText(`${cheer.praise.toUpperCase()}!`, 0, 0);
  ctx.font = `bold ${Math.round(big * 0.42)}px ${FONT}`;
  ctx.lineWidth = big * 0.1;
  ctx.strokeText(cheer.quip, 0, big * 0.9);
  ctx.fillStyle = c.cyan;
  ctx.fillText(cheer.quip, 0, big * 0.9);
  ctx.restore();
}
