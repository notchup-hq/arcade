// Benchmark: what the hall and each game cost the main thread on a slow phone, so a change that is
// meant to be faster (or must not be slower) can show it. Run it with ./dev bench, which serves the
// site and installs Playwright on demand. Usage: node scripts/bench.mjs <base URL> [--runs N]
//
// Each scene loads in Chromium at a phone or laptop size with the pixel ratio of a phone (2) and the
// CPU slowed 4x, settles, then is measured for SECONDS, and then watched for slow frames for SECONDS
// more (apart, because counting frames wakes the page every frame). It prints a Markdown table, the
// median of the runs:
// - script ms/s: the games' own JavaScript per second
// - task ms/s: all main-thread work per second, script included. Headless Chromium hands canvas
//   pixels to the screen in software, so this is much higher than on a phone with a GPU; compare it
//   only between runs on the same machine.
// - slow frames: frames that took over 34 ms (two frames at 60 Hz) while watched
// - heap MB: JavaScript memory in use at the end

import { createRequire } from 'node:module';

// Playwright comes from ./dev's own install (PW_HOME, under .local/) or from one already on the machine.
const require = createRequire(process.env.PW_HOME ? `${process.env.PW_HOME}/` : import.meta.url);
const { chromium } = require('playwright');

const SECONDS = 5;
const SETTLE_MS = 2000; // the hall's demos arrive, a game's first frames and transitions are drawn
const PHONE = [360, 780];
const LAPTOP = [1280, 800];

const SCENES = [
  { name: 'Hall, phone (1 cabinet)', path: '/', size: PHONE },
  { name: 'Hall, laptop (4 cabinets)', path: '/', size: LAPTOP },
  { name: 'Fuse Box, waiting', path: '/games/fuse-box/', size: PHONE },
  { name: 'Lob, aiming', path: '/games/lob/', size: PHONE },
  { name: 'Notch Up, playing', path: '/games/notch-up/', size: PHONE, start: '#go' },
  { name: 'Patch Night, playing', path: '/games/patch-night/', size: PHONE, start: '#go' },
  { name: 'Pair Up, waiting', path: '/games/pair-up/', size: PHONE },
];

const args = process.argv.slice(2);
const base = args[0];
const runsAt = args.indexOf('--runs');
const runs = runsAt > 0 ? Number(args[runsAt + 1]) : 3;
if (!base || !Number.isInteger(runs) || runs < 1) {
  console.error('Usage: node scripts/bench.mjs <base URL> [--runs N]');
  process.exit(2);
}

/** Runs in the page: count frames, and the ones that came late, with a probe that does nothing else. */
function probeFrames() {
  const f = { n: 0, slow: 0, last: performance.now() };
  const tick = (t) => {
    if (t - f.last > 34) f.slow++;
    f.n++;
    f.last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.benchFrames = f;
}

async function measure(browser, scene) {
  const context = await browser.newContext({ viewport: { width: scene.size[0], height: scene.size[1] }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Performance.enable');
  await page.goto(new URL(scene.path, base).href, { waitUntil: 'load' });
  if (scene.start) await page.click(scene.start);
  await page.waitForTimeout(SETTLE_MS);
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const before = await metrics();
  await page.waitForTimeout(SECONDS * 1000);
  const after = await metrics();
  await page.evaluate(probeFrames);
  await page.waitForTimeout(SECONDS * 1000);
  const frames = await page.evaluate(() => window.benchFrames);
  await context.close();
  const perSecond = (key) => ((after[key] - before[key]) * 1000) / SECONDS;
  return { script: perSecond('ScriptDuration'), task: perSecond('TaskDuration'), slow: frames.slow, heap: after.JSHeapUsedSize / 1e6 };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const browser = await chromium.launch();
console.log(`Median of ${runs} runs, ${SECONDS} s each, CPU 4x slower, pixel ratio 2.\n`);
console.log('| Scene | Script ms/s | Task ms/s | Slow frames | Heap MB |');
console.log('|---|---|---|---|---|');
for (const scene of SCENES) {
  const results = [];
  for (let i = 0; i < runs; i++) results.push(await measure(browser, scene));
  const m = (key) => median(results.map((r) => r[key]));
  console.log(`| ${scene.name} | ${m('script').toFixed(0)} | ${m('task').toFixed(0)} | ${m('slow')} | ${m('heap').toFixed(1)} |`);
}
await browser.close();
