// The time a deal takes, counted but never shown until the win. It runs from the first move, pauses
// while a dialog is open or the tab is hidden, and stops at the win. `now` is a function so a test
// can move time by hand.

export function createClock(now = () => performance.now()) {
  let spent = 0;
  let since = null;
  return {
    /** Start, or go on after a pause. */
    run() {
      since ??= now();
    },
    pause() {
      if (since === null) return;
      spent += now() - since;
      since = null;
    },
    reset() {
      spent = 0;
      since = null;
    },
    get running() { return since !== null; },
    /** The milliseconds counted so far. */
    get ms() { return spent + (since === null ? 0 : now() - since); },
  };
}
