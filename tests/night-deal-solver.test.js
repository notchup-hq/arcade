import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEAL_COUNT, WINNABLE } from '../games/night-deal/deals.js';
import { isWon, newGame, play, seeded, winnableSeed } from '../games/night-deal/rules.js';
import { solve, winningLine } from '../scripts/night-deal-solver.mjs';

const listed = () => {
  const out = [];
  const bytes = atob(WINNABLE);
  for (let seed = 0; seed < DEAL_COUNT; seed++) if ((bytes.charCodeAt(seed >> 3) >> (seed & 7)) & 1) out.push(seed);
  return out;
};

test('the list holds a bit for every seed', () => {
  assert.equal(atob(WINNABLE).length, DEAL_COUNT / 8);
});

test('most deals can be won', () => {
  assert.ok(listed().length > DEAL_COUNT * 0.6, `${listed().length} of ${DEAL_COUNT}`);
});

// The list is made with draw 3; turning one card at a time reaches everything turning three does, so
// Draw 1 can win those deals too. The test plays the line the solver finds, move by move, for both.
for (const level of ['draw-3', 'draw-1']) {
  test(`a listed deal is won by the line the solver finds through the rules, with ${level}`, () => {
    for (const seed of listed().slice(0, 3)) {
      let g = newGame(level, seeded(seed));
      const line = winningLine(g);
      assert.ok(line, `seed ${seed}`);
      for (const move of line) {
        g = play(g, move);
        assert.ok(g, `an allowed move in seed ${seed}`);
      }
      assert.equal(isWon(g), true);
    }
  });
}

test('a search that is allowed to look at nothing finds nothing', () => {
  assert.equal(solve(newGame('draw-3', seeded(1)), 0), null);
});

test('the game deals only listed seeds, whichever number comes up', () => {
  const seeds = new Set(listed());
  for (const r of [0, 0.2, 0.5, 0.999999]) assert.ok(seeds.has(winnableSeed(() => r)));
});
