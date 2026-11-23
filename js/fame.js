// The hall of fame, the same in every game: the table (place, initials, the score, then the columns
// only that game counts, such as Patch Night's answers right first time, then the date) and what
// happens when a run ends (a score in the top 5 asks for initials, is saved, and the table opens with
// it marked). Two tables per board, All time and This week, switched by two buttons above the table
// (it always opens on All time). The rules of the table itself (top 5, initials) live in js/scores.js; a game only names
// its board, its columns and its words.

import { askInitials } from './initials.js';
import { memory } from './memory.js';
import { MAX_ENTRIES, formatDate, placeOf, whereMade } from './scores.js';

const VIEWS = [
  { id: 'all', name: 'All time' },
  { id: 'week', name: 'This week', note: 'A new week starts on Monday.' },
];

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
 * (an older entry without it shows a dash). The row at `fresh` (0-based) is marked new. The table
 * always has MAX_ENTRIES rows, the unplayed places as dashes, so its height never depends on the data.
 */
export function renderFame(table, entries, { score, columns = [], fresh = -1 }) {
  const heads = ['#', 'Who', score.head, ...columns.map((c) => c.head), 'Date'];
  table.tHead.replaceChildren(row('th', heads, { scope: 'col' }));
  const rows = entries.map((e, k) => {
    const extra = columns.map((c) => (Number.isFinite(e.extra?.[c.key]) ? c.cell(e.extra[c.key]) : '–'));
    const tr = row('td', [String(k + 1), e.initials, score.cell(e.value), ...extra, dateCell(e.date)]);
    if (k === fresh) tr.className = 'new';
    return tr;
  });
  for (let k = rows.length; k < MAX_ENTRIES; k++) {
    rows.push(row('td', [String(k + 1), '---', ...heads.slice(2).map(() => '\u2013')]));
  }
  table.tBodies[0].replaceChildren(...rows);
}

/**
 * A game's hall of fame. `board()` names the current table (`fuse-box:easy`) and `order` says which
 * end is best (`low` or `high`); `label()`, when given, is the level shown in `caption`. `score`
 * and `columns` are as for renderFame. `dialog` is the hall of fame dialog with `table` in
 * it, and `initials` the new high score dialog.
 */
export function createFame({ dialog, table, caption, initials, board, order, label, score, columns }) {
  const credit = dialog.querySelector('.credit');
  const kept = credit?.textContent ?? '';
  // One line of small print per view, stacked in the same place, so the dialog is as tall on a
  // small phone whichever table shows (the longer line wraps there).
  const prints = VIEWS.map(({ note }) => {
    const span = document.createElement('span');
    span.textContent = note ? `${kept} ${note}` : kept;
    return span;
  });
  credit?.replaceChildren(...prints);
  credit?.classList.add('stack');
  let view = 'all';

  const tabs = document.createElement('div');
  tabs.className = 'board-tabs';
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'Which scores');
  const buttons = VIEWS.map(({ id, name }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.addEventListener('click', () => render(-1, id));
    return b;
  });
  tabs.append(...buttons);
  table.before(tabs);
  dialog.addEventListener('close', () => { view = 'all'; });

  /** Draw the table for the current level; `fresh` is the new row to mark, `show` switches the view. */
  function render(fresh = -1, show = view) {
    view = show;
    if (caption && label) caption.textContent = label();
    const entries = view === 'week' ? memory.weekScores(board(), order) : memory.scores(board(), order);
    renderFame(table, entries, { score, columns, fresh });
    buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(VIEWS[k].id === view)));
    prints.forEach((p, k) => { p.classList.toggle('off', VIEWS[k].id !== view); });
  }

  return {
    dialog,
    render,
    /**
     * A run just ended with `value`. If it makes the top 5, all time or this week, ask for initials
     * (the dialog says `shown`, the score in the game's words, and holds its buttons for `grace` ms),
     * save it with the game's own numbers (`extra`), and open the hall of fame with the new row
     * marked, on the all-time table when it made that, else on this week's.
     * Resolves to true when it was saved; nothing scores with 0 or less.
     */
    async offer({ value, shown, extra, grace = 0 }) {
      const placed = (entries) => (value > 0 ? placeOf(entries, value, order) : -1);
      const made = whereMade(placed(memory.scores(board(), order)), placed(memory.weekScores(board(), order)));
      if (!made) return false;
      const who = await askInitials(initials, { place: made.place, weekly: made.view === 'week', score: shown, last: memory.initials(), grace });
      if (!who) return false;
      memory.addScore(board(), order, { initials: who, value, extra });
      render(made.place, made.view);
      dialog.showModal();
      return true;
    },
  };
}
