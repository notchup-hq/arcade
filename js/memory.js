// The only code in the arcade that touches browser storage. One versioned key holds the visitor's
// sound setting, the initials they typed last, and the high score tables of this browser.
// Nothing is sent anywhere. Every access is wrapped in try/catch, so the arcade works the same when
// storage is blocked, full or empty (a private window): settings fall back to the defaults and a new
// high score lasts until the page is closed.

import { cleanInitials, cleanTable, insertScore } from './scores.js';

export const STORAGE_KEY = 'arcade:v1';
const PREF_VALUES = { sound: ['off'] };
const BOARD_ID = /^[a-z0-9-]+:[a-z0-9-]+$/;

/** Stored data made safe: only known settings, valid initials and valid tables survive. */
export function cleanData(raw) {
  const out = { prefs: {}, initials: null, scores: {} };
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
  };
}

/** The memory every page uses. */
export const memory = createMemory();
