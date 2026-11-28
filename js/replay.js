// Start a CSS animation over, even when it ran a moment ago: take its class off, let the browser
// notice, and put it back.

/** @param {HTMLElement} el @param {string} name the class whose animation should play again */
export function replay(el, name) {
  el.classList.remove(name);
  void el.offsetWidth;
  el.classList.add(name);
}
