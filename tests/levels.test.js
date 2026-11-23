import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelOf } from '../js/levels.js';

const NAMES = ['easy', 'medium', 'hard'];

test('the link names the level', () => {
  assert.equal(levelOf('?level=hard', NAMES), 'hard');
  assert.equal(levelOf('?x=1&level=medium', NAMES), 'medium');
});

test('no level, or one the game does not have, opens the first', () => {
  assert.equal(levelOf('', NAMES), 'easy');
  assert.equal(levelOf('?level=insane', NAMES), 'easy');
  assert.equal(levelOf('?level=', NAMES), 'easy');
});
