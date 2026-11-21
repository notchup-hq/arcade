// The two screens every game's attract mode ends with: the Notchup logo notching up under a line of
// text, then this browser's top 5. Drawn with the neon colours from js/attract.js.

import { drawLogo, NOTCH_STEP } from './logo.js';

export const FONT = 'ui-monospace, Menlo, Consolas, monospace';

/** The logo with `notches` of its gear turned (0 to 4) over a dimmed picture, and `label` under it. */
export function drawNotchUp(ctx, w, h, c, notches, label) {
  ctx.fillStyle = 'rgb(5 10 20 / 0.8)';
  ctx.fillRect(0, 0, w, h);
  const size = Math.min(w, h) * 0.5;
  drawLogo(ctx, { x: w / 2, y: h * 0.42, size, turn: notches * NOTCH_STEP, lift: Math.min(notches / 4, 1) });
  ctx.fillStyle = c.gold;
  ctx.font = `bold ${Math.round(Math.min(w, h) * 0.09)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, h * 0.84);
}

/** The top 5 of `table` (entries of { initials, value }), `show` turning a value into text. */
export function drawScores(ctx, w, h, c, table, show) {
  const line = Math.min(h / 9, w / 12);
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = c.cyan;
  ctx.font = `bold ${Math.round(line * 0.8)}px ${FONT}`;
  ctx.fillText('HALL OF FAME', w / 2, line * 1.3);
  ctx.font = `bold ${Math.round(line * 0.62)}px ${FONT}`;
  if (!table.length) {
    ctx.fillStyle = c.ink;
    ctx.fillText('NO SCORES YET', w / 2, h / 2);
    ctx.fillStyle = c.gold;
    ctx.fillText('BE THE FIRST', w / 2, h / 2 + line);
    return;
  }
  table.slice(0, 5).forEach((e, k) => {
    const y = line * (3 + k * 1.15);
    ctx.fillStyle = k === 0 ? c.gold : c.ink;
    ctx.textAlign = 'left';
    ctx.fillText(`${k + 1}. ${e.initials}`, w * 0.2, y);
    ctx.textAlign = 'right';
    ctx.fillText(show(e.value), w * 0.8, y);
  });
}
