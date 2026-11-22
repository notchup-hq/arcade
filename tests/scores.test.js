import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ENTRIES, cleanExtra, cleanInitials, cleanTable, formatDate, formatTime, insertScore, placeOf, typedInitials } from '../js/scores.js';

const entry = (value, date = 1, initials = 'ABC') => ({ initials, value, date });

test('initials are three letters or dots, upper case, Finnish letters allowed', () => {
  assert.equal(cleanInitials('abc'), 'ABC');
  assert.equal(cleanInitials('äöå'), 'ÄÖÅ');
  assert.equal(cleanInitials('p.k'), 'P.K');
  assert.equal(cleanInitials('PK.'), 'PK.');
  assert.equal(cleanInitials('...'), null);
  assert.equal(cleanInitials('A1B'), null);
  assert.equal(cleanInitials('AB'), null);
  assert.equal(cleanInitials('ABCD'), null);
  assert.equal(cleanInitials(42), null);
});

test('typing keeps upper case letters and dots, three at most', () => {
  assert.equal(typedInitials('p.k.'), 'P.K');
  assert.equal(typedInitials('pete'), 'PET');
  assert.equal(typedInitials('a1-b c'), 'ABC');
});

test('a table keeps the top 5', () => {
  assert.equal(MAX_ENTRIES, 5);
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

test('dates show day, month and year, short: 21Nov26', () => {
  assert.equal(formatDate(new Date(2026, 10, 21, 18).getTime()), '21Nov26');
  assert.equal(formatDate(new Date(2030, 4, 2).getTime()), '2May30');
});

test("an entry keeps the few numbers only its game counts, made safe", () => {
  assert.deepEqual(cleanExtra({ right: 92, avg: 1800 }), { right: 92, avg: 1800 });
  assert.equal(cleanExtra({ right: -1, Bad: 2, avg: NaN }), undefined);
  assert.deepEqual(Object.keys(cleanExtra({ a: 1, b: 2, c: 3, d: 4 })), ['a', 'b', 'c']);
  assert.equal(cleanExtra('92'), undefined);
  const [kept, plain] = cleanTable([{ ...entry(5), extra: { perfect: 7, x: 'no' } }, entry(3)], 'high');
  assert.deepEqual(kept.extra, { perfect: 7 });
  assert.equal('extra' in plain, false);
});
