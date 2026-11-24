// Lists the Night Deal deals that can be won, so the game deals only those and carries no solver.
// A deal is a seed (0 up to COUNT - 1) for the seeded shuffle in games/night-deal/rules.js. A seed is
// listed when the solver wins it with draw-3, which also wins it with draw-1 (turning one card at a
// time reaches everything turning three does). A seed the search gives up on is left out, so the list
// holds proven deals only. The result is games/night-deal/deals.js, a bitmap in base64 (256 bytes
// for 2048 seeds). Run: node scripts/night-deal-deals.mjs [count] [look]; about twenty minutes for the defaults.

import { writeFileSync } from 'node:fs';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { newGame, seeded } from '../games/night-deal/rules.js';
import { LOOK as DEFAULT_LOOK, solve } from './night-deal-solver.mjs';

const COUNT = Number(process.argv[2] ?? 2048);
const LOOK = Number(process.argv[3] ?? DEFAULT_LOOK);
const OUT = new URL('../games/night-deal/deals.js', import.meta.url);

if (isMainThread) {
  const workers = availableParallelism();
  const won = new Uint8Array(COUNT);
  let running = workers;
  for (let w = 0; w < workers; w++) {
    const worker = new Worker(new URL(import.meta.url), { workerData: { w, workers }, argv: [String(COUNT), String(LOOK)] });
    worker.on('message', (seed) => { won[seed] = 1; });
    worker.on('exit', () => {
      if (--running) return;
      const bytes = new Uint8Array(COUNT / 8);
      won.forEach((v, seed) => { if (v) bytes[seed >> 3] |= 1 << (seed & 7); });
      const text = `// Written by scripts/night-deal-deals.mjs; do not edit. The seeds 0 to ${COUNT - 1} whose deal can be won,\n// one bit each (seed s is bit s % 8 of byte s / 8), in base64.\n\nexport const DEAL_COUNT = ${COUNT};\nexport const WINNABLE = '${Buffer.from(bytes).toString('base64')}';\n`;
      writeFileSync(OUT, text);
      console.log(`${won.reduce((a, b) => a + b, 0)} of ${COUNT} deals can be won`);
    });
  }
} else {
  const { w, workers } = workerData;
  for (let seed = w; seed < COUNT; seed += workers) {
    if (solve(newGame('draw-3', seeded(seed)), LOOK)) parentPort.postMessage(seed);
  }
}
