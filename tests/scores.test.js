import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, MAX_ENTRIES, addChallenger, challengersOf, cleanChallengers, cleanExtra, cleanInitials, cleanTable, formatDate, lead, formatTime, weekOf, whereMade, insertScore, placeOf, typedInitials } from '../js/scores.js';

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

test('a week runs from Monday 00:00 to Sunday 23:59 in Helsinki, summer and winter time alike', () => {
  const week = (iso) => weekOf(Date.parse(iso));
  assert.equal(week('2026-11-22T21:59:59Z'), '2026-11-16', 'Sunday 23:59 in Helsinki');
  assert.equal(week('2026-11-22T22:00:00Z'), '2026-11-23', 'Monday 00:00 in Helsinki');
  assert.equal(week('2026-11-29T21:59:59Z'), '2026-11-23');
  assert.equal(week('2027-03-28T20:59:59Z'), '2027-03-22', 'before the clocks go forward');
  assert.equal(week('2027-03-28T21:00:00Z'), '2027-03-29', 'after they go forward');
  assert.equal(week('2026-12-31T23:00:00Z'), '2026-12-28', 'across New Year');
});

test('a new score shows on the all-time table when it made that, else on the week, else nowhere', () => {
  assert.deepEqual(whereMade(2, 0), { place: 2, view: 'all' });
  assert.deepEqual(whereMade(-1, 3), { place: 3, view: 'week' });
  assert.equal(whereMade(-1, -1), null);
});

// Challengers: friends' scores, kept few and short-lived.

const NOW = Date.UTC(2026, 11, 1);
const challenger = (initials, value, saved = NOW, board = 'lob:solo') => ({ board, initials, value, date: saved, saved });

test('challengers: a saved list keeps only valid, recent entries, newest first, at most 50', () => {
  const list = [challenger('ABC', 5), { ...challenger('ABC', 5), value: 0 }, { ...challenger('A1C', 5) }, challenger('OLD', 5, NOW - 29 * DAY_MS), null, 'x'];
  assert.deepEqual(cleanChallengers(list, NOW).map((e) => e.initials), ['ABC']);
  assert.deepEqual(cleanChallengers('nope', NOW), []);
  const many = Array.from({ length: 60 }, (_, k) => challenger('ABC', k + 1, NOW - k, `g${k}:x`));
  assert.equal(cleanChallengers(many, NOW).length, 50);
});

test('challengers: the best come first, five per board', () => {
  let list = [];
  for (const [who, v] of [['AAA', 10], ['BBB', 30], ['CCC', 20], ['DDD', 50], ['EEE', 40], ['FFF', 5]]) list = addChallenger(list, challenger(who, v), 'high', NOW);
  assert.deepEqual(challengersOf(list, 'lob:solo', 'high').map((e) => e.initials), ['DDD', 'EEE', 'BBB', 'CCC', 'AAA']);
  assert.equal(list.filter((e) => e.initials === 'FFF').length, 0);
  assert.equal(challengersOf(list, 'lob:solo', 'low')[0].initials, 'AAA');
});

test('challengers: the same initials on a board keep only the better score', () => {
  let list = addChallenger([], challenger('PEK', 100), 'high', NOW);
  assert.equal(addChallenger(list, challenger('PEK', 100), 'high', NOW), list);
  assert.equal(addChallenger(list, challenger('PEK', 50), 'high', NOW), list);
  list = addChallenger(list, challenger('PEK', 150), 'high', NOW);
  assert.deepEqual(list.map((e) => e.value), [150]);
  list = addChallenger(list, challenger('PEK', 90, NOW, 'fuse-box:easy'), 'low', NOW);
  assert.equal(list.length, 2);
});

test('lead: positive when you are ahead, on either end of the scale, and nothing without a score of yours', () => {
  assert.equal(lead('high', 1950, 1840), 110);
  assert.equal(lead('high', 1200, 1840), -640);
  assert.equal(lead('low', 41_000, 42_300), 1300);
  assert.equal(lead('low', 45_000, 42_300), -2700);
  assert.equal(lead('high', undefined, 1840), undefined);
});
