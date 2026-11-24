// The hall of fame, the same in every game: the table (place, initials, the score, then the columns
// only that game counts, such as Patch Night's answers right first time, then the date) and what
// happens when a run ends (a score in the top 5 asks for initials, is saved, and the table opens with
// it marked). Two tables per board, All time and This week, switched by two buttons above the table
// (it always opens on All time). The rules of the table itself (top 5, initials) live in js/scores.js; a game only names
// its board, its columns and its words.

import { askInitials } from './initials.js';
import { memory } from './memory.js';
import { MAX_ENTRIES, formatDate, lead, placeOf, whereMade } from './scores.js';

const VIEWS = [
  { id: 'all', name: 'All time' },
  { id: 'week', name: 'This week', note: 'A new week starts on Monday.' },
  { id: 'challengers', name: 'Friends', note: 'Scores from friends\' links, not verified. With Compare, + means you are ahead.' },
];

// The year may wrap under the day and month when a long score leaves a small phone no room.
const dateCell = (ms) => formatDate(ms).replace(/\d+$/, '\u200b$&');

function button(text, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

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
 * With `pick`, each row's initials are a button (a row to tap and select, `data-k` its index), and
 * the row at `picked` is shown selected.
 */
export function renderFame(table, entries, { score, columns = [], fresh = -1, pick = false, picked = -1 }) {
  const heads = ['#', 'Who', score.head, ...columns.map((c) => c.head), 'Date'];
  table.tHead.replaceChildren(row('th', heads, { scope: 'col' }));
  const rows = entries.map((e, k) => {
    const extra = columns.map((c) => (Number.isFinite(e.extra?.[c.key]) ? c.cell(e.extra[c.key]) : '–'));
    const tr = row('td', [String(k + 1), e.initials, score.cell(e.value), ...extra, dateCell(e.date)]);
    if (k === fresh) tr.className = 'new';
    if (pick) {
      tr.dataset.k = String(k);
      const who = button(e.initials);
      who.className = 'pick';
      who.setAttribute('aria-pressed', String(k === picked));
      tr.cells[1].replaceChildren(who);
      if (k === picked) tr.classList.add('picked');
    }
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
 * it, and `initials` the new high score dialog. The hall of fame has a Challenge button that
 * shares the best all-time score of the level as a link, and a link to this page that carries a
 * challenge greets the visitor (js/challenge-ui.js, loaded only then). The game's id is the start of
 * its board's name and its name is the page's h1, so a game passes nothing more for it.
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
  const buttons = VIEWS.map(({ id, name }) => button(name, () => render(-1, id)));
  tabs.append(...buttons);
  table.before(tabs);

  const gameName = () => document.querySelector('h1')?.textContent ?? 'the arcade';
  const share = button('Challenge a friend', shareBest);
  const qr = button('Show QR', showQr);
  const shared = document.createElement('p');
  shared.className = 'share-note';
  shared.setAttribute('role', 'status');
  const bestScore = () => memory.scores(board(), order)[0];
  async function shareBest() {
    const best = bestScore();
    if (!best) return;
    const { shareChallenge, shareText } = await import('./challenge-ui.js');
    const result = await shareChallenge(board(), best, { text: shareText(best, score.cell(best.value), gameName(), board()) });
    shared.textContent = { copied: 'Link copied. Send it to a friend.', failed: 'Could not share. Try again.' }[result] ?? '';
  }
  async function showQr() {
    const best = bestScore();
    if (!best) return;
    const { showChallengeQr } = await import('./challenge-ui.js');
    const result = await showChallengeQr(board(), best);
    shared.textContent = result === 'failed' ? 'Could not make a QR code. Try again.' : '';
  }
  dialog.querySelector('.actions')?.prepend(share, qr);
  dialog.querySelector('.credit')?.after(shared);

  // A link to this page and this level greets at load, before any run; nothing is saved until Save.
  if (location.hash.startsWith('#c=')) {
    import('./challenge-ui.js').then(({ greetChallenger }) => {
      greetChallenger({
        hash: location.hash,
        game: board().split(':')[0],
        board: board(),
        gameName: gameName(),
        score: score.cell,
        onSave(c) {
          const kept = memory.addChallenger(order, c);
          render(-1, 'challengers');
          dialog.showModal();
          if (!kept) shared.textContent = 'Storage is blocked, so this is kept for this visit only.';
        },
      });
    });
  }

  // Challengers: saved scores from friends' links. Tap a row to select it, then Delete; Compare adds a
  // column with how far ahead (+) or behind (-) your best is; Clear all asks twice. The tools stay in
  // place, hidden, in the other views, so the dialog is as tall in every one.
  let compare = false;
  let list = [];
  let picked = -1;
  let armed = false;
  const compareButton = button('Compare', () => { compare = !compare; render(); });
  const deleteButton = button('Delete', () => {
    const e = list[picked];
    if (e) memory.removeChallenger(e.board, e.initials, e.value);
    picked = -1;
    render();
    compareButton.focus(); // the Delete button is disabled now
  });
  const clearButton = button('Clear', () => {
    if (!armed) {
      armed = true;
      clearButton.textContent = 'Sure?';
      shared.textContent = 'Tap Clear again to remove every friends\' score on this level.';
      return;
    }
    memory.clearChallengers(board());
    picked = -1;
    render();
  });
  const tools = document.createElement('div');
  tools.className = 'board-tabs challenger-tools';
  tools.append(compareButton, deleteButton, clearButton);
  table.after(tools);
  table.tBodies[0].addEventListener('click', (e) => {
    const k = e.target.closest('tr[data-k]')?.dataset.k;
    if (k === undefined || view !== 'challengers') return;
    picked = picked === Number(k) ? -1 : Number(k);
    render();
    table.tBodies[0].rows[Number(k)].querySelector('.pick').focus(); // the rows were drawn again
  });
  dialog.addEventListener('close', () => { view = 'all'; compare = false; picked = -1; });

  /** Draw the table for the current level; `fresh` is the new row to mark, `show` switches the view. */
  function render(fresh = -1, show = view) {
    view = show;
    if (caption && label) caption.textContent = label();
    armed = false;
    clearButton.textContent = 'Clear';
    if (view === 'challengers') {
      list = memory.challengers(board(), order);
      const mine = memory.scores(board(), order)[0]?.value;
      const shown = list.map((e) => ({ ...e, extra: { you: lead(order, mine, e.value) } }));
      const you = { key: 'you', head: 'You', cell: (v) => `${v < 0 ? '\u2212' : '+'}${score.cell(Math.abs(v))}` };
      picked = Math.min(picked, list.length - 1);
      renderFame(table, shown, { score, columns: compare ? [you] : [], fresh, pick: true, picked });
    } else {
      picked = -1;
      renderFame(table, view === 'week' ? memory.weekScores(board(), order) : memory.scores(board(), order), { score, columns, fresh });
    }
    tools.classList.toggle('off', view !== 'challengers');
    compareButton.setAttribute('aria-pressed', String(compare));
    deleteButton.disabled = picked < 0;
    clearButton.disabled = list.length === 0;
    share.disabled = qr.disabled = !bestScore();
    shared.textContent = '';
    buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(VIEWS[k].id === view)));
    prints.forEach((p, k) => { p.classList.toggle('off', VIEWS[k].id !== view); });
  }

  let explained = false;
  return {
    dialog,
    render,
    /** Add the folded "How does sharing work?" note, once, when the table is first opened (so a page's first load does not carry it). */
    explain() {
      if (explained) return;
      import('./challenge-ui.js').then(({ explainSharing }) => {
        explained = true;
        shared.before(explainSharing());
      });
    },
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
