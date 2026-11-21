import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ENTRIES, cleanInitials, cleanTable, formatDate, formatTime, insertScore, placeOf } from '../js/scores.js';

const entry = (value, date = 1, initials = 'ABC') => ({ initials, value, date });

test('initials are three letters, upper case, Finnish letters allowed', () => {
  assert.equal(cleanInitials('abc'), 'ABC');
  assert.equal(cleanInitials('äöå'), 'ÄÖÅ');
  assert.equal(cleanInitials('A1B'), null);
  assert.equal(cleanInitials('AB'), null);
  assert.equal(cleanInitials('ABCD'), null);
  assert.equal(cleanInitials(42), null);
});

test('a time table puts the fastest first, and the earlier score first on a tie', () => {
  const table = cleanTable([entry(900, 2), entry(500, 3), entry(900, 1, 'XYZ')], 'low');
  assert.deepEqual(table.map((e) => [e.value, e.initials]), [[500, 'ABC'], [900, 'XYZ'], [900, 'ABC']]);
});

test('a points table puts the highest first', () => {
  assert.deepEqual(cleanTable([entry(5), entry(50)], 'high').map((e) => e.value), [50, 5]);
});

test('broken entries are dropped and the table is cut at the limit', () => {
  const raw = [null, entry(-1), entry(Number.NaN), { initials: 'AB', value: 1, date: 1 }, ...Array.from({ length: 15 }, (_, i) => entry(i))];
  const table = cleanTable(raw, 'low');
  assert.equal(table.length, MAX_ENTRIES);
  assert.equal(table[0].value, 0);
  assert.deepEqual(cleanTable('nope', 'low'), []);
});

test('a score that ties an old one goes below it', () => {
  const table = [entry(100), entry(200)];
  assert.equal(placeOf(table, 200, 'low'), 2);
  assert.equal(placeOf(table, 150, 'low'), 1);
});

test('a score worse than a full table does not make it', () => {
  const full = Array.from({ length: MAX_ENTRIES }, (_, i) => entry(i + 1));
  assert.equal(placeOf(full, 99, 'low'), -1);
  assert.equal(insertScore(full, entry(99), 'low'), full);
  const better = insertScore(full, entry(0), 'low');
  assert.equal(better.length, MAX_ENTRIES);
  assert.equal(better[0].value, 0);
});

test('times show tenths, and minutes from a minute on', () => {
  assert.equal(formatTime(0), '0.0');
  assert.equal(formatTime(42_399), '42.3');
  assert.equal(formatTime(62_500), '1:02.5');
});

test('dates show day, month and year', () => {
  assert.equal(formatDate(new Date(2026, 10, 21, 18).getTime()), '21 Nov 2026');
});
