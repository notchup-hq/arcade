// The screens every game's attract mode ends with: the Notchup logo notching up under a line of text,
// then this browser's top 5 (one page for each level that has a score), then a "press start" teaser
// that fades slowly in and out, never flashing. Drawn with the neon colours from js/attract.js.

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

/** One page of this browser's top 5: `page` is { label, table }, `show` turns a value into text. */
export function drawScores(ctx, w, h, c, { label, table }, show) {
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
  if (label) {
    ctx.fillStyle = c.magenta;
    ctx.fillText(label, w / 2, line * 2.2);
  }
  table.slice(0, 5).forEach((e, k) => {
    const y = line * (3.2 + k * 1.1);
    ctx.fillStyle = k === 0 ? c.gold : c.ink;
    ctx.textAlign = 'left';
    ctx.fillText(`${k + 1}. ${e.initials}`, w * 0.2, y);
    ctx.textAlign = 'right';
    ctx.fillText(show(e.value), w * 0.8, y);
  });
}

const PAGE_MS = 4000;  // each level's table
const START_MS = 3600; // the teaser
const FADE_MS = 2400;  // one slow breath of the teaser: down and up again

let coarse; // read once: the main pointer does not change while the page is open
const touch = () => (coarse ??= typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);

/** "PRESS START", or "TAP TO PLAY" where the main pointer is a finger, fading slowly in and out. */
function drawStart(ctx, w, h, c, t) {
  const text = touch() ? 'TAP TO PLAY' : 'PRESS START';
  const size = Math.max(16, Math.min(Math.min(w, h) * 0.11, (w * 0.9) / text.length / 0.62));
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.55 + 0.45 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / FADE_MS));
  ctx.fillStyle = c.gold;
  ctx.font = `bold ${Math.round(size)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  ctx.globalAlpha = 1;
}

/**
 * What a demo shows after its game: the top 5 of every board that has a score, one after another (or
 * "no scores yet" when none has), then the teaser. `source()` gives the boards as [{ label, table }],
 * `show` turns a value into text. open() starts it, step(dt) says whether the picture changed, and
 * done is true once the teaser has had its turn.
 */
export function createTail(source, show) {
  let pages = [];
  let t = 0;
  const scoresMs = () => Math.max(pages.length, 1) * PAGE_MS;
  const pageAt = (ms) => Math.floor(ms / PAGE_MS);
  return {
    open() {
      pages = source();
      t = 0;
    },
    step(dt) {
      const before = t;
      t += dt;
      return t >= scoresMs() || pageAt(t) !== pageAt(before);
    },
    get done() { return t >= scoresMs() + START_MS; },
    draw(ctx, w, h, c) {
      if (t >= scoresMs()) return drawStart(ctx, w, h, c, t - scoresMs());
      return drawScores(ctx, w, h, c, pages[pageAt(t)] ?? { label: '', table: [] }, show);
    },
  };
}
