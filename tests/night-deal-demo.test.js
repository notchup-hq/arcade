import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LINE, SEED } from '../games/night-deal/demo.js';
import { isWon, newGame, play, seeded } from '../games/night-deal/rules.js';

test('the demo\'s recorded game wins by the rules, every move allowed', () => {
  let g = newGame('draw-1', seeded(SEED));
  for (const [k, move] of LINE.entries()) {
    g = play(g, move);
    assert.ok(g, `move ${k + 1} is not allowed`);
  }
  assert.equal(isWon(g), true);
});

test('the recording is short enough for a cabinet screen to play it in about ten seconds', () => {
  assert.ok(LINE.length <= 130, `${LINE.length} moves`);
});
