import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARDS, SUITS, accepts, bestMove, canDeal, canFinish, canMove, cardsAt, finishMove, isProgress, isStuck, isWon,
  legalMoves, moveText, newGame, parseMove, play, seeded,
} from '../games/night-deal/rules.js';

const [SPADES, CLUBS, HEARTS, DIAMONDS] = [0, 1, 2, 3];
const card = (rank, suit) => CARDS[suit * 13 + rank - 1];
/** An empty table, to put just the cards a test needs on. */
const table = (drawBy = 1) => ({
  level: drawBy === 1 ? 'draw-1' : 'draw-3', drawBy, stock: [], waste: [], found: [0, 0, 0, 0],
  cols: Array.from({ length: 7 }, () => ({ down: [], up: [] })),
});

test('a deal has 52 different cards: column i has i face down and one up, and 24 are left to draw', () => {
  const g = newGame('draw-3', seeded(1));
  g.cols.forEach((c, i) => {
    assert.equal(c.down.length, i);
    assert.equal(c.up.length, 1);
  });
  const all = [...g.cols.flatMap((c) => [...c.down, ...c.up]), ...g.stock];
  assert.equal(g.stock.length, 24);
  assert.equal(new Set(all.map((c) => c.id)).size, 52);
  assert.equal(g.drawBy, 3);
  assert.deepEqual(newGame('draw-3', seeded(1)), g, 'the same seed deals the same cards');
});

test('a column takes a card of the other colour one rank lower, and nothing else', () => {
  const g = table();
  g.cols[0].up = [card(7, SPADES)];
  assert.ok(accepts(g, 'c0', [card(6, HEARTS)]));
  assert.ok(accepts(g, 'c0', [card(6, DIAMONDS)]));
  assert.ok(!accepts(g, 'c0', [card(6, CLUBS)]), 'same colour');
  assert.ok(!accepts(g, 'c0', [card(5, HEARTS)]), 'wrong rank');
});

test('an empty column takes a king, or a run that starts with one, and nothing else', () => {
  const g = table();
  assert.ok(accepts(g, 'c3', [card(13, HEARTS), card(12, SPADES)]));
  assert.ok(!accepts(g, 'c3', [card(12, HEARTS)]));
});

test('a stack takes its own suit, one rank up from what it holds, and one card at a time', () => {
  const g = table();
  g.found = [2, 0, 0, 0];
  assert.ok(accepts(g, 'f0', [card(3, SPADES)]));
  assert.ok(!accepts(g, 'f0', [card(4, SPADES)]));
  assert.ok(!accepts(g, 'f1', [card(3, SPADES)]), 'a stack belongs to its suit');
  assert.ok(!accepts(g, 'f0', [card(3, SPADES), card(2, HEARTS)]));
  assert.ok(accepts(g, 'f1', [card(1, CLUBS)]));
});

test('moving a run takes its cards in order and turns over the card it uncovers', () => {
  const g = table();
  g.cols[0] = { down: [card(9, CLUBS)], up: [card(8, SPADES), card(7, HEARTS), card(6, CLUBS)] };
  g.cols[1].up = [card(9, DIAMONDS)];
  const next = play(g, { from: 'c0', to: 'c1', n: 3 });
  assert.deepEqual(next.cols[1].up.map((c) => c.id), [card(9, DIAMONDS), card(8, SPADES), card(7, HEARTS), card(6, CLUBS)].map((c) => c.id));
  assert.deepEqual(next.cols[0], { down: [], up: [card(9, CLUBS)] });
  assert.equal(g.cols[0].up.length, 3);
});

test('a move that does not fit, or lifts what is not there, is refused', () => {
  const g = table();
  g.cols[0].up = [card(5, SPADES)];
  g.cols[1].up = [card(9, HEARTS)];
  assert.equal(play(g, { from: 'c0', to: 'c1', n: 1 }), null);
  assert.equal(play(g, { from: 'c0', to: 'c1', n: 2 }), null);
  assert.equal(play(g, { from: 'w', to: 'c1', n: 1 }), null, 'an empty discard pile');
  assert.equal(canMove(g, { from: 'c0', to: 'c0', n: 1 }), false);
});

test('a card can be taken back off a stack', () => {
  const g = table();
  g.found = [0, 0, 5, 0];
  g.cols[0].up = [card(6, SPADES)];
  assert.deepEqual(cardsAt(g, 'f2')[0], card(5, HEARTS));
  const next = play(g, { from: 'f2', to: 'c0', n: 1 });
  assert.equal(next.found[2], 4);
  assert.equal(next.cols[0].up.at(-1), card(5, HEARTS));
});

test('dealing turns over one card, or three, and fewer when fewer are left', () => {
  const g = table(3);
  g.stock = [card(1, SPADES), card(2, SPADES), card(3, SPADES), card(4, SPADES), card(5, SPADES)];
  const one = play(g, { from: 's', to: 'w', n: 1 });
  assert.deepEqual(one.waste.map((c) => c.rank), [5, 4, 3]);
  assert.deepEqual(one.stock.map((c) => c.rank), [1, 2]);
  const two = play(one, { from: 's', to: 'w', n: 1 });
  assert.deepEqual(two.waste.map((c) => c.rank), [5, 4, 3, 2, 1]);
  assert.equal(two.stock.length, 0);
});

test('with the draw pile empty the discard pile turns over, so the cards come round in the same order', () => {
  let g = table();
  g.stock = [card(3, HEARTS), card(2, HEARTS), card(1, HEARTS)];
  g = play(play(play(g, { from: 's', to: 'w', n: 1 }), { from: 's', to: 'w', n: 1 }), { from: 's', to: 'w', n: 1 });
  assert.deepEqual(g.waste.map((c) => c.rank), [1, 2, 3]);
  assert.equal(g.stock.length, 0);
  g = play(g, { from: 's', to: 'w', n: 1 });
  assert.deepEqual(g.stock.map((c) => c.rank), [3, 2, 1]);
  assert.equal(g.waste.length, 0);
  assert.equal(canDeal(table()), false);
  assert.equal(play(table(), { from: 's', to: 'w', n: 1 }), null);
});

test('a tap sends a card to its stack first, then to the column that hides the fewest cards', () => {
  const g = table();
  g.waste = [card(6, HEARTS)];
  g.cols[0] = { down: [card(2, CLUBS), card(3, CLUBS)], up: [card(7, SPADES)] };
  g.cols[1] = { down: [card(4, CLUBS)], up: [card(7, CLUBS)] };
  g.cols[2] = { down: [], up: [card(7, SPADES)] };
  assert.deepEqual(bestMove(g, 'w'), { from: 'w', to: 'c2', n: 1 });
  g.cols[2].up = [];
  assert.deepEqual(bestMove(g, 'w'), { from: 'w', to: 'c1', n: 1 });
  g.waste = [card(1, DIAMONDS)];
  assert.deepEqual(bestMove(g, 'w'), { from: 'w', to: 'f3', n: 1 });
  g.waste = [card(2, DIAMONDS)];
  assert.equal(bestMove(g, 'w'), null);
  assert.equal(bestMove(table(), 's'), null, 'nothing to draw');
  assert.deepEqual(bestMove(g, 's'), { from: 's', to: 'w', n: 1 }, 'the discard pile turns over');
});

test('a tap on a run in a column moves the run, and a king goes to an empty column', () => {
  const g = table();
  g.cols[0] = { down: [card(2, CLUBS)], up: [card(13, HEARTS), card(12, SPADES), card(11, HEARTS)] };
  g.cols[1].up = [card(1, SPADES)];
  assert.deepEqual(bestMove(g, 'c0', 3), { from: 'c0', to: 'c2', n: 3 });
  assert.deepEqual(bestMove(g, 'c1', 1), { from: 'c1', to: 'f0', n: 1 });
  assert.equal(bestMove(g, 'f0'), null);
});

test('the moves listed leave out taking a king column to an empty column, which changes nothing', () => {
  const g = table();
  g.cols[0] = { down: [], up: [card(13, SPADES), card(12, HEARTS)] };
  g.cols[1] = { down: [card(2, CLUBS)], up: [card(13, DIAMONDS)] };
  const moves = legalMoves(g).map(moveText);
  assert.ok(!moves.some((m) => m.startsWith('c0c')), moves.join());
  assert.ok(moves.includes('c1c2'), 'a king that turns a card over is worth moving');
});

test('which moves get somewhere: a stack, a card off the discard pile, a whole run; not part of a run or the deal', () => {
  const g = table();
  g.cols[0].up = [card(9, SPADES), card(8, HEARTS)];
  assert.equal(isProgress(g, { from: 'c0', to: 'c1', n: 2 }), true);
  assert.equal(isProgress(g, { from: 'c0', to: 'c1', n: 1 }), false);
  assert.equal(isProgress(g, { from: 'c0', to: 'f1', n: 1 }), true);
  assert.equal(isProgress(g, { from: 'w', to: 'c1', n: 1 }), true);
  assert.equal(isProgress(g, { from: 's', to: 'w', n: 1 }), false);
});

test('no moves left: a table where cards only shift between columns, whatever the draw pile does, is stuck', () => {
  const g = table();
  g.cols[0] = { down: [card(9, CLUBS)], up: [card(6, SPADES), card(5, HEARTS)] };
  g.cols[1] = { down: [card(9, HEARTS)], up: [card(6, CLUBS)] };
  g.stock = [card(10, SPADES), card(10, CLUBS)];
  assert.equal(isStuck(g), true);
});

test('not stuck while a card can reach a stack, also from the draw pile or after shifting a card', () => {
  const g = table();
  g.cols[0] = { down: [card(9, CLUBS)], up: [card(6, SPADES), card(5, HEARTS)] };
  g.cols[1] = { down: [card(9, HEARTS)], up: [card(6, CLUBS)] };
  g.stock = [card(10, SPADES), card(1, DIAMONDS)];
  assert.equal(isStuck(g), false, 'an ace waits in the draw pile');
  g.stock = [];
  g.found = [0, 0, 4, 0];
  assert.equal(isStuck(g), false, 'the 5 of hearts can go up');
  g.found = [0, 0, 3, 0];
  g.cols[1].up = [card(6, CLUBS)];
  g.cols[0].up = [card(6, SPADES), card(4, HEARTS)];
  assert.equal(isStuck(g), false, 'moving the 4 of hearts bares nothing, but the 4 goes up');
});

test('a card that can only be freed by taking another back off a stack is not "no moves left"', () => {
  const g = table();
  g.found = [0, 0, 5, 0];
  g.cols[0] = { down: [card(9, CLUBS)], up: [card(6, SPADES)] };
  g.cols[1] = { down: [card(9, HEARTS)], up: [card(4, CLUBS)] };
  assert.equal(isStuck(g), false, 'the 5 of hearts can come back onto the 6 of spades, and the 4 of clubs onto it');
  assert.ok(!legalMoves(g).some((m) => m.from === 'f2'), 'the plain list leaves it out');
  assert.ok(legalMoves(g, true).some((m) => m.from === 'f2' && m.to === 'c0'));
});

test('with every card face up and nothing to draw the win is certain and the stacks fill from the columns', () => {
  const g = table();
  g.found = [12, 13, 13, 13];
  g.cols[0].up = [card(13, SPADES)];
  assert.equal(canFinish(g), true);
  assert.equal(isWon(g), false);
  const move = finishMove(g);
  assert.deepEqual(move, { from: 'c0', to: 'f0', n: 1 });
  assert.equal(isWon(play(g, move)), true);
  g.cols[1].down = [card(2, CLUBS)];
  assert.equal(canFinish(g), false);
});

test('a move reads back from its text', () => {
  for (const m of [{ from: 'c2', to: 'c5', n: 3 }, { from: 'w', to: 'f0', n: 1 }, { from: 's', to: 'w', n: 1 }, { from: 'c0', to: 'f3', n: 1 }]) {
    assert.deepEqual(parseMove(moveText(m)), m);
  }
  assert.equal(moveText({ from: 'c2', to: 'c5', n: 3 }), 'c2c5x3');
});

test('suits are named and ordered the way the stacks are', () => {
  assert.deepEqual(SUITS, ['spades', 'clubs', 'hearts', 'diamonds']);
});
