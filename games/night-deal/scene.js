// Night Deal's picture, shared by the page and the hall's demo: the table of layout.js in the neon
// colours. Spades and clubs are cyan, hearts and diamonds magenta, and the suit's shape tells them
// apart too. Suits are drawn as shapes, not letters of a font, so every phone shows the same ones.

import { drawLogo } from '../../js/logo.js';
import { CARDS, isRed, place } from './rules.js';

const FONT = 'ui-sans-serif, system-ui, sans-serif';
const FACE = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** Below this size a corner's letter is a smudge, so it is left out. */
const LEGIBLE = 10;

const inkOf = (card, c) => (isRed(card) ? c.magenta : c.cyan);

/** One suit as a shape about `s` tall, centred on (x, y); 0 spades, 1 clubs, 2 hearts, 3 diamonds. */
function suit(ctx, kind, x, y, s) {
  ctx.beginPath();
  const heart = (flip) => {
    const k = flip ? -1 : 1;
    ctx.moveTo(x, y + k * 0.46 * s);
    ctx.bezierCurveTo(x - 0.78 * s, y + k * -0.06 * s, x - 0.46 * s, y + k * -0.56 * s, x, y + k * -0.2 * s);
    ctx.bezierCurveTo(x + 0.46 * s, y + k * -0.56 * s, x + 0.78 * s, y + k * -0.06 * s, x, y + k * 0.46 * s);
  };
  if (kind === 2) heart(false);
  else if (kind === 3) {
    ctx.moveTo(x, y - 0.5 * s);
    ctx.lineTo(x + 0.38 * s, y);
    ctx.lineTo(x, y + 0.5 * s);
    ctx.lineTo(x - 0.38 * s, y);
  } else if (kind === 0) {
    heart(true);
    ctx.moveTo(x, y + 0.1 * s);
    ctx.lineTo(x + 0.2 * s, y + 0.5 * s);
    ctx.lineTo(x - 0.2 * s, y + 0.5 * s);
  } else {
    for (const [dx, dy] of [[0, -0.27], [-0.27, 0.08], [0.27, 0.08]]) {
      ctx.moveTo(x + dx * s + 0.23 * s, y + dy * s);
      ctx.arc(x + dx * s, y + dy * s, 0.23 * s, 0, Math.PI * 2);
    }
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.18 * s, y + 0.5 * s);
    ctx.lineTo(x - 0.18 * s, y + 0.5 * s);
  }
  ctx.closePath();
  ctx.fill();
}

const outline = (ctx, x, y, w, h) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, w * 0.1);
};

/** The back of a card: the Notchup logo, dimmed so the face-up cards stay the loudest thing on the table. */
function back(ctx, x, y, w, h) {
  ctx.globalAlpha = 0.75;
  drawLogo(ctx, { x: x + w / 2, y: y + h / 2, size: Math.min(w, h) * 0.7 });
  ctx.globalAlpha = 1;
}

/** One card at (x, y); `full` when all of it shows, so it also gets the big suit. */
function card(ctx, lay, c, { id, up }, x, y, full) {
  const { cw, ch, font } = lay;
  outline(ctx, x, y, cw, ch);
  ctx.fillStyle = c.bg;
  ctx.fill();
  ctx.globalAlpha = up ? 0.12 : 0.05;
  ctx.fillStyle = c.ink;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = up ? c.ink : c.dim;
  ctx.stroke();
  if (!up) {
    if (full) back(ctx, x, y, cw, ch);
    return;
  }
  const { rank, suit: kind } = CARDS[id];
  const ink = inkOf(CARDS[id], c);
  const pad = Math.max(3, Math.round(cw * 0.07));
  ctx.fillStyle = ink;
  ctx.font = `700 ${font}px ${FONT}`;
  ctx.textBaseline = 'top';
  const mark = font * 0.8;
  let after = 0;
  if (font >= LEGIBLE) { // a small picture (the hall's screen) shows the suits and leaves the letters out
    const text = FACE[rank - 1];
    ctx.fillText(text, x + pad, y + pad * 0.6);
    after = ctx.measureText(text).width;
  }
  suit(ctx, kind, x + pad + after + mark * 0.55, y + pad * 0.6 + font * 0.55, mark);
  if (full) suit(ctx, kind, x + cw / 2, y + ch * 0.64, cw * 0.46);
}

/** An open circle with an arrowhead: clockwise on an empty draw pile (turn the discard pile over), anticlockwise for undo. */
function arrow(ctx, x, y, r, anticlockwise) {
  const start = -Math.PI / 2;
  const end = start + (anticlockwise ? -1 : 1) * Math.PI * 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, start, end, anticlockwise);
  ctx.stroke();
  const px = x + r * Math.cos(end);
  const py = y + r * Math.sin(end);
  const [nx, ny] = [Math.cos(end), Math.sin(end)];
  const [tx, ty] = anticlockwise ? [Math.sin(end), -Math.cos(end)] : [-Math.sin(end), Math.cos(end)];
  ctx.beginPath();
  ctx.moveTo(px + nx * r * 0.55, py + ny * r * 0.55);
  ctx.lineTo(px - nx * r * 0.55, py - ny * r * 0.55);
  ctx.lineTo(px + tx * r * 0.9, py + ty * r * 0.9);
  ctx.closePath();
  ctx.fill();
}

const dashed = (ctx, r, c, glow = false) => {
  outline(ctx, r.x, r.y, r.w, r.h);
  ctx.setLineDash(glow ? [] : [4, 4]);
  ctx.lineWidth = glow ? 2.5 : 1.5;
  ctx.strokeStyle = glow ? glow : c.dim;
  ctx.stroke();
  ctx.setLineDash([]);
};

/**
 * Draw the table `lay` of state `g` on a `w` by `h` canvas context. `view` is optional: `at`, a map of
 * card id to where it is now ({ x, y }, a card on its way or in a hand), drawn on top; `undo`, whether
 * there is anything to undo; `mark`, a run to outline ({ rect }), and `targets`, rectangles that would
 * take the card in hand.
 */
export function drawTable(ctx, c, g, lay, view = {}) {
  const { w, h, cw, ch } = lay;
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, w, h);
  for (const [pile, r] of Object.entries(lay.slots)) {
    dashed(ctx, r, c);
    if (pile[0] === 'f') {
      ctx.fillStyle = c.dim;
      ctx.globalAlpha = 0.45;
      suit(ctx, place(pile), r.x + cw / 2, r.y + ch / 2, cw * 0.4);
      ctx.globalAlpha = 1;
    }
  }
  ctx.strokeStyle = c.dim;
  ctx.fillStyle = c.dim;
  ctx.lineWidth = 2;
  if (!g.stock.length && g.waste.length) arrow(ctx, lay.slots.s.x + cw / 2, lay.slots.s.y + ch / 2, cw * 0.22, false);
  ctx.strokeStyle = ctx.fillStyle = view.undo ? c.cyan : c.dim;
  arrow(ctx, lay.undo.x + lay.undo.w / 2, lay.undo.y + ch / 2, Math.min(cw, lay.undo.w) * 0.22, true);

  const last = new Map(lay.cards.map((card, k) => [card.pile, k]));
  const flying = view.at ?? new Map();
  lay.cards.forEach((entry, k) => {
    if (flying.has(entry.id)) return;
    card(ctx, lay, c, entry, entry.x, entry.y, last.get(entry.pile) === k);
  });
  for (const entry of lay.cards) {
    const at = flying.get(entry.id);
    if (at) card(ctx, lay, c, entry, at.x, at.y, true);
  }
  for (const r of view.targets ?? []) dashed(ctx, r, c, c.cyan);
  if (view.mark) dashed(ctx, view.mark, c, c.gold);
}
