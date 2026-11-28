// Leaving a game for the hall: Escape, as well as the bar's arrow. A run in progress asks first, with
// the game paused where it moves on its own; a stray tap or key never throws one away. Loaded after
// the page is up by js/settings.js, so no game pays for it in its first load.

import { confirmLeave, dialogOpen, pauseGame } from './dialogs.js';

function make(tag, props, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}

/** The sheet that asks. Escape or "Keep playing" stays (confirmLeave resolves true only for "leave"). */
function leaveSheet() {
  const title = make('h2', { id: 'leave-hall-title' }, 'Leave this run?');
  const stay = make('button', { type: 'submit', value: 'stay', className: 'primary', autofocus: true }, 'Keep playing');
  const actions = make('div', { className: 'actions' }, make('button', { type: 'submit', value: 'leave' }, 'Leave'), stay);
  const form = make('form', { method: 'dialog' }, title, make('p', {}, 'This run will not be saved.'), actions);
  const sheet = make('dialog', { className: 'sheet' }, form);
  sheet.setAttribute('aria-labelledby', title.id);
  document.body.append(sheet);
  return sheet;
}

/**
 * Wire Escape and the ask-first to a game's arrow (`back`). `busy()` says whether a run is in progress,
 * which is what makes leaving ask first.
 */
export function wireLeave(back, busy) {
  let sheet = null;
  let confirmed = false;

  async function leave() {
    if (document.querySelector('.held')) return; // the grace period after a run ends (js/grace.js): a stray tap or key does nothing
    if (busy()) {
      pauseGame();
      sheet ??= leaveSheet();
      if (!(await confirmLeave(sheet))) return;
    }
    confirmed = true;
    back.click(); // the link's own click goes back in history or opens the hall (js/settings.js)
    confirmed = false;
  }

  back.addEventListener('click', (e) => {
    if (confirmed || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !busy()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    leave();
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || dialogOpen()) return;
    e.preventDefault(); // or this same press would close the sheet it opens
    if (!e.repeat) leave();
  });
}
