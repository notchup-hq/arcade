import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, createMemory } from '../js/memory.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

const blocked = () => { throw new Error('SecurityError'); };

test('sound off is remembered, and turning it back on forgets it', () => {
  const s = fakeStorage();
  const m = createMemory(() => s);
  assert.deepEqual(m.prefs(), {});
  assert.ok(m.setPref('sound', 'off'));
  assert.deepEqual(createMemory(() => s).prefs(), { sound: 'off' });
  m.setPref('sound', null);
  assert.deepEqual(createMemory(() => s).prefs(), {});
});

test('unknown settings and values are refused', () => {
  const m = createMemory(() => fakeStorage());
  assert.equal(m.setPref('sound', 'loud'), false);
  assert.equal(m.setPref('theme', 'light'), false);
  assert.deepEqual(m.prefs(), {});
});

test('a score is added to its board and the initials are remembered', () => {
  const s = fakeStorage();
  const m = createMemory(() => s);
  m.addScore('fuse-box:easy', 'low', { initials: 'pkk', value: 42_000, date: 5 });
  m.addScore('fuse-box:easy', 'low', { initials: 'ABC', value: 30_000, date: 6 });
  const again = createMemory(() => s);
  assert.deepEqual(again.scores('fuse-box:easy', 'low').map((e) => e.initials), ['ABC', 'PKK']);
  assert.deepEqual(again.scores('fuse-box:hard', 'low'), []);
  assert.equal(again.initials(), 'ABC');
});

test('a score with bad initials or a bad board is not stored', () => {
  const s = fakeStorage();
  const m = createMemory(() => s);
  m.addScore('fuse-box:easy', 'low', { initials: 'A1', value: 1 });
  m.addScore('../x', 'low', { initials: 'ABC', value: 1 });
  assert.equal(s.data[STORAGE_KEY], undefined);
});

test('stored junk or an edited entry cannot break the page', () => {
  const s = fakeStorage({ [STORAGE_KEY]: '{"v":1,"prefs":{"sound":"xx"},"initials":"<b>","scores":{"fuse-box:easy":[{"initials":"ABC","value":"fast","date":1}],"bad key":[]}}' });
  const m = createMemory(() => s);
  assert.deepEqual(m.prefs(), {});
  assert.equal(m.initials(), null);
  assert.deepEqual(m.scores('fuse-box:easy', 'low'), []);
  assert.deepEqual(createMemory(() => fakeStorage({ [STORAGE_KEY]: 'not json' })).prefs(), {});
});

test('with storage blocked the arcade still works, and a score lasts while the page is open', () => {
  const m = createMemory(blocked);
  assert.deepEqual(m.prefs(), {});
  assert.equal(m.setPref('sound', 'off'), false);
  const table = m.addScore('fuse-box:easy', 'low', { initials: 'ABC', value: 1000, date: 1 });
  assert.equal(table.length, 1);
  assert.equal(m.scores('fuse-box:easy', 'low').length, 1);
});

test('missed facts are kept per board, bounded and cleaned', () => {
  const s = fakeStorage();
  const m = createMemory(() => s);
  assert.deepEqual(m.weak('patch-night:medium'), []);
  m.setWeak('patch-night:medium', ['7x8', 'bad', '7x8', ...Array.from({ length: 30 }, (_, i) => `2x${i + 1}`)]);
  const kept = createMemory(() => s).weak('patch-night:medium');
  assert.equal(kept.length, 20);
  assert.equal(kept[0], '7x8');
  assert.ok(kept.every((k) => /^\d{1,2}x\d{1,2}$/.test(k)));
  m.setWeak('patch-night:medium', []);
  assert.deepEqual(createMemory(() => s).weak('patch-night:medium'), []);
});

test('missed facts work with blocked storage', () => {
  const m = createMemory(blocked);
  m.setWeak('patch-night:simple', ['3x4']);
  assert.deepEqual(m.weak('patch-night:simple'), ['3x4']);
});

test('initials with dots are stored and read back', () => {
  const s = fakeStorage();
  const m = createMemory(() => s);
  const table = m.addScore('lob:solo', 'high', { initials: 'P.K', value: 12, date: 1 });
  assert.equal(table[0].initials, 'P.K');
  assert.equal(m.initials(), 'P.K');
});

test('a stored table of ten from before reads back as the best five', () => {
  const old = Array.from({ length: 10 }, (_, i) => ({ initials: 'ABC', value: i, date: 1 }));
  const s = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ v: 1, scores: { 'lob:solo': old } }) });
  const m = createMemory(() => s);
  assert.deepEqual(m.scores('lob:solo', 'high').map((e) => e.value), [9, 8, 7, 6, 5]);
});

test('a score is saved with the numbers its game counts', () => {
  const s = fakeStorage();
  const m = createMemory(() => s);
  m.addScore('notch-up:tower', 'high', { initials: 'PEK', value: 30, extra: { perfect: 6 } });
  m.addScore('notch-up:tower', 'high', { initials: 'PEK', value: 20 });
  assert.deepEqual(m.scores('notch-up:tower', 'high').map((e) => e.extra), [{ perfect: 6 }, undefined]);
});

test('a score also goes on this week\'s table, which starts over on Monday', () => {
  const s = fakeStorage();
  const m = createMemory(() => s);
  const tue = Date.parse('2026-11-24T10:00:00Z');
  m.addScore('lob:solo', 'high', { initials: 'AAA', value: 500, date: tue });
  m.addScore('lob:solo', 'high', { initials: 'BBB', value: 200, date: tue + 1000 });
  const again = createMemory(() => s);
  assert.deepEqual(again.weekScores('lob:solo', 'high', tue).map((e) => e.initials), ['AAA', 'BBB']);
  const nextMon = Date.parse('2026-11-29T22:00:00Z');
  assert.deepEqual(again.weekScores('lob:solo', 'high', nextMon), [], 'a new week is empty');
  assert.deepEqual(again.scores('lob:solo', 'high').map((e) => e.initials), ['AAA', 'BBB'], 'all time is kept');
  again.addScore('lob:solo', 'high', { initials: 'CCC', value: 100, date: nextMon });
  assert.deepEqual(again.weekScores('lob:solo', 'high', nextMon).map((e) => e.initials), ['CCC']);
});

test('a score that beats nothing all time can still make this week', () => {
  const s = fakeStorage();
  const m = createMemory(() => s);
  const t = Date.parse('2026-11-24T10:00:00Z');
  for (let i = 0; i < 5; i++) m.addScore('lob:solo', 'high', { initials: 'OLD', value: 1000 + i, date: t - 14 * 864e5 });
  assert.equal(m.weekScores('lob:solo', 'high', t).length, 0);
  m.addScore('lob:solo', 'high', { initials: 'NEW', value: 10, date: t });
  assert.deepEqual(m.weekScores('lob:solo', 'high', t).map((e) => e.initials), ['NEW']);
  assert.equal(m.scores('lob:solo', 'high').some((e) => e.initials === 'NEW'), false);
});
