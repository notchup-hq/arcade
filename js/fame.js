// The hall of fame, the same in every game: the table (place, initials, the score, then the columns
// only that game counts, such as Patch Night's answers right first time, then the date) and what
// happens when a run ends (a score in the top 5 asks for initials, is saved, and the table opens with
// it marked). The rules of the table itself (top 5, initials) live in js/scores.js; a game only names
// its board, its columns and its words.

import { askInitials } from './initials.js';
import { memory } from './memory.js';
import { formatDate, placeOf } from './scores.js';

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

/**
 * A game's hall of fame. `board()` names the current table (`fuse-box:easy`) and `order` says which
 * end is best (`low` or `high`); `label()`, when given, is the level shown in `caption`. `score`,
 * `columns` and `empty` are as for renderFame. `dialog` is the hall of fame dialog with `table` in
 * it, and `initials` the new high score dialog.
 */
export function createFame({ dialog, table, caption, initials, board, order, label, score, columns, empty }) {
  function render(fresh = -1) {
    if (caption && label) caption.textContent = label();
    renderFame(table, memory.scores(board(), order), { score, columns, empty, fresh });
  }

  return {
    render,
    /**
     * A run just ended with `value`. If it makes the top 5, ask for initials (the dialog says
     * `shown`, the score in the game's words, and holds its buttons for `grace` ms), save it with
     * the game's own numbers (`extra`), and open the hall of fame with the new row marked.
     * Resolves to true when it was saved; nothing scores with 0 or less.
     */
    async offer({ value, shown, extra, grace = 0 }) {
      const place = value > 0 ? placeOf(memory.scores(board(), order), value, order) : -1;
      if (place < 0) return false;
      const who = await askInitials(initials, { place, score: shown, last: memory.initials(), grace });
      if (!who) return false;
      memory.addScore(board(), order, { initials: who, value, extra });
      render(place);
      dialog.showModal();
      return true;
    },
  };
}
