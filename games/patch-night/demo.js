// Patch Night in attract mode: the hall's cabinet screen plays Simple by the real rules, calmly: the
// logo turns to the right bug and zaps it about every one and a half seconds, a few waves in a row,
// then this browser's top 5 shows and it starts over. The demo knows the answer, so it never loses.

import { FONT, createTail } from '../../js/screens.js';
import { aimFor, drawScene, turnToward } from './scene.js';
import { newGame, seeded, step, zap } from './rules.js';

const ZAP_AFTER_MS = 1500;
const WAVES = 5;
const AIM_MS = 160;   // the arrow's turn settles in about this long

/** @param {{ scores: () => Array<{ label: string, table: Array<{ initials: string, value: number }> }> }} source the levels' top runs to show */
export function createDemo({ scores, seed = 11 }) {
  const rand = seeded(seed);
  let g;
  const tail = createTail(scores, String);
  let phase;
  let timer;
  let waves;
  let aim;

  const rightDir = () => g.wave.bugs.find((b) => b.right).dir;

  function reset() {
    g = newGame('simple', rand);
    phase = 'play';
    waves = 0;
    aim = aimFor(rightDir());
    // Start with the bugs part of the way in, so even a still frame (reduced motion) shows a wave.
    timer = 0;
    for (let k = 0; k < 20; k++) step(g, 50);
  }

  reset();

  return {
    step(dt) {
      if (phase === 'scores') {
        if (tail.done) { reset(); return true; }
        return tail.step(dt);
      }
      const before = g.wave;
      step(g, dt);
      if (g.wave !== before) { timer = 0; waves += 1; }
      if (g.wave.done) timer = 0;
      else {
        timer += dt;
        aim = turnToward(aim, aimFor(rightDir()), 1 - Math.exp(-dt / AIM_MS));
        if (timer >= ZAP_AFTER_MS) zap(g, rightDir());
      }
      if (waves >= WAVES && g.wave.done) { phase = 'scores'; tail.open(); }
      return true;
    },

    draw(ctx, w, h, c) {
      if (phase === 'scores') return tail.draw(ctx, w, h, c);
      const band = h * 0.2;
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = c.gold;
      ctx.font = `bold ${Math.round(band * 0.7)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.wave.text, w / 2, band * 0.55);
      ctx.save();
      ctx.translate(0, band);
      drawScene(ctx, w, h - band, c, { g, aim });
      ctx.restore();
    },
  };
}
