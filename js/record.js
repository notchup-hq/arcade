// The big cheer when a run beats the best score saved in this browser, in every game: a centred
// banner that fades in and out by itself. It never takes the focus or a tap, does not flash, and is
// also read out politely. It is a popover, which sits in the top layer above the hall of fame
// dialog that opens as the run is saved. Loaded only when a record falls; fame.js (offer) calls it.

import { loadSheet } from './sheet.js';

const SHOWN_MS = 3500;

let banner = null;
let loaded = null;
let timer = 0;

/** A run (`made`: where whereMade() put it) is a record when it tops `best`, the best saved before it. */
export const isRecord = (best, made) => Boolean(best) && made.view === 'all' && made.place === 0;

/** Show "New record!" with the score (`shown`) if the run is one, once the stylesheet is in so it never shows bare. */
export async function cheerRecord(best, made, shown) {
  if (!isRecord(best, made)) return;
  if (!banner) {
    banner = document.createElement('p');
    banner.className = 'record-banner';
    banner.popover = 'manual';
    banner.setAttribute('role', 'status');
    loaded = loadSheet(new URL('record.css', import.meta.url).href);
    document.body.append(banner);
  }
  await loaded;
  const line = document.createElement('span');
  line.textContent = 'New record!';
  const score = document.createElement('small');
  score.textContent = shown;
  banner.replaceChildren(line, score);
  banner.showPopover();
  clearTimeout(timer);
  timer = setTimeout(() => banner.hidePopover(), SHOWN_MS);
}
