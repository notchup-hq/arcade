// Lob's picture, drawn on a canvas by the page and by the hall's demo: a night street seen from one
// rooftop to the other, in the style of the city on notchup.fi (navy night, building shapes, lit
// windows, billboards on steel frames). The camera never moves and nothing here flashes or shakes:
// the only motion is the bulb in flight and a soft ring where it hits.
//
// The street itself never changes during a match, so it is drawn once into an off-screen canvas and
// copied; what changes (smoke, signs, bulb, trails) is drawn over it.

import { skyline } from '../../js/city.js';
import { drawLogo } from '../../js/logo.js';
import { WINS, seeded } from './rules.js';

const FONT = 'ui-monospace, Menlo, Consolas, monospace';
const STEEL = '#5a7088';
const WALL = '#0e1b33';
const DARK_LETTER = '#2b3850';

/** Where the world sits in a canvas of w by h: as big as fits, centred across, standing on the bottom edge. */
export function fitWorld(w, h, stage) {
  const s = Math.min(w / stage.w, h / stage.h);
  return { s, ox: (w - stage.w * s) / 2 };
}

/** Upright text in the flipped world (y up): `at` is the middle of the text's baseline. */
function text(ctx, str, x, y, size, fill, align = 'center') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, -1);
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fill;
  ctx.fillText(str, 0, 0);
  ctx.restore();
}

/** A rooftop building with its lit windows; it runs off the edge of the picture. */
function building(ctx, c, rand, side, reach) {
  const x0 = side.dir > 0 ? reach[0] : side.x0;
  const x1 = side.dir > 0 ? side.x1 : reach[1];
  ctx.fillStyle = WALL;
  ctx.fillRect(x0, 0, x1 - x0, side.roof);
  for (let wy = 4; wy < side.roof - 4; wy += 7) {
    for (let wx = x0 + 3; wx < x1 - 4; wx += 7) {
      ctx.fillStyle = rand() < 0.45 ? 'rgb(242 201 76 / 0.8)' : 'rgb(24 42 72)';
      ctx.fillRect(wx, wy, 3.6, 3.4);
    }
  }
  ctx.fillStyle = 'rgb(94 242 255 / 0.6)';   // the lit edge of the roof
  ctx.fillRect(x0, side.roof - 0.5, x1 - x0, 0.9);
}

/** The chimney in the middle of the street: tall enough that a flat throw at full power hits it. */
function paintChimney(g, { chimney }) {
  const { x0, x1, top } = chimney;
  g.fillStyle = '#1d3250';
  g.fillRect(x0, 0, x1 - x0, top);
  g.fillStyle = 'rgb(90 112 136 / 0.5)';      // steel bands
  for (let y = 8; y < top - 3; y += 9) g.fillRect(x0, y, x1 - x0, 0.7);
  g.fillStyle = 'rgb(94 242 255 / 0.55)';     // a lit rim on top, like the roofs
  g.fillRect(x0 - 0.5, top - 0.5, x1 - x0 + 1, 0.9);
}

let cached = null;

/** The street: sky, stars, moon, two skylines, the street and the two buildings. */
function street(ctx, w, h, c, stage) {
  const dpr = ctx.getTransform().a;
  const key = `${w}x${h}@${dpr}:${stage.street.seed}:${stage.portrait}:${stage.chimney.top}`;
  if (cached?.key !== key) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintStreet(g, w, h, c, stage);
    cached = { key, canvas };
  }
  ctx.drawImage(cached.canvas, 0, 0, w, h);
}

function paintStreet(g, w, h, c, stage) {
  const { s, ox } = fitWorld(w, h, stage);
  const reach = [-ox / s, (w - ox) / s];
  const rand = seeded(stage.street.seed);

  g.fillStyle = c.bg;
  g.fillRect(0, 0, w, h);
  const glow = g.createLinearGradient(0, 0, 0, h);
  glow.addColorStop(0.4, 'rgb(94 242 255 / 0)');
  glow.addColorStop(1, 'rgb(94 242 255 / 0.1)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);

  g.save();
  g.translate(ox, h);
  g.scale(s, -s);
  const top = Math.max(stage.h, h / s);
  g.fillStyle = 'rgb(232 238 245 / 0.55)';
  for (let i = 0; i < 40; i++) {
    g.fillRect(reach[0] + rand() * (reach[1] - reach[0]), top * (0.55 + rand() * 0.45), 0.45, 0.45);
  }
  g.fillStyle = 'rgb(232 238 245 / 0.13)';
  g.beginPath();
  g.arc(stage.w * 0.5, stage.h * 0.82, stage.portrait ? 6 : 5, 0, Math.PI * 2);
  g.fill();

  const far = { top: stage.h * 0.62, base: stage.h * 0.28, wall: '#0a1429', windowOn: ['rgb(94 242 255 / 0.28)', 'rgb(242 201 76 / 0.3)'], lit: 0.14 };
  skyline(g, rand, reach[0] - 10, reach[1] + 10, far);
  const near = { top: stage.h * 0.5, base: stage.h * 0.2, wall: '#0c1830', windowOn: ['rgb(242 201 76 / 0.5)', 'rgb(94 242 255 / 0.4)'], lit: 0.22 };
  skyline(g, rand, reach[0] - 10, reach[1] + 10, near);

  g.fillStyle = 'rgb(6 11 22)';
  g.fillRect(reach[0], 0, reach[1] - reach[0], 3);
  const { left, right } = stage.sides;
  for (let x = left.x1 + 14; x < right.x0 - 6; x += stage.portrait ? 18 : 24) {
    g.fillStyle = STEEL;
    g.fillRect(x - 0.3, 0, 0.6, 7);
    g.fillStyle = 'rgb(242 201 76 / 0.85)';
    g.beginPath();
    g.arc(x, 7.4, 0.9, 0, Math.PI * 2);
    g.fill();
  }
  building(g, c, rand, left, reach);
  building(g, c, rand, right, reach);
  paintChimney(g, stage);
  g.restore();
}

const SMOKE_PUFFS = 6;
const SMOKE_PERIOD = 9000; // ms for a puff to rise to the top: slow enough to stay in the background

/**
 * Smoke that leans with the wind: puffs rise from the chimney, swelling and fading, and drift sideways the
 * more the higher they are and the stronger it blows. `t` is the time in ms (0 for a still picture).
 */
function smoke(ctx, stage, wind, t) {
  const { x0, x1, top } = stage.chimney;
  const x = (x0 + x1) / 2;
  for (let k = 0; k < SMOKE_PUFFS; k++) {
    const u = (t / SMOKE_PERIOD + k / SMOKE_PUFFS) % 1;
    ctx.fillStyle = `rgb(205 220 240 / ${0.34 * (1 - u) * Math.min(1, u * 8)})`;
    ctx.beginPath();
    ctx.arc(x + wind * 0.5 * u * u * 9, top + 1.5 + u * 20, 1.2 + u * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function frame(ctx, b, roof) {
  ctx.strokeStyle = STEEL;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(b.x + 3, roof); ctx.lineTo(b.x + 3, b.y);
  ctx.moveTo(b.x + b.w - 3, roof); ctx.lineTo(b.x + b.w - 3, b.y);
  ctx.moveTo(b.x + 3, roof); ctx.lineTo(b.x + b.w - 3, b.y);
  ctx.moveTo(b.x + b.w - 3, roof); ctx.lineTo(b.x + 3, b.y);
  ctx.stroke();
  ctx.fillStyle = STEEL;
  ctx.fillRect(b.x + 1, b.y - 0.4, b.w - 2, 1.4);   // the catwalk
}

/** Three small bulbs above a sign: the hits it can still take. */
function lives(ctx, c, b, hits) {
  for (let i = 0; i < WINS; i++) {
    const x = b.x + b.w / 2 + (i - 1) * 3;
    const y = b.y + b.h + 2.4;
    ctx.beginPath();
    ctx.arc(x, y, 0.95, 0, Math.PI * 2);
    if (i < WINS - hits) { ctx.fillStyle = c.gold; ctx.fill(); } else { ctx.strokeStyle = c.dim; ctx.lineWidth = 0.4; ctx.stroke(); }
  }
}

/** The visitor's billboard: the Notchup mark, dimmer with every hit. */
function ownSign(ctx, c, b, roof, hits) {
  frame(ctx, b, roof);
  const y = b.y + 1.2;
  const ph = b.h - 1.2;
  ctx.fillStyle = '#050a14';
  ctx.fillRect(b.x, y, b.w, ph);
  ctx.strokeStyle = c.cyan;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(b.x, y, b.w, ph);
  ctx.save();
  ctx.translate(b.x + b.w / 2, y + ph / 2);
  ctx.scale(1, -1);
  drawLogo(ctx, { x: 0, y: 0, size: ph - 2 });
  ctx.restore();
  if (hits) {
    ctx.fillStyle = `rgb(5 10 20 / ${0.3 * hits})`;
    ctx.fillRect(b.x, y, b.w, ph);
  }
  lives(ctx, c, b, hits);
}

/** The rival's neon sign: its letters go dark with the hits it takes. */
function rivalSign(ctx, c, b, roof, hits, sign, colour) {
  frame(ctx, b, roof);
  const y = b.y + 1.2;
  const ph = b.h - 1.2;
  ctx.fillStyle = '#050a14';
  ctx.fillRect(b.x, y, b.w, ph);
  ctx.strokeStyle = c[colour];
  ctx.lineWidth = 0.5;
  ctx.strokeRect(b.x, y, b.w, ph);
  const lines = sign.split(' ');
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(4.2, (b.w - 2) / (longest * 0.62));
  const total = lines.join('').length;
  const dark = Math.round((total * hits) / WINS);
  let n = 0;
  lines.forEach((line, row) => {
    const ly = y + ph / 2 + ((lines.length - 1) / 2 - row) * (size * 1.3);
    const start = b.x + b.w / 2 - ((line.length - 1) * size * 0.6) / 2;
    for (let i = 0; i < line.length; i++) text(ctx, line[i], start + i * size * 0.6, ly, size, n++ < dark ? DARK_LETTER : c[colour]);
  });
  lives(ctx, c, b, hits);
}

/** Gold corner brackets round the sign that is being aimed at, so it is plain that the sign is the target. */
function brackets(ctx, c, b) {
  const x0 = b.x - 1.6;
  const x1 = b.x + b.w + 1.6;
  const y0 = b.y - 0.4;
  const y1 = b.y + b.h + 0.4;
  const k = 3;
  ctx.strokeStyle = c.gold;
  ctx.lineWidth = 0.7;
  ctx.lineCap = 'square';
  ctx.beginPath();
  for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    ctx.moveTo(x + dx * k, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * k);
  }
  ctx.stroke();
}

function thrower(ctx, c, side, colour, holding) {
  const { x, y } = side.stand;
  ctx.fillStyle = c[colour];
  ctx.fillRect(x - 1.2, side.roof, 2.4, 3.2);
  ctx.beginPath();
  ctx.arc(x, side.roof + 4.7, 1.3, 0, Math.PI * 2);
  ctx.fill();
  if (holding) {
    ctx.fillStyle = c.gold;
    ctx.beginPath();
    ctx.arc(x + side.dir * 2.1, y, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function dotted(ctx, path, colour, alpha, width) {
  if (path.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.setLineDash([0.6, 1.8]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw one frame. `view`: stage, hits {left, right}, wind, rival {sign, colour}, holding (the side with a
 * bulb in hand, or null), target (the side whose sign is being aimed at), trails [{ path, alpha }] (the last throws, faint), guide (the start of the arc
 * being aimed, or null), smoke (ms, 0 for still), bulb ([x, y] in flight, or null) and pop ({ x, y, t } with t from 0 to 1).
 */
export function drawScene(ctx, w, h, c, view) {
  const { stage } = view;
  street(ctx, w, h, c, stage);
  const { s, ox } = fitWorld(w, h, stage);
  const { left, right } = stage.sides;
  ctx.save();
  ctx.translate(ox, h);
  ctx.scale(s, -s);

  smoke(ctx, stage, view.wind, view.smoke);
  ownSign(ctx, c, left.board, left.roof, view.hits.left);
  rivalSign(ctx, c, right.board, right.roof, view.hits.right, view.rival.sign, view.rival.colour);
  brackets(ctx, c, stage.sides[view.target].board);
  thrower(ctx, c, left, 'cyan', view.holding === 'left');
  thrower(ctx, c, right, 'magenta', view.holding === 'right');

  for (const t of view.trails) dotted(ctx, t.path, c.gold, t.alpha, 0.55);
  if (view.guide) {
    ctx.fillStyle = c.ink;
    ctx.globalAlpha = 0.85;
    for (let i = 3; i < view.guide.length; i += 3) {
      ctx.beginPath();
      ctx.arc(view.guide[i][0], view.guide[i][1], 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (view.bulb) {
    const [x, y] = view.bulb;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 4.5);
    glow.addColorStop(0, 'rgb(242 201 76 / 0.6)');
    glow.addColorStop(1, 'rgb(242 201 76 / 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff4c9';
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (view.pop) {
    const { x, y, t } = view.pop;
    ctx.fillStyle = `rgb(242 201 76 / ${0.2 * (1 - t)})`;
    ctx.strokeStyle = `rgb(242 201 76 / ${0.8 * (1 - t)})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + 9 * t, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** A line of big text over the picture, for the demo and for results. */
export function banner(ctx, w, h, c, str, colour = 'gold') {
  ctx.fillStyle = 'rgb(5 10 20 / 0.72)';
  ctx.fillRect(0, h * 0.38, w, h * 0.24);
  ctx.fillStyle = c[colour];
  ctx.font = `bold ${Math.round(Math.min(w / (str.length * 0.65), h * 0.12))}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, w / 2, h / 2);
}
