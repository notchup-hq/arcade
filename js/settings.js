// The sound switch and the version on every page. Sound starts on and is remembered only when the
// visitor turns it off, so turning it back on forgets the setting (js/memory.js holds it).

import { memory } from './memory.js';
import { setSound, soundOn } from './sound.js';
import { VERSION } from './version.js';

/** Wire the sound button (#sound, an icon whose aria-pressed says on or off) and fill every .version. */
export function initSettings(doc = document) {
  const soundBtn = doc.getElementById('sound');
  for (const v of doc.querySelectorAll('.version')) v.textContent = `v${VERSION}`;

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
