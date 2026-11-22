// High score tables: pure, so the games, the hall and the tests share one set of rules. A table is the
// top MAX_ENTRIES of one board (a game and its level), the earlier score first among equal ones. An
// entry is { initials, value, date, extra }: initials, the score (a time in ms or points), when it was
// made, and the few numbers only that game counts (extra, optional; js/fame.js shows them).
// Every game uses these rules and the same initials dialog (js/initials.js).

export const MAX_ENTRIES = 5;
const INITIALS = /^(?=.*[A-ZÅÄÖ])[A-ZÅÄÖ.]{3}$/;

/** 'low' when a smaller value wins (a time), 'high' when a bigger one does (points). */
const better = (order) => (order === 'low' ? (a, b) => a < b : (a, b) => a > b);

/** Initials as typed so far: upper case letters (A–Z and Å, Ä, Ö) and dots, at most three. */
export function typedInitials(raw) {
  return String(raw).toLocaleUpperCase('fi').replace(/[^A-ZÅÄÖ.]/g, '').slice(0, 3);
}

/** Valid initials, upper case, or null: three letters or dots ("PEK", "P.K"), at least one a letter. */
export function cleanInitials(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.toLocaleUpperCase('fi');
  return INITIALS.test(s) ? s : null;
}

const MAX_EXTRA = 3;
const EXTRA_KEY = /^[a-z]{1,12}$/;

/** A game's own numbers for an entry, made safe: at most MAX_EXTRA, short names, numbers 0 or more. */
export function cleanExtra(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const pairs = Object.entries(raw).filter(([k, v]) => EXTRA_KEY.test(k) && Number.isFinite(v) && v >= 0).slice(0, MAX_EXTRA);
  return pairs.length ? Object.fromEntries(pairs) : undefined;
}

function cleanEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const initials = cleanInitials(raw.initials);
  const { value, date } = raw;
  if (!initials || !Number.isFinite(value) || value < 0 || !Number.isFinite(date)) return null;
  const extra = cleanExtra(raw.extra);
  return extra ? { initials, value, date, extra } : { initials, value, date };
}

/** A table made safe: valid entries only, best first (an earlier date wins a tie), at most MAX_ENTRIES. */
export function cleanTable(raw, order) {
  if (!Array.isArray(raw)) return [];
  const wins = better(order);
  return raw
    .map(cleanEntry)
    .filter(Boolean)
    .sort((a, b) => (a.value === b.value ? a.date - b.date : wins(a.value, b.value) ? -1 : 1))
    .slice(0, MAX_ENTRIES);
}

/** The place (0-based) a new score would take, or -1 when it does not make the table. */
export function placeOf(table, value, order) {
  const wins = better(order);
  const i = table.findIndex((e) => wins(value, e.value));
  if (i >= 0) return i;
  return table.length < MAX_ENTRIES ? table.length : -1;
}

/** `table` with `entry` in its place; unchanged when the score does not make it. */
export function insertScore(table, entry, order) {
  const at = placeOf(table, entry.value, order);
  if (at < 0) return table;
  return [...table.slice(0, at), entry, ...table.slice(at)].slice(0, MAX_ENTRIES);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A date (ms) as the tables show it, short enough for a phone: "21Nov26". */
export function formatDate(ms) {
  const d = new Date(ms);
  return `${d.getDate()}${MONTHS[d.getMonth()]}${String(d.getFullYear() % 100).padStart(2, '0')}`;
}

/** A time in ms as the tables show it: "42.3" seconds, or "1:02.5" from a minute on. */
export function formatTime(ms) {
  const tenths = Math.floor(ms / 100);
  const s = Math.floor(tenths / 10);
  const frac = tenths % 10;
  if (s < 60) return `${s}.${frac}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${frac}`;
}
