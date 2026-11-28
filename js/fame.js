// The hall of fame, the same in every game: the table (place, initials, the score, the columns only
// that game counts, the date) and what happens when a run ends (a top 5 score asks for initials, is
// saved, and the table opens with it marked). All time, This week and Friends tables per board, always
// opening on All time. The table's rules (top 5, initials) live in js/scores.js; a game only names
// its board, its columns and its words. js/rivals.js cheers each saved friend a run passes.

import { askInitials } from './initials.js';
import { memory } from './memory.js';
import { MAX_ENTRIES, formatDate, lead, placeOf, whereMade } from './scores.js';

const VIEWS = [
  { id: 'all', name: 'All time' },
  { id: 'week', name: 'This week', note: 'A new week starts on Monday.' },
  { id: 'challengers', name: 'Friends', note: 'Not verified. In Compare, + means you lead.' },
];

// The year may wrap when a long score leaves a small phone no room.
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
 * Fill `table` with `entries`, best first. `score` is { head, cell } for the score column; each of
 * `columns` is { key, head, cell } for one of the entries' `extra` numbers (a dash when missing).
 * The row at `fresh` is marked new. There are always MAX_ENTRIES rows, so the height never depends
 * on the data. With `pick`, each row's initials are a button (`data-k` its index); `picked` is selected.
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
 * it, and `initials` the new high score dialog. A Challenge button shares the level's best score as
 * a link, and a link carrying one greets the visitor (js/challenge-ui.js, loaded only then).
 */
export function createFame({ dialog, table, caption, initials, board, order, label, score, columns }) {
  const credit = dialog.querySelector('.credit');
  const kept = credit?.textContent ?? '';
  // One line of small print per view, stacked: the dialog is as tall in every table.
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

  // A link to this level greets at load.
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

  // Friends: tap a row, then Delete; Compare adds how far ahead (+) or behind (-) you are; Clear asks twice.
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
    (list.length ? compareButton : buttons[2]).focus(); // Delete is disabled now; the row is gone with no friends
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
    buttons[2].focus(); // the row is gone
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
      renderFame(table, shown, { score, columns: compare ? [...columns, you] : columns, fresh, pick: true, picked });
    } else {
      picked = -1;
      renderFame(table, view === 'week' ? memory.weekScores(board(), order) : memory.scores(board(), order), { score, columns, fresh });
    }
    tools.classList.toggle('off', view !== 'challengers' || list.length === 0);
    compareButton.setAttribute('aria-pressed', String(compare));
    deleteButton.disabled = picked < 0;
    clearButton.disabled = list.length === 0;
    share.disabled = qr.disabled = !bestScore();
    shared.textContent = '';
    buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(VIEWS[k].id === view)));
    prints.forEach((p, k) => { p.classList.toggle('off', VIEWS[k].id !== view); });
  }

  let watch = null;
  let explained = false;
  return {
    dialog,
    render,
    /** A run starts: `passing` now cheers each saved friend it passes (js/rivals.js, loaded only when there is one). */
    startRun() {
      watch = null;
      const friends = memory.challengers(board(), order);
      if (friends.length) import('./rivals.js').then(({ watchRun }) => { watch = watchRun(friends, order); });
    },
    /** The run's score is `value`, `final` when it ended; a time (`low`) counts only then. */
    passing(value, final = false) {
      watch?.(value, final);
    },
    /** Add the folded "How does sharing work?" note, once, when the table is first opened. */
    explain() {
      if (explained) return;
      import('./challenge-ui.js').then(({ explainSharing }) => {
        explained = true;
        shared.before(explainSharing());
      });
    },
    /**
     * A run ended with `value`. If it makes the top 5, all time or this week, ask for initials (the
     * dialog says `shown`, holds its buttons for `grace` ms), save it with the game's `extra` numbers
     * and open the table with the new row marked. Resolves to true when saved; 0 or less never scores.
     */
    async offer({ value, shown, extra, grace = 0 }) {
      const placed = (entries) => (value > 0 ? placeOf(entries, value, order) : -1);
      const best = memory.scores(board(), order)[0];
      const made = whereMade(placed(memory.scores(board(), order)), placed(memory.weekScores(board(), order)));
      if (!made) return false;
      const who = await askInitials(initials, { place: made.place, weekly: made.view === 'week', score: shown, last: memory.initials(), grace });
      if (!who) return false;
      memory.addScore(board(), order, { initials: who, value, extra });
      import('./record.js').then((m) => m.cheerRecord(best, made, shown));
      render(made.place, made.view);
      dialog.showModal();
      return true;
    },
  };
}
