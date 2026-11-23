// The only code in the arcade that touches browser storage. One versioned key holds the visitor's
// sound setting, the initials they typed last, the high score tables of this browser (all time, and the
// current week's, which is dropped when a new week starts), the challengers saved from friends' links
// (a few per board, dropped after four weeks), and the few facts
// a times-table game saw them miss (a short list per level, so a new run can ask them again).
// Nothing is sent anywhere. Every access is wrapped in try/catch, so the arcade works the same when
// storage is blocked, full or empty (a private window): settings fall back to the defaults and a new
// high score lasts until the page is closed.

import { BOARD_ID, addChallenger, challengersOf, cleanChallengers, cleanExtra, cleanInitials, cleanTable, insertScore, weekOf } from './scores.js';

export const STORAGE_KEY = 'arcade:v1';
const PREF_VALUES = { sound: ['off'] };
const WEEK_ID = /^\d{4}-\d{2}-\d{2}$/;
const FACT_KEY = /^\d{1,2}x\d{1,2}$/;
export const MAX_WEAK = 20;

const cleanFacts = (raw) => (Array.isArray(raw) ? [...new Set(raw.filter((k) => typeof k === 'string' && FACT_KEY.test(k)))].slice(0, MAX_WEAK) : []);

/** Stored data made safe: only known settings, valid initials and valid tables survive. */
export function cleanData(raw) {
  const out = { prefs: {}, initials: null, scores: {}, week: {}, weak: {}, challengers: [] };
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return out;
  const prefs = raw.prefs && typeof raw.prefs === 'object' ? raw.prefs : {};
  for (const [k, values] of Object.entries(PREF_VALUES)) if (values.includes(prefs[k])) out.prefs[k] = prefs[k];
  out.initials = cleanInitials(raw.initials);
  if (raw.scores && typeof raw.scores === 'object') {
    for (const [board, table] of Object.entries(raw.scores)) {
      // The order is checked again on read; here only the shape.
      if (BOARD_ID.test(board) && Array.isArray(table)) out.scores[board] = table;
    }
  }
  if (raw.week && typeof raw.week === 'object') {
    for (const [board, { week, table } = {}] of Object.entries(raw.week)) {
      if (BOARD_ID.test(board) && WEEK_ID.test(week) && Array.isArray(table)) out.week[board] = { week, table };
    }
  }
  out.challengers = cleanChallengers(raw.challengers);
  if (raw.weak && typeof raw.weak === 'object') {
    for (const [board, facts] of Object.entries(raw.weak)) {
      if (BOARD_ID.test(board) && cleanFacts(facts).length) out.weak[board] = cleanFacts(facts);
    }
  }
  return out;
}

const browserStorage = () => window.localStorage;

/** @param {() => Storage} getStorage the storage to use; reading it may throw (blocked storage). */
export function createMemory(getStorage = browserStorage) {
  // What this page knows, even when storage is blocked: the last value read or written.
  let data = null;

  function store() {
    try { return getStorage() ?? null; } catch { return null; }
  }

  function read() {
    const s = store();
    if (s) {
      try { data = cleanData(JSON.parse(s.getItem(STORAGE_KEY))); } catch { data ??= cleanData(null); }
    }
    return (data ??= cleanData(null));
  }

  function write(next) {
    data = next;
    const s = store();
    if (!s) return false;
    try {
      s.setItem(STORAGE_KEY, JSON.stringify({ v: 1, ...next }));
      return true;
    } catch {
      return false;
    }
  }

  return {
    /** The settings the visitor picked: { sound?: 'off' }. */
    prefs: () => ({ ...read().prefs }),
    /** Change a setting; null goes back to the default. True when it was stored. */
    setPref(name, value) {
      const d = read();
      const prefs = { ...d.prefs };
      if (value === null) delete prefs[name];
      else if (PREF_VALUES[name]?.includes(value)) prefs[name] = value;
      else return false;
      return write({ ...d, prefs });
    },
    /** The initials typed last, to offer them again, or null. */
    initials: () => read().initials,
    /** The table of one board ('game:level'), best first. */
    scores: (board, order) => cleanTable(read().scores[board], order),
    /** This week's table of one board, best first; empty when its last score is from an earlier week. */
    weekScores(board, order, now = Date.now()) {
      const kept = read().week[board];
      return kept?.week === weekOf(now) ? cleanTable(kept.table, order) : [];
    },
    /**
     * Add a score made just now, with the game's own numbers (`extra`, optional), to the all-time table
     * and to this week's; returns the new all-time table. Remembers the initials too.
     */
    addScore(board, order, { initials, value, extra, date = Date.now() }) {
      const d = read();
      const clean = cleanInitials(initials);
      if (!BOARD_ID.test(board) || !clean) return cleanTable(d.scores[board], order);
      const more = cleanExtra(extra);
      const entry = more ? { initials: clean, value, date, extra: more } : { initials: clean, value, date };
      const table = insertScore(cleanTable(d.scores[board], order), entry, order);
      const week = weekOf(date);
      const thisWeek = d.week[board]?.week === week ? cleanTable(d.week[board].table, order) : [];
      const weekTable = insertScore(thisWeek, entry, order);
      write({ ...d, initials: clean, scores: { ...d.scores, [board]: table }, week: { ...d.week, [board]: { week, table: weekTable } } });
      return table;
    },
    /** The challengers saved for a board ('game:level'), best first: scores from friends' links, not verified. */
    challengers: (board, order) => challengersOf(read().challengers, board, order),
    /** Save a challenger ({ board, initials, value, date }) from a friend's link. True when it was stored. */
    addChallenger(order, challenge) {
      const d = read();
      return write({ ...d, challengers: addChallenger(d.challengers, challenge, order) });
    },
    /** Delete one saved challenger. */
    removeChallenger(board, initials, value) {
      const d = read();
      return write({ ...d, challengers: d.challengers.filter((e) => !(e.board === board && e.initials === initials && e.value === value)) });
    },
    /** Delete every challenger saved for a board. */
    clearChallengers(board) {
      const d = read();
      return write({ ...d, challengers: d.challengers.filter((e) => e.board !== board) });
    },
    /** The facts missed on a board ('game:level'), as 'AxB' keys, most urgent first. */
    weak: (board) => [...(read().weak[board] ?? [])],
    /** Remember the facts missed on a board (at most MAX_WEAK); an empty list forgets them. */
    setWeak(board, keys) {
      const d = read();
      if (!BOARD_ID.test(board)) return false;
      const weak = { ...d.weak };
      const clean = cleanFacts(keys);
      if (clean.length) weak[board] = clean;
      else delete weak[board];
      return write({ ...d, weak });
    },
  };
}

/** The memory every page uses. */
export const memory = createMemory();
