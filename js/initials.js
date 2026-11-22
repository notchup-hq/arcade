// "New high score": the dialog that asks for initials, shared by every game. The markup lives in
// each game page (#initials, a native <dialog> with a method="dialog" form); this module only fills
// and reads it. It is modal: a tap outside does nothing. Focus starts on the heading, so a phone's
// keyboard opens only when the player taps the field, which holds the initials typed last (any game).

import { holdOff } from './grace.js';
import { cleanInitials, typedInitials } from './scores.js';

/**
 * Ask for initials for a score that made place `place` (0-based), shown with `score`, the score in
 * the game's own words ("34 floors"). Resolves to the initials, or null when the visitor skips.
 * `last` is offered again. With `grace` (ms), for games played by fast
 * tapping, Skip, Save and Escape do nothing until it has passed.
 */
export function askInitials(dialog, { place, score, last, grace = 0 }) {
  const input = dialog.querySelector('input');
  const heading = dialog.querySelector('h2');
  const error = dialog.querySelector('.initials-error');
  const actions = dialog.querySelector('.actions');
  heading.textContent = `New high score: #${place + 1}!`;
  dialog.querySelector('.initials-score').textContent = score;
  input.value = last ?? '';
  error.hidden = true;

  return new Promise((resolve) => {
    function onInput() {
      // Upper case letters and dots, as the table will show them.
      const v = typedInitials(input.value);
      if (v !== input.value) input.value = v;
      error.hidden = true;
    }
    function onSubmit(e) {
      if (e.submitter?.value === 'skip') return;
      if (!cleanInitials(input.value)) {
        e.preventDefault();
        error.hidden = false;
        input.focus();
      }
    }
    // Enter in the field saves; on its own the form would submit with its first button, Skip.
    function onKey(e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!actions.inert) dialog.querySelector('form').requestSubmit(dialog.querySelector('button[value="save"]'));
    }
    function onCancel(e) {
      if (actions.inert) e.preventDefault(); // Escape pressed with the last keys of the run
    }
    function onClose() {
      // A second Escape can close a modal even when its cancel is refused: during the grace period
      // that is a key meant for the game, so the dialog opens again.
      if (actions.inert) {
        dialog.showModal();
        dialog.addEventListener('close', onClose, { once: true });
        return;
      }
      endHold();
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKey);
      dialog.removeEventListener('submit', onSubmit);
      dialog.removeEventListener('cancel', onCancel);
      resolve(dialog.returnValue === 'save' ? cleanInitials(input.value) : null);
    }
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKey);
    dialog.addEventListener('submit', onSubmit);
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('close', onClose, { once: true });
    dialog.returnValue = '';
    const endHold = holdOff(actions, grace);
    dialog.showModal(); // focus goes to the heading (autofocus), so a phone's keyboard stays closed
    // With a mouse there is no keyboard to pop up: the field is ready to type into. Keys mashed
    // at the end of a run do no harm there, since only letters and dots are kept.
    if (window.matchMedia('(pointer: fine)').matches) input.select();
  });
}
