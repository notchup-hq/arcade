// The footer of every page: the sound switch and the version. Sound starts on and is remembered only
// when the visitor turns it off, so turning it back on forgets the setting (js/memory.js holds it).

import { memory } from './memory.js';
import { setSound, soundOn } from './sound.js';
import { VERSION } from './version.js';

/** Wire the footer of the page: the sound button (#sound) and the version (#version). */
export function initSettings(doc = document) {
  const soundBtn = doc.getElementById('sound');
  const prefs = memory.prefs();
  doc.getElementById('version').textContent = `v${VERSION}`;

  function syncSound() {
    soundBtn.setAttribute('aria-pressed', String(soundOn()));
    soundBtn.textContent = soundOn() ? 'Sound on' : 'Sound off';
  }
  soundBtn.addEventListener('click', () => {
    const on = !soundOn();
    setSound(on);
    memory.setPref('sound', on ? null : 'off');
    syncSound();
  });

  setSound(prefs.sound !== 'off');
  syncSound();
}
