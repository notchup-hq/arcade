// A calm burst of sparks, for a right answer or a cheer: a ring of dots in the neon colours drifting
// out from a point, slowing down and fading. No flash: it never gets brighter than it starts.

const SPARKS = 14;

/** The burst at x, y, `t` from 0 (just burst) to 1 (gone); `size` sets how far the sparks reach. */
export function drawSparks(ctx, c, x, y, size, t) {
  const colours = [c.gold, c.cyan, c.magenta];
  ctx.save();
  ctx.globalAlpha = Math.pow(1 - t, 1.5);
  for (let i = 0; i < SPARKS; i++) {
    const a = (i / SPARKS) * Math.PI * 2 + (i % 2) * 0.2;
    const reach = size * (i % 2 ? 1.6 : 2.4) * (1 - (1 - t) * (1 - t));
    ctx.fillStyle = colours[i % 3];
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * reach, y + Math.sin(a) * reach, Math.max(1.5, size * 0.2 * (1 - t * 0.5)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
