// The Notchup logo, in parts, so it can move: the gear turns slowly while the compass stays put, and
// the arrow notches up. The shapes are the ones in assets/mark.svg (tests/logo.test.js keeps the two
// the same); the static file stays the favicon. One module draws it as inline SVG and on canvas.

const SVG_NS = 'http://www.w3.org/2000/svg';

export const VIEW = 126;   // the logo spans -126..126 in both directions
export const TEETH = 12;
export const NOTCH_STEP = 360 / TEETH;

/** The logo's own colours: two golds (as gradients in SVG), two compass shades, the dark dial. */
export const COLOURS = {
  gold: ['#f6dc96', '#d1aa55', '#8c6a2c'],
  soft: ['#e2c27a', '#9c7a36'],
  shade: '#2a2a2c',
  shadow: '#202226',
  dial: '#14171c',
  line: '#3a2c10',
};

/** [fill, points] of each part, in drawing order. */
export const GEAR = [
  ['gold', '-13.01,-85.01 -12.01,-99.28 12.01,-99.28 13.01,-85.01 31.24,-80.13 39.23,-91.98 60.04,-79.97 53.77,-67.12 67.12,-53.77 79.97,-60.04 91.98,-39.23 80.13,-31.24 85.01,-13.01 99.28,-12.01 99.28,12.01 85.01,13.01 80.13,31.24 91.98,39.23 79.97,60.04 67.12,53.77 53.77,67.12 60.04,79.97 39.23,91.98 31.24,80.13 13.01,85.01 12.01,99.28 -12.01,99.28 -13.01,85.01 -31.24,80.13 -39.23,91.98 -60.04,79.97 -53.77,67.12 -67.12,53.77 -79.97,60.04 -91.98,39.23 -80.13,31.24 -85.01,13.01 -99.28,12.01 -99.28,-12.01 -85.01,-13.01 -80.13,-31.24 -91.98,-39.23 -79.97,-60.04 -67.12,-53.77 -53.77,-67.12 -60.04,-79.97 -39.23,-91.98 -31.24,-80.13'],
];
export const STAR = [
  ['soft', '0.00,0.00 -9.19,-9.19 46.67,-46.67'],
  ['shade', '0.00,0.00 46.67,-46.67 9.19,9.19'],
  ['soft', '0.00,0.00 9.19,-9.19 46.67,46.67'],
  ['shade', '0.00,0.00 46.67,46.67 -9.19,9.19'],
  ['soft', '0.00,0.00 9.19,9.19 -46.67,46.67'],
  ['shade', '0.00,0.00 -46.67,46.67 -9.19,-9.19'],
  ['soft', '0.00,0.00 -9.19,9.19 -46.67,-46.67'],
  ['shade', '0.00,0.00 -46.67,-46.67 9.19,-9.19'],
  ['gold', '0.00,0.00 -19.00,-0.00 0.00,-112.00'],
  ['shadow', '0.00,0.00 0.00,-112.00 19.00,-0.00'],
  ['gold', '0.00,0.00 0.00,-19.00 124.00,-0.00'],
  ['shadow', '0.00,0.00 124.00,-0.00 0.00,19.00'],
  ['gold', '0.00,0.00 19.00,-0.00 0.00,112.00'],
  ['shadow', '0.00,0.00 0.00,112.00 -19.00,0.00'],
  ['gold', '0.00,0.00 0.00,19.00 -124.00,0.00'],
  ['shadow', '0.00,0.00 -124.00,0.00 -0.00,-19.00'],
];
export const ARROW = [
  ['gold', '-63.99,54.80 70.36,-79.55 79.55,-70.36 -54.80,63.99'],
  ['gold', '52.33,-83.44 106.07,-106.07 83.44,-52.33 74.95,-74.95'],
];

let ids = 0;

function el(name, attrs, parent) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
}

function gradient(defs, id, stops) {
  const g = el('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  stops.forEach((c, i) => el('stop', { offset: i / (stops.length - 1), 'stop-color': c }, g));
}

/**
 * The logo as inline SVG, for markup. The gear sits in g.logo-gear and the arrow in g.logo-arrow, so
 * CSS can turn the one and lift the other; both turn and move around the logo's centre.
 */
export function logoSvg(className = 'logo') {
  const n = ++ids;
  const fill = { gold: `url(#logo-gold-${n})`, soft: `url(#logo-soft-${n})`, shade: COLOURS.shade, shadow: COLOURS.shadow };
  const svg = el('svg', { viewBox: `${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`, class: className, 'aria-hidden': 'true' });
  const defs = el('defs', {}, svg);
  gradient(defs, `logo-gold-${n}`, COLOURS.gold);
  gradient(defs, `logo-soft-${n}`, COLOURS.soft);
  const gear = el('g', { class: 'logo-gear' }, svg);
  for (const [f, points] of GEAR) el('polygon', { points, fill: fill[f] }, gear);
  el('circle', { r: 75, fill: COLOURS.dial }, svg);
  el('circle', { r: 62, fill: 'none', stroke: fill.gold, 'stroke-width': 5 }, svg);
  for (const [f, points] of STAR) el('polygon', { points, fill: fill[f] }, svg);
  const arrow = el('g', { class: 'logo-arrow' }, svg);
  for (const [f, points] of ARROW) el('polygon', { points, fill: fill[f], stroke: COLOURS.line, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, arrow);
  el('circle', { r: 15, fill: fill.gold, stroke: COLOURS.line, 'stroke-width': 1.2 }, svg);
  el('circle', { r: 8.5, fill: COLOURS.dial }, svg);
  el('circle', { r: 4, fill: fill.gold }, svg);
  return svg;
}

const paths = new Map();
const pathOf = (points) => {
  if (!paths.has(points)) paths.set(points, new Path2D(`M${points.trim().split(/\s+/).join('L')}Z`));
  return paths.get(points);
};

/**
 * Draw the logo on a canvas: centre x, y, `size` across, the gear turned by `turn` degrees and the
 * arrow lifted by `lift` (0 to 1, a notch up and to the right).
 */
export function drawLogo(ctx, { x, y, size, turn = 0, lift = 0 }) {
  const lin = (stops) => {
    const g = ctx.createLinearGradient(-VIEW, -VIEW, VIEW, VIEW);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  };
  const fill = { gold: lin(COLOURS.gold), soft: lin(COLOURS.soft), shade: COLOURS.shade, shadow: COLOURS.shadow };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / (VIEW * 2), size / (VIEW * 2));
  ctx.save();
  ctx.rotate((turn * Math.PI) / 180);
  for (const [f, points] of GEAR) { ctx.fillStyle = fill[f]; ctx.fill(pathOf(points)); }
  ctx.restore();
  ctx.fillStyle = COLOURS.dial;
  ctx.beginPath(); ctx.arc(0, 0, 75, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = fill.gold; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.stroke();
  for (const [f, points] of STAR) { ctx.fillStyle = fill[f]; ctx.fill(pathOf(points)); }
  ctx.save();
  ctx.translate(lift * 10, -lift * 10);
  ctx.strokeStyle = COLOURS.line; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
  for (const [f, points] of ARROW) { ctx.fillStyle = fill[f]; ctx.fill(pathOf(points)); ctx.stroke(pathOf(points)); }
  ctx.restore();
  ctx.fillStyle = fill.gold;
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = COLOURS.dial;
  ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fill.gold;
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
