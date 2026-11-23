// Canvas helpers every picture in the arcade uses: drawn sharp at the screen's pixel ratio, and with
// reduced motion drawn only when something visible changed.

// More pixels than 2x cost time on a phone and show nothing.
const MAX_RATIO = 2;

/**
 * The 2D context of `canvas`, ready to draw `w` by `h` CSS pixels: its backing store follows the
 * pixel ratio (up to 2x) and changes only when the size or the ratio did, since a resize clears it.
 */
export function sharpCanvas(canvas, w, h) {
  const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
  const pw = Math.round(w * ratio);
  const ph = Math.round(h * ratio);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(pw / w, 0, 0, ph / h, 0, 0);
  return ctx;
}

/**
 * Frames for a game that moves on its own. draw() paints with `paint`, except that while `still`
 * (the reduced motion media query) matches, it paints only when `signature()` (a short text of what
 * is visible) changed. forget() makes the next draw() paint anyway, after a resize or a new run.
 */
export function stillFrames(still, signature, paint) {
  let last = '';
  return {
    draw() {
      if (still.matches) {
        const now = signature();
        if (now === last) return;
        last = now;
      }
      paint();
    },
    forget() {
      last = '';
    },
  };
}
