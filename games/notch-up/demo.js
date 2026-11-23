// Notch Up in attract mode: the hall's cabinet screen builds the tower by the real rules, calmly: about
// one drop a second, most of them perfect and the rest a little off, up past the tenth floor's cheer.
// Then the logo notches up over the tower, this browser's top 5 shows, and it starts over. The demo
// aims where it means to, so it never misses.

import { createTail, drawNotchUp } from '../../js/screens.js';
import { cameraFor, drawScene, easeCamera } from './scene.js';
import { built, drop, newGame, seeded, step } from './rules.js';

const DROP_MS = 1000;   // at least this long between drops
const FLOORS = 12;      // floors to build, past the first cheer
const HEAD_START = 4;   // floors already up, so a still frame (reduced motion) shows a tower
const END_MS = 2500;

/** @param {{ scores: () => Array<{ label: string, table: Array<{ initials: string, value: number }> }> }} source the levels' top runs to show */
export function createDemo({ scores, seed = 5 }) {
  const rand = seeded(seed);
  let g;
  const tail = createTail(scores, String);
  let phase;
  let timer;
  let target;       // where the next drop is meant to land, as an offset from the floor below
  let camera = 0;
  let size = [0, 0];

  const aim = () => (rand() < 0.6 ? (rand() - 0.5) * 4 : (rand() < 0.5 ? -1 : 1) * (4 + rand() * 4));

  function reset() {
    g = newGame(rand);
    for (let k = 0; k < HEAD_START; k++) {
      g.mover.x = g.floors.at(-1).x + aim();
      drop(g);
    }
    g.cut = null;
    g.seam = null;
    phase = 'play';
    timer = 0;
    target = aim();
    camera = cameraFor(g, size[1], size[0] || 1);
  }

  reset();

  return {
    step(dt) {
      timer += dt;
      if (phase === 'scores') {
        if (tail.done) { reset(); return true; }
        return tail.step(dt);
      }
      if (phase === 'end') {
        if (timer >= END_MS) { phase = 'scores'; tail.open(); }
        return true;
      }
      const before = g.mover.x - g.floors.at(-1).x;
      step(g, dt);
      const after = g.mover.x - g.floors.at(-1).x;
      const crossed = (before - target) * (after - target) <= 0;
      if (timer >= DROP_MS && crossed) {
        g.mover.x = g.floors.at(-1).x + target;
        drop(g);
        timer = 0;
        target = aim();
      }
      if (size[0]) camera = easeCamera(camera, cameraFor(g, size[1], size[0]), dt, false);
      if (built(g) >= FLOORS && !g.cheer && timer >= DROP_MS / 2) { phase = 'end'; timer = 0; }
      return true;
    },

    draw(ctx, w, h, c) {
      if (phase === 'scores') return tail.draw(ctx, w, h, c);
      if (!size[0]) camera = cameraFor(g, h, w);
      size = [w, h];
      drawScene(ctx, w, h, c, { g: phase === 'play' ? g : { ...g, status: 'built' }, camera });
      if (phase === 'end') drawNotchUp(ctx, w, h, c, 4, `${built(g)} FLOORS`);
    },
  };
}
