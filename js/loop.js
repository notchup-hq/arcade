// The game loop every canvas in the arcade runs on: requestAnimationFrame with a fixed timestep, so a
// game steps at the same speed on a 60 Hz phone and a 144 Hz monitor. It stops while the tab is hidden,
// and an attract-mode screen also stops while it is scrolled out of view (see js/attract.js).

/**
 * @param {{ step: (dt: number) => void, draw: () => void, dt?: number }} game
 *   step advances the game by dt ms (called 0 or more times a frame); draw paints the latest state.
 */
export function createLoop({ step, draw, dt = 1000 / 60 }) {
  let frame = 0;
  let last = 0;
  let acc = 0;
  let wanted = false;

  function tick(now) {
    // A long gap (a stall, a breakpoint) is cut to a few steps instead of a burst of catch-up.
    acc += Math.min(now - last, dt * 5);
    last = now;
    let stepped = false;
    while (acc >= dt) {
      step(dt);
      acc -= dt;
      stepped = true;
    }
    if (stepped) draw();
    frame = requestAnimationFrame(tick);
  }

  function run() {
    if (frame || !wanted || document.hidden) return;
    last = performance.now();
    acc = 0;
    frame = requestAnimationFrame(tick);
  }

  function halt() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  document.addEventListener('visibilitychange', () => (document.hidden ? halt() : run()));

  return {
    start() { wanted = true; run(); },
    stop() { wanted = false; halt(); },
    get running() { return frame !== 0; },
  };
}
