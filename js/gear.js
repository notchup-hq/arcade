// The Notchup gear, the arcade's mascot: a gold gear with one tooth standing taller than the rest,
// the notch that gets "upped". One outline serves canvas (Path2D) and SVG (a path's d attribute).
// Turning the gear by one tooth is "notching up": the hall, the cabinets and the games all use it.

export const TEETH = 12;
export const NOTCH_STEP = 360 / TEETH;

/**
 * The gear's outline as SVG path data, centred on 0,0 with an outer radius of 1. The tooth at the top
 * (angle 0) is the notch: it stands taller than the others.
 */
export function gearPath({ teeth = TEETH, inner = 0.78, outer = 0.94, notch = 1, hole = 0.32 } = {}) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  const at = (r, a) => `${(r * Math.sin(a)).toFixed(3)} ${(-r * Math.cos(a)).toFixed(3)}`;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const tip = i === 0 ? notch : outer;
    // Root, flank up, flat tip, flank down: a trapezoid tooth.
    pts.push(at(inner, a - step * 0.5), at(inner, a - step * 0.22), at(tip, a - step * 0.14), at(tip, a + step * 0.14), at(inner, a + step * 0.22));
  }
  const body = `M${pts.join('L')}Z`;
  // The axle hole: filled with the even-odd rule, it stays empty.
  const h = hole.toFixed(3);
  return `${body}M0 -${h}A${h} ${h} 0 1 0 0 ${h}A${h} ${h} 0 1 0 0 -${h}Z`;
}

let cached = null;
/** The gear as a Path2D (outer radius 1), made once. Canvas pages only. */
export const gearShape = () => (cached ??= new Path2D(gearPath()));

/**
 * Draw the gear on a canvas: centre x, y, outer radius r, turned by `turn` degrees, filled with `fill`.
 */
export function drawGear(ctx, { x, y, r, turn = 0, fill }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((turn * Math.PI) / 180);
  ctx.scale(r, r);
  ctx.fillStyle = fill;
  ctx.fill(gearShape(), 'evenodd');
  ctx.restore();
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** An inline SVG gear for markup: <svg class="gear"><path/></svg>, coloured and turned by CSS. */
export function gearSvg(className = 'gear') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '-1 -1 2 2');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', gearPath());
  path.setAttribute('fill-rule', 'evenodd');
  svg.append(path);
  return svg;
}
