// Layout check: loads every page in a real browser at 320, 360, 768 and 1280 px wide and fails on what
// a visitor would notice. Run it with ./dev layout, which serves the site and installs Playwright on
// demand. Usage: node scripts/check-layout.mjs <base URL> [--shots DIR]
//
// Each page, at each width, must have:
// - no sideways scroll of the page itself (a game panel may scroll inside its own frame)
// - on a game page, no scrolling up and down either: the whole game fits the screen
// - no visible text under 16 px
// - tap targets of at least 44 x 44 px; inside [data-small-target] (a game board) at least 24 x 24 px
// - exactly one h1, alt text on every image, a label on every form field
// - no request to another origin, and no errors in the console

import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright comes from ./dev's own install (PW_HOME, under .local/) or from one already on the machine.
const require = createRequire(process.env.PW_HOME ? `${process.env.PW_HOME}/` : import.meta.url);
const { chromium } = require('playwright');

// Phones and a tablet upright, a laptop on its side.
const SCREENS = [[320, 568], [360, 780], [768, 1024], [1280, 800]];
const PAGES = ['/', '/games/fuse-box/', '/games/fuse-box/?level=hard', '/games/lob/', '/games/notch-up/', '/games/patch-night/', '/games/patch-night/?level=hard', '/games/pair-up/', '/games/pair-up/?level=hard'];

const [base, ...rest] = process.argv.slice(2);
if (!base) {
  console.error('Usage: node scripts/check-layout.mjs <base URL> [--shots DIR]');
  process.exit(2);
}
const shots = rest[0] === '--shots' ? rest[1] : null;
if (shots) mkdirSync(shots, { recursive: true });

/** Runs in the page: every problem a visitor would see, as text. */
function inspect() {
  const problems = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 1) problems.push(`scrolls sideways: ${doc.scrollWidth} px wide in ${doc.clientWidth} px`);
  if (document.body.classList.contains('game') && doc.scrollHeight > doc.clientHeight + 1) problems.push(`game scrolls: ${doc.scrollHeight} px tall in ${doc.clientHeight} px`);

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('[hidden], .visually-hidden');
  };
  const name = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/)[0]}` : ''} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const small = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!n.nodeValue.trim() || !el || !visible(el)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 16 - 0.01) small.add(`text under 16 px (${size.toFixed(1)}): ${name(el)}`);
  }
  problems.push(...small);

  for (const el of document.querySelectorAll('a[href], button, input, select, textarea, summary')) {
    if (!visible(el)) continue;
    // A radio or checkbox counts by its label, which is what gets tapped.
    const target = el.matches('input[type="radio"], input[type="checkbox"]') ? el.closest('label') ?? el : el;
    const r = target.getBoundingClientRect();
    const min = el.closest('[data-small-target]') ? 24 : 44;
    if (r.width < min - 0.5 || r.height < min - 0.5) problems.push(`tap target ${Math.round(r.width)}x${Math.round(r.height)} under ${min} px: ${name(el)}`);
  }

  const h1 = document.querySelectorAll('h1').length;
  if (h1 !== 1) problems.push(`${h1} h1 elements, want 1`);
  for (const img of document.querySelectorAll('img:not([alt])')) problems.push(`image without alt: ${img.src}`);
  for (const f of document.querySelectorAll('input:not([type="hidden"]), select, textarea')) {
    if (!f.labels?.length && !f.getAttribute('aria-label')) problems.push(`field without a label: ${name(f)}`);
  }
  return [...new Set(problems)];
}

const browser = await chromium.launch();
const origin = new URL(base).origin;
let failed = 0;
try {
  for (const [width, height] of SCREENS) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 768 });
    for (const path of PAGES) {
      const page = await context.newPage();
      const problems = [];
      page.on('request', (r) => { if (new URL(r.url()).origin !== origin && !r.url().startsWith('data:')) problems.push(`request to another origin: ${r.url()}`); });
      page.on('console', (m) => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`); });
      page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
      await page.goto(base + path, { waitUntil: 'networkidle' });
      problems.push(...(await page.evaluate(inspect)));
      if (shots) await page.screenshot({ path: `${shots}/${path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'hall'}-${width}.png`, fullPage: true });
      const label = `${path} at ${width} px`;
      if (problems.length) {
        failed++;
        console.log(`❌ ${label}`);
        for (const p of problems) console.log(`   ${p}`);
      } else {
        console.log(`✅ ${label}`);
      }
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
