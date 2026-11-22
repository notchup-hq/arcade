// What a card shows, drawn on a canvas for both the page and the hall's demo: the card's back, and its
// face, which is a letter or a small picture from one of the other games (the Notchup logo, a bug, a
// bulb, a fuse, a floor of the tower). Every face has a colour of its own, so a pair looks alike.

import { drawLogo } from '../../js/logo.js';
import { FONT } from '../../js/screens.js';

// A face's colour, by the neon colour names the stylesheet defines (js/attract.js reads them).
const TINTS = ['cyan', 'gold', 'magenta', 'green'];
const SPRITE_TINT = { bug: 'green', bulb: 'gold', fuse: 'cyan', floor: 'magenta' };

const tintOf = (face, c) => c[SPRITE_TINT[face] ?? TINTS[face.charCodeAt(0) % TINTS.length]];

function path(ctx, points, close = false) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

function bug(ctx, r, colour) {
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const row of [-0.55, 0, 0.55]) {
    for (const side of [-1, 1]) {
      ctx.moveTo(side * r * 0.8, row * r * 0.9);
      ctx.lineTo(side * r * 1.45, row * r * 0.9 + r * 0.3);
    }
  }
  ctx.moveTo(-r * 0.3, -r * 1.05); ctx.lineTo(-r * 0.5, -r * 1.45);
  ctx.moveTo(r * 0.3, -r * 1.05); ctx.lineTo(r * 0.5, -r * 1.45);
  ctx.stroke();
  ctx.fillStyle = colour;
  ctx.beginPath(); ctx.arc(0, -r, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0b1730';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(0, r * 0.9); ctx.stroke();
}

function bulb(ctx, r, colour) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = '#0b1730';
  ctx.beginPath(); ctx.arc(0, -r * 0.25, r * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = colour;
  ctx.beginPath(); ctx.arc(0, -r * 0.25, r * 0.32, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-r * 0.3, r * 0.5, r * 0.6, r * 0.22);
  ctx.fillRect(-r * 0.22, r * 0.78, r * 0.44, r * 0.2);
}

function fuse(ctx, r, colour) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = '#0b1730';
  ctx.beginPath(); ctx.roundRect(-r * 0.45, -r * 0.95, r * 0.9, r * 1.9, r * 0.15); ctx.fill(); ctx.stroke();
  ctx.fillStyle = colour;
  ctx.fillRect(-r * 0.45, -r * 0.95, r * 0.9, r * 0.28);
  ctx.fillRect(-r * 0.45, r * 0.67, r * 0.9, r * 0.28);
  path(ctx, [[0, -r * 0.55], [-r * 0.18, -r * 0.1], [r * 0.18, r * 0.1], [0, r * 0.55]]);
  ctx.stroke();
}

function floor(ctx, r, colour, c) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = '#0b1730';
  ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
  ctx.strokeRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
  ctx.fillStyle = c.gold;
  for (const [x, y] of [[-0.55, -0.55], [0.1, -0.55], [-0.55, 0.1], [0.1, 0.1]]) ctx.fillRect(x * r, y * r, r * 0.45, r * 0.45);
  ctx.fillStyle = colour;
  ctx.fillRect(-r * 0.8, r * 0.62, r * 1.6, r * 0.18);
}

/** A face (a letter, or a sprite name from rules.js) centred at x, y in a card of side `size`. */
export function drawFace(ctx, face, x, y, size, c) {
  const colour = tintOf(face, c);
  if (face === 'logo') { drawLogo(ctx, { x, y, size: size * 0.7 }); return; }
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.lineJoin = 'round';
  const r = size * 0.3;
  if (face === 'bug') bug(ctx, r, colour);
  else if (face === 'bulb') bulb(ctx, r, colour);
  else if (face === 'fuse') fuse(ctx, r, colour);
  else if (face === 'floor') floor(ctx, r, colour, c);
  else {
    ctx.fillStyle = colour;
    ctx.font = `bold ${Math.round(size * 0.62)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(face, 0, size * 0.03);
  }
  ctx.restore();
}

/** The back of a card: a navy plate with a gold notch (a small tooth of the logo's gear). */
export function drawBack(ctx, x, y, size, c) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = c.dim;
  ctx.lineWidth = Math.max(2, size * 0.04);
  ctx.strokeRect(-size * 0.36, -size * 0.36, size * 0.72, size * 0.72);
  ctx.fillStyle = c.gold;
  path(ctx, [[-size * 0.14, size * 0.12], [0, -size * 0.14], [size * 0.14, size * 0.12]], true);
  ctx.fill();
  ctx.restore();
}
