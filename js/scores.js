// High score tables: pure, so the games, the hall and the tests share one set of rules. A table is the
// top MAX_ENTRIES of one board (a game and its level), the earlier score first among equal ones. An
// entry is { initials, value, date, extra }: initials, the score (a time in ms or points), when it was
// made, and the few numbers only that game counts (extra, optional; js/fame.js shows them).
// Every game uses these rules and the same initials dialog (js/initials.js). Each board has two tables:
// all time, and this week's, which starts empty on Monday (Helsinki time, whatever the visitor's clock).

export const MAX_ENTRIES = 5;
const INITIALS = /^(?=.*[A-ZÅÄÖ])[A-ZÅÄÖ.]{3}$/;

/** 'low' when a smaller value wins (a time), 'high' when a bigger one does (points). */
const better = (order) => (order === 'low' ? (a, b) => a < b : (a, b) => a > b);

/** Best first; among equal scores the smaller `tie` field (the earlier date) goes first. */
const byBest = (order, tie) => {
  const wins = better(order);
  return (a, b) => (a.value === b.value ? a[tie] - b[tie] : wins(a.value, b.value) ? -1 : 1);
};

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
  return raw.map(cleanEntry).filter(Boolean).sort(byBest(order, 'date')).slice(0, MAX_ENTRIES);
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

const HELSINKI = { timeZone: 'Europe/Helsinki', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' };
const DAYS_SINCE_MONDAY = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
let helsinki = null;

/**
 * The week a moment (ms) falls in, named by its Monday in Helsinki: "2026-11-23". A week runs from
 * Monday 00:00 to Sunday 23:59 there, the same for everyone, so the tables turn over together.
 */
export function weekOf(ms) {
  helsinki ??= new Intl.DateTimeFormat('en-US', HELSINKI);
  const p = Object.fromEntries(helsinki.formatToParts(ms).map(({ type, value }) => [type, value]));
  const monday = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) - DAYS_SINCE_MONDAY[p.weekday]);
  return new Date(monday).toISOString().slice(0, 10);
}

/** Where a new score is shown: the all-time place when it made that table, else this week's; null when neither. */
export function whereMade(allPlace, weekPlace) {
  if (allPlace >= 0) return { place: allPlace, view: 'all' };
  return weekPlace >= 0 ? { place: weekPlace, view: 'week' } : null;
}

// Challengers: scores from friends' links, kept apart from a player's own tables. Not verified, so they
// are small: the best few per board, a total cap, and they expire. An entry is { board, initials, value,
// date, saved }: when it was made and when the visitor saved it.

export const MAX_CHALLENGERS = 5;
export const MAX_CHALLENGERS_ALL = 50;
export const CHALLENGER_DAYS = 28;
/** A board's name: its game and level, 'fuse-box:easy'. */
export const BOARD_ID = /^[a-z0-9-]+:[a-z0-9-]+$/;
export const DAY_MS = 86_400_000;

function cleanChallenger(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { board, value, date, saved } = raw;
  const initials = cleanInitials(raw.initials);
  if (typeof board !== 'string' || !BOARD_ID.test(board) || !initials) return null;
  if (![value, date, saved].every(Number.isFinite) || value < 1) return null;
  return { board, initials, value, date, saved };
}

/** A saved list made safe: valid entries only, none saved over CHALLENGER_DAYS ago, the newest MAX_CHALLENGERS_ALL. */
export function cleanChallengers(raw, now = Date.now()) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(cleanChallenger)
    .filter((e) => e && e.saved > now - CHALLENGER_DAYS * DAY_MS)
    .sort((a, b) => b.saved - a.saved)
    .slice(0, MAX_CHALLENGERS_ALL);
}

/** The challengers of one board, best first, at most MAX_CHALLENGERS. */
export function challengersOf(list, board, order) {
  return list.filter((e) => e.board === board).sort(byBest(order, 'saved')).slice(0, MAX_CHALLENGERS);
}

/** How far ahead of `theirs` your `mine` is: positive when you are ahead, whichever end of the scale is best; undefined without a score of yours. */
export function lead(order, mine, theirs) {
  if (mine === undefined) return undefined;
  return order === 'high' ? mine - theirs : theirs - mine;
}

/**
 * `list` with `entry` added. The same initials on the same board keep only the better score, so a
 * link opened twice changes nothing; a board keeps its best MAX_CHALLENGERS.
 */
export function addChallenger(list, entry, order, now = Date.now()) {
  const same = list.find((e) => e.board === entry.board && e.initials === entry.initials);
  if (same && !better(order)(entry.value, same.value)) return list;
  const added = [...list.filter((e) => e !== same), { ...entry, saved: now }];
  const top = new Set(challengersOf(added, entry.board, order));
  return cleanChallengers(added.filter((e) => e.board !== entry.board || top.has(e)), now);
}
