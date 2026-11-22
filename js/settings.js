// What every page has around its game: the sound switch, the version and a game's Arcade link. Sound
// starts on and is remembered only when the visitor turns it off, so turning it back on forgets the
// setting (js/memory.js holds it).

import { memory } from './memory.js';
import { setSound, soundOn } from './sound.js';
import { VERSION } from './version.js';

/**
 * A game's Arcade link (a.back) goes back in history when the hall is the page before, so it does
 * what the back button does: the screen shrinks into the cabinet just played, which the hall keeps
 * centred (js/hall.js). Reached any other way, the link opens the hall at its top, with no scroll.
 */
function wireBack(link) {
  link.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !document.referrer) return;
    const from = new URL(document.referrer);
    const hall = new URL(link.href);
    if (from.origin === hall.origin && from.pathname === hall.pathname && history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });
}

/** Wire the sound button (#sound, an icon whose aria-pressed says on or off), the Arcade link and every .version. */
export function initSettings(doc = document) {
  const soundBtn = doc.getElementById('sound');
  for (const v of doc.querySelectorAll('.version')) v.textContent = `v${VERSION}`;
  const back = doc.querySelector('a.back');
  if (back) wireBack(back);

  function syncSound() {
    soundBtn.setAttribute('aria-pressed', String(soundOn()));
    soundBtn.title = soundOn() ? 'Sound is on' : 'Sound is off';
  }
  soundBtn.addEventListener('click', () => {
    const on = !soundOn();
    setSound(on);
    memory.setPref('sound', on ? null : 'off');
    syncSound();
  });

  setSound(memory.prefs().sound !== 'off');
  syncSound();
}
