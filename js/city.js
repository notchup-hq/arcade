// The night city every rooftop game stands in, in the style of notchup.fi: rows of building shapes
// with a few lit windows. Drawn in world units with y pointing up (the caller flips the canvas), and
// with a seeded random source, so the same city comes back for the same seed.

/**
 * One row of buildings from x `from` to `to`, standing on y 0: each `base` to `top` high, walls in
 * `wall`, and a share `lit` of the windows lit in one of the two `windowOn` colours.
 */
export function skyline(ctx, rand, from, to, { top, base, wall, windowOn, lit }) {
  for (let x = from; x < to;) {
    const bw = 8 + rand() * 9;
    const bh = base + rand() * (top - base);
    ctx.fillStyle = wall;
    ctx.fillRect(x, 0, bw - 0.6, bh);
    for (let wy = 4; wy < bh - 3; wy += 4.5) {
      for (let wx = x + 1.6; wx < x + bw - 2.6; wx += 3.2) {
        if (rand() < lit) {
          ctx.fillStyle = windowOn[rand() < 0.7 ? 0 : 1];
          ctx.fillRect(wx, wy, 1.2, 1.7);
        }
      }
    }
    x += bw;
  }
}
