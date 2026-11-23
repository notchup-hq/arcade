import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gridMove } from '../js/grid.js';

// A board 4 wide with a short last row: cells 0-3, 4-7, 8-9.
const move = (i, key) => gridMove(i, key, 4, 10);

test('arrows move one cell and stop at the edges', () => {
  assert.equal(move(5, 'ArrowLeft'), 4);
  assert.equal(move(4, 'ArrowLeft'), 4);
  assert.equal(move(5, 'ArrowRight'), 6);
  assert.equal(move(7, 'ArrowRight'), 7);
  assert.equal(move(5, 'ArrowUp'), 1);
  assert.equal(move(1, 'ArrowUp'), 1);
  assert.equal(move(5, 'ArrowDown'), 9);
});

test('a short last row: nothing below it, and right and End stop at its last cell', () => {
  assert.equal(move(6, 'ArrowDown'), 6);
  assert.equal(move(9, 'ArrowRight'), 9);
  assert.equal(move(8, 'End'), 9);
});

test('Home and End go to the ends of the row', () => {
  assert.equal(move(6, 'Home'), 4);
  assert.equal(move(5, 'End'), 7);
});

test('other keys do not move', () => {
  assert.equal(move(5, 'Enter'), -1);
  assert.equal(move(5, 't'), -1);
});
