// The dialogs every game page has: help and the hall of fame, opened from the bar, and the new high
// score dialog (opened by js/fame.js at the end of a run). A game that moves on its own waits while
// any of them is open, and a game never acts behind one: input is ignored and anything that would
// change the board waits until they close.

/** True while any dialog on the page is open. */
export const dialogOpen = () => document.querySelector('dialog[open]') !== null;

/** Call `fn` once no dialog is open: now, or when the last one open closes (even if one opens after another). */
export function whenDialogsClosed(fn) {
  const open = document.querySelector('dialog[open]');
  if (!open) fn();
  else open.addEventListener('close', () => whenDialogsClosed(fn), { once: true });
}

/**
 * Wire the bar's #help-open and #fame-open buttons to the `help` dialog and to `fame` (from
 * js/fame.js, drawn fresh as it opens). A game that runs on its own passes `pause`, called when
 * either opens, and `resume`, called when any dialog on the page closes (the game checks whether
 * it should go on).
 */
export function wireDialogs({ help, fame, pause = () => {}, resume }) {
  const open = (dialog) => {
    pause();
    dialog.showModal();
  };
  document.getElementById('help-open').addEventListener('click', () => open(help));
  document.getElementById('fame-open').addEventListener('click', () => {
    fame.render();
    open(fame.dialog);
  });
  if (resume) for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('close', resume);
}
