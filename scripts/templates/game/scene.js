// {{name}}'s picture, shared by the page and the hall's demo: one round light in the middle of the
// screen, glowing gold while it is lit and a dim ring while it is dark.

/** Draw the light on a `w` by `h` picture in the neon colours `c`. */
export function drawLight(ctx, w, h, c, lit) {
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, w, h);
  const r = Math.min(w, h) * 0.22;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
  if (lit) {
    ctx.shadowColor = c.gold;
    ctx.shadowBlur = r * 0.6;
    ctx.fillStyle = c.gold;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.lineWidth = 3;
    ctx.strokeStyle = c.dim;
    ctx.stroke();
  }
}
