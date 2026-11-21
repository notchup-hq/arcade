// js/logo.js draws the Notchup logo in parts so it can move; its shapes must stay the logo's own.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARROW, GEAR, STAR, TEETH } from '../js/logo.js';
import { read } from './helpers.js';

test('the moving logo has the same shapes, in the same order, as assets/mark.svg', () => {
  const file = [...read('assets/mark.svg').matchAll(/<polygon points="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual([...GEAR, ...STAR, ...ARROW].map(([, points]) => points), file);
});

test('the gear has as many teeth as TEETH says', () => {
  assert.equal(GEAR[0][1].trim().split(/\s+/).length, TEETH * 4);
});
