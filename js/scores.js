// High score tables: pure, so the games, the hall and the tests share one set of rules. A table is the
// top MAX_ENTRIES of one board (a game and its level), newest first among equal scores. An entry is
// { initials, value, date }: three letters, the score (a time in ms or points) and when it was made (ms).

export const MAX_ENTRIES = 10;

/** 'low' when a smaller value wins (a time), 'high' when a bigger one does (points). */
const better = (order) => (order === 'low' ? (a, b) => a < b : (a, b) => a > b);

/** Three letters, upper case (A–Z and Å, Ä, Ö), or null. */
export function cleanInitials(raw) {
  const s = typeof raw === 'string' ? raw.toLocaleUpperCase('fi').replace(/[^A-ZÅÄÖ]/g, '') : '';
  return s.length === 3 ? s : null;
}

function cleanEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const initials = cleanInitials(raw.initials);
  const { value, date } = raw;
  if (!initials || !Number.isFinite(value) || value < 0 || !Number.isFinite(date)) return null;
  return { initials, value, date };
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

/** A date (ms) as the tables show it: "21 Nov 2026". */
export function formatDate(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** A time in ms as the tables show it: "42.3" seconds, or "1:02.5" from a minute on. */
export function formatTime(ms) {
  const tenths = Math.floor(ms / 100);
  const s = Math.floor(tenths / 10);
  const frac = tenths % 10;
  if (s < 60) return `${s}.${frac}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${frac}`;
}
