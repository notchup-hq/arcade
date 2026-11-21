// The only code in the arcade that touches browser storage. One versioned key holds the visitor's
// sound setting, the initials they typed last, the high score tables of this browser, and the few facts
// a times-table game saw them miss (a short list per level, so a new run can ask them again).
// Nothing is sent anywhere. Every access is wrapped in try/catch, so the arcade works the same when
// storage is blocked, full or empty (a private window): settings fall back to the defaults and a new
// high score lasts until the page is closed.

import { cleanInitials, cleanTable, insertScore } from './scores.js';

export const STORAGE_KEY = 'arcade:v1';
const PREF_VALUES = { sound: ['off'] };
const BOARD_ID = /^[a-z0-9-]+:[a-z0-9-]+$/;
const FACT_KEY = /^\d{1,2}x\d{1,2}$/;
export const MAX_WEAK = 20;

const cleanFacts = (raw) => (Array.isArray(raw) ? [...new Set(raw.filter((k) => typeof k === 'string' && FACT_KEY.test(k)))].slice(0, MAX_WEAK) : []);

/** Stored data made safe: only known settings, valid initials and valid tables survive. */
export function cleanData(raw) {
  const out = { prefs: {}, initials: null, scores: {}, weak: {} };
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
    /** Add a score made just now; returns the new table. Remembers the initials too. */
    addScore(board, order, { initials, value, date = Date.now() }) {
      const d = read();
      const clean = cleanInitials(initials);
      if (!BOARD_ID.test(board) || !clean) return cleanTable(d.scores[board], order);
      const table = insertScore(cleanTable(d.scores[board], order), { initials: clean, value, date }, order);
      write({ ...d, initials: clean, scores: { ...d.scores, [board]: table } });
      return table;
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
