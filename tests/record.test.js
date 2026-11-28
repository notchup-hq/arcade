import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRecord } from '../js/record.js';

test('a run is a record when it tops an existing all-time best', () => {
  assert.equal(isRecord({ value: 5 }, { view: 'all', place: 0 }), true);
});

test('a first score, a lower place or a weekly-only score is not a record', () => {
  assert.equal(isRecord(undefined, { view: 'all', place: 0 }), false);
  assert.equal(isRecord({ value: 5 }, { view: 'all', place: 2 }), false);
  assert.equal(isRecord({ value: 5 }, { view: 'week', place: 0 }), false);
});
