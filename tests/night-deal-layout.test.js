import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropTarget, hit, layout, runRect } from '../games/night-deal/layout.js';
import { CARDS } from '../games/night-deal/rules.js';

const card = (rank, suit) => CARDS[suit * 13 + rank - 1];
const table = (drawBy = 1) => ({
  level: 'draw-1', drawBy, stock: [], waste: [], found: [0, 0, 0, 0],
  cols: Array.from({ length: 7 }, () => ({ down: [], up: [] })),
});

/** The tallest column there is: six cards face down under a run from king to ace in alternating colours. */
function tallest() {
  const g = table();
  g.cols[6].down = [1, 2, 3, 4, 5, 6].map((r) => card(r, 0));
  g.cols[6].up = Array.from({ length: 13 }, (_, k) => card(13 - k, k % 2 ? 2 : 0));
  return g;
}

const SCREENS = [[320, 400], [360, 440], [768, 700], [1280, 520]];

for (const [w, h] of SCREENS) {
  test(`the tallest column fits a ${w} x ${h} table, with text of 16 px or more and every card in reach`, () => {
    const lay = layout(w, h, tallest());
    assert.ok(lay.font >= 16, `font ${lay.font}`);
    const column = lay.cards.filter((c) => c.pile === 'c6');
    assert.equal(column.length, 19);
    for (const c of lay.cards) {
      assert.ok(c.x >= 0 && c.x + lay.cw <= w, `card ${c.id} sticks out sideways: x ${c.x}`);
      assert.ok(c.y >= 0 && c.y + lay.ch <= h, `card ${c.id} sticks out below: y ${c.y}, ${lay.ch} tall, table ${h}`);
    }
    for (let k = 1; k < column.length; k++) {
      const step = column[k].y - column[k - 1].y;
      assert.ok(step >= (column[k - 1].up ? lay.font + 1 : 4), `step ${step} at card ${k}`);
    }
  });
}

test('the columns sit side by side without touching', () => {
  const lay = layout(320, 400, table());
  const xs = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'].map((p) => lay.slots[p].x);
  xs.slice(1).forEach((x, i) => assert.ok(x - xs[i] > lay.cw));
  assert.ok(lay.cw >= 38, `a card is ${lay.cw} px wide at 320`);
});

test('a card is never wider than the biggest size, and on a short wide screen it shrinks to fit', () => {
  assert.ok(layout(1280, 1000, table()).cw <= 104);
  assert.ok(layout(1280, 380, tallest()).ch * 2 < 380);
});

test('three cards turned at a time fan out over the discard pile, one card shows for draw 1', () => {
  const waste = [card(1, 0), card(2, 0), card(3, 0), card(4, 0)];
  const three = layout(360, 440, { ...table(3), waste });
  const shown = three.cards.filter((c) => c.pile === 'w');
  assert.deepEqual(shown.map((c) => c.id), [card(2, 0).id, card(3, 0).id, card(4, 0).id]);
  assert.ok(shown[2].x > shown[0].x);
  assert.equal(layout(360, 440, { ...table(1), waste }).cards.filter((c) => c.pile === 'w').length, 1);
});

test('the undo slot starts after the discard pile\'s fan, in the cell next to it', () => {
  const lay = layout(360, 440, table(3));
  assert.ok(lay.undo.x >= lay.slots.w.x + lay.cw);
  assert.ok(lay.undo.x + lay.undo.w <= lay.slots.f0.x);
  assert.ok(lay.undo.w >= 24);
});

test('a touch finds the card under it and the cards on top of it', () => {
  const g = table();
  g.cols[2] = { down: [card(9, 0)], up: [card(8, 2), card(7, 0), card(6, 3)] };
  g.waste = [card(5, 1)];
  const lay = layout(360, 440, g);
  const [hidden, a, b, c] = lay.cards.filter((x) => x.pile === 'c2');
  const mid = (x) => [x.x + 3, x.y + 3];
  assert.deepEqual(hit(lay, g, ...mid(hidden)), { pile: 'c2', n: 0 });
  assert.deepEqual(hit(lay, g, ...mid(a)), { pile: 'c2', n: 3 });
  assert.deepEqual(hit(lay, g, ...mid(b)), { pile: 'c2', n: 2 });
  assert.deepEqual(hit(lay, g, ...mid(c)), { pile: 'c2', n: 1 });
  assert.deepEqual(hit(lay, g, c.x + 3, c.y + lay.ch - 3), { pile: 'c2', n: 1 }, 'the end of the last card');
  assert.deepEqual(hit(lay, g, lay.slots.w.x + 2, lay.slots.w.y + 2), { pile: 'w', n: 1 });
  assert.deepEqual(hit(lay, g, lay.slots.c5.x + 2, lay.slots.c5.y + 2), { pile: 'c5', n: 0 }, 'an empty column');
  assert.deepEqual(hit(lay, g, lay.undo.x + 2, lay.undo.y + 2), { pile: 'u', n: 0 });
  assert.equal(hit(lay, g, 1, lay.h - 1), null);
});

test('a run dropped on a column that takes it lands there, and on nothing it goes back', () => {
  const g = table();
  g.cols[0] = { down: [], up: [card(7, 0)] };
  g.cols[1] = { down: [], up: [card(9, 1)] };
  g.cols[2] = { down: [], up: [card(6, 2)] };
  const lay = layout(360, 440, g);
  const end = runRect(lay, 'c0');
  assert.equal(dropTarget(lay, g, { pile: 'c2', n: 1 }, end.x + 4, end.y + 10), 'c0');
  assert.equal(dropTarget(lay, g, { pile: 'c2', n: 1 }, lay.slots.c1.x, lay.slots.c1.y), null, 'a 9 does not take a 6');
  assert.equal(dropTarget(lay, g, { pile: 'c2', n: 1 }, 0, lay.h - lay.ch), null);
});

test('a card dropped near two places that both take it lands on the one it covers more', () => {
  const g = table();
  g.cols[0] = { down: [], up: [card(7, 0)] };
  g.cols[1] = { down: [], up: [card(7, 1)] };
  g.cols[2] = { down: [], up: [card(6, 2)] };
  const lay = layout(360, 440, g);
  const a = runRect(lay, 'c0');
  const b = runRect(lay, 'c1');
  const y = a.y + 12;
  assert.equal(dropTarget(lay, g, { pile: 'c2', n: 1 }, a.x + 6, y), 'c0');
  assert.equal(dropTarget(lay, g, { pile: 'c2', n: 1 }, b.x - 6, y), 'c1');
});

test('an ace dropped on its own stack lands there', () => {
  const g = table();
  g.cols[0].up = [card(1, 2)];
  const lay = layout(360, 440, g);
  assert.equal(dropTarget(lay, g, { pile: 'c0', n: 1 }, lay.slots.f2.x + 3, lay.slots.f2.y + 3), 'f2');
});
