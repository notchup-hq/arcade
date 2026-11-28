// The big cheer when a run beats the best score saved in this browser, in every game: a centred
// banner that fades in and out by itself. It never takes the focus or a tap, does not flash, and is
// also read out politely. Loaded only when a record falls; fame.js (offer) is how a game gets it.

const SHOWN_MS = 3500;

let banner = null;
let timer = 0;

/** A run (`made`: where whereMade() put it) is a record when it tops `best`, the best saved before it. */
export const isRecord = (best, made) => Boolean(best) && made.view === 'all' && made.place === 0;

/** Show "New record!" with the score (`shown`), if the run is one. */
export function cheerRecord(best, made, shown) {
  if (!isRecord(best, made)) return;
  if (!banner) {
    const sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = new URL('record.css', import.meta.url).href;
    document.head.append(sheet);
    banner = document.createElement('p');
    banner.className = 'record-banner';
    banner.setAttribute('role', 'status');
    document.body.append(banner);
  }
  const line = document.createElement('span');
  line.textContent = 'New record!';
  const score = document.createElement('small');
  score.textContent = shown;
  banner.replaceChildren(line, score);
  banner.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => {
    banner.classList.remove('show');
    banner.replaceChildren();
  }, SHOWN_MS);
}
