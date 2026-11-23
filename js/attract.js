// Attract mode: a game playing itself on a cabinet's screen in the hall, drawn by the game's own code.
// A screen runs only while it is in view and the tab is visible; with reduced motion it shows one
// still frame. The canvas is sized to its box and the screen's pixel ratio, so it stays sharp.
//
// A demo is { step(dt): boolean, draw(ctx, w, h, colours) }: step advances it by dt ms and says whether
// anything visible changed, so a screen that waits between moves is not redrawn 60 times a second.

import { sharpCanvas } from './canvas.js';
import { createLoop } from './loop.js';

const REDUCED = '(prefers-reduced-motion: reduce)';
const COLOURS = ['bg', 'ink', 'dim', 'gold', 'cyan', 'magenta', 'green', 'red'];

/** The arcade's neon colours from the stylesheet (--neon-*), so canvas and CSS never drift apart. */
export function neonColours(el = document.documentElement) {
  const css = getComputedStyle(el);
  return Object.fromEntries(COLOURS.map((c) => [c, css.getPropertyValue(`--neon-${c}`).trim()]));
}

/** Run `demo` on `canvas`. Returns a function that stops it for good. */
export function mountAttract(canvas, demo) {
  const colours = neonColours();
  const still = window.matchMedia(REDUCED);
  let w = 0;
  let h = 0;
  let dirty = true;
  let inView = false;

  function draw() {
    if (!dirty || !w) return;
    dirty = false;
    demo.draw(sharpCanvas(canvas, w, h), w, h, colours);
  }

  const loop = createLoop({
    step: (dt) => { if (demo.step(dt)) dirty = true; },
    draw,
  });

  function sync() {
    if (inView && !still.matches) loop.start();
    else loop.stop();
    draw();
  }

  const resize = new ResizeObserver(([entry]) => {
    const box = entry.contentBoxSize?.[0];
    w = box ? box.inlineSize : canvas.clientWidth;
    h = box ? box.blockSize : canvas.clientHeight;
    dirty = true;
    draw();
  });
  const view = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });

  resize.observe(canvas);
  view.observe(canvas);
  still.addEventListener('change', sync);

  return () => {
    loop.stop();
    resize.disconnect();
    view.disconnect();
    still.removeEventListener('change', sync);
  };
}
