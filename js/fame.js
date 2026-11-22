// The hall of fame table, laid out the same in every game: place, initials, the score, then the
// columns only that game counts (Patch Night's answers right first time, say), then the date. The
// rules of the table itself (top 5, initials) live in js/scores.js; a game only names its columns.

import { formatDate } from './scores.js';

// The year may wrap under the day and month when a long score leaves a small phone no room.
const dateCell = (ms) => formatDate(ms).replace(/\d+$/, '\u200b$&');

function row(tag, cells, attrs = {}) {
  const tr = document.createElement('tr');
  for (const text of cells) {
    const cell = document.createElement(tag);
    cell.textContent = text;
    for (const [k, v] of Object.entries(attrs)) cell.setAttribute(k, v);
    tr.append(cell);
  }
  return tr;
}

/**
 * Fill `table` (its <thead> and <tbody>) with `entries`, best first. `score` is { head, cell } for
 * the score column; each of `columns` is { key, head, cell } for one of the entries' `extra` numbers
 * (an older entry without it shows a dash). The row at `fresh` (0-based) is marked new; `empty` is
 * what an empty table says.
 */
export function renderFame(table, entries, { score, columns = [], fresh = -1, empty = 'No scores on this browser yet. Be the first.' }) {
  const heads = ['#', 'Who', score.head, ...columns.map((c) => c.head), 'Date'];
  table.tHead.replaceChildren(row('th', heads, { scope: 'col' }));
  const rows = entries.map((e, k) => {
    const extra = columns.map((c) => (Number.isFinite(e.extra?.[c.key]) ? c.cell(e.extra[c.key]) : '–'));
    const tr = row('td', [String(k + 1), e.initials, score.cell(e.value), ...extra, dateCell(e.date)]);
    if (k === fresh) tr.className = 'new';
    return tr;
  });
  if (!rows.length) {
    const tr = row('td', [empty]);
    tr.firstChild.colSpan = heads.length;
    rows.push(tr);
  }
  table.tBodies[0].replaceChildren(...rows);
}
