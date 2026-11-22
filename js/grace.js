// A short grace period for controls that appear the moment a run ends. A player is often still
// tapping or pressing keys then, and a stray tap should not skip a high score or start a new run.
// The controls show dimmed and ignore input until the grace period is over.

export const GRACE_MS = 800;

/**
 * Hold `el` (a control or a group of them) for `ms`, then call `then`. Returns a function that ends
 * the hold early (without calling `then`).
 */
export function holdOff(el, ms = GRACE_MS, then = () => {}) {
  if (ms <= 0) { then(); return () => {}; }
  el.inert = true;
  el.classList.add('held');
  const release = (done) => {
    clearTimeout(timer);
    el.inert = false;
    el.classList.remove('held');
    if (done === true) then();
  };
  const timer = setTimeout(() => release(true), ms);
  return () => release(false);
}

/** Hold a button that just appeared, then give it the focus, or once a dialog open by then has closed. */
export function holdButton(button, ms = GRACE_MS) {
  return holdOff(button, ms, () => {
    const open = document.querySelector('dialog[open]');
    if (open) open.addEventListener('close', () => button.focus(), { once: true });
    else button.focus();
  });
}
