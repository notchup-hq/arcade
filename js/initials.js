// "New high score": the dialog that asks for initials, shared by every game. The markup lives in
// each game page (#initials, a native <dialog> with a method="dialog" form); this module only fills
// and reads it.

import { cleanInitials, typedInitials } from './scores.js';

/**
 * Ask for initials for a score that made place `place` (0-based). Resolves to the initials, or null
 * when the visitor skips. `last` is offered again.
 */
export function askInitials(dialog, { place, last }) {
  const input = dialog.querySelector('input');
  const heading = dialog.querySelector('h2');
  const error = dialog.querySelector('.initials-error');
  heading.textContent = `New high score: #${place + 1}!`;
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
    function onClose() {
      input.removeEventListener('input', onInput);
      dialog.removeEventListener('submit', onSubmit);
      resolve(dialog.returnValue === 'save' ? cleanInitials(input.value) : null);
    }
    input.addEventListener('input', onInput);
    dialog.addEventListener('submit', onSubmit);
    dialog.addEventListener('close', onClose, { once: true });
    dialog.returnValue = '';
    dialog.showModal();
    input.select();
  });
}
