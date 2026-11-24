// The two things a person sees of a challenge (js/challenge.js has the code itself): the button that
// shares their best score as a link, and the card that greets someone who opens such a link. Loaded
// only when needed. Opening a link saves nothing; the card is read-only text (textContent, never HTML).

import { codeInHash, packChallenge, unpackChallenge } from './challenge.js';
import { el } from './logo.js';
import { pickLine } from './random.js';

const LINES = [
  (who, score, where) => `A challenger has arrived. ${who} scored ${score} in ${where}. Can you beat it?`,
  (who, score, where) => `${who} left a mark in ${where}: ${score}. Think you can top it?`,
  (who, score, where) => `Incoming! ${who} reached ${score} in ${where}. Your move.`,
  (who, score, where) => `${who} is waiting at ${score} in ${where}. Care to catch up?`,
  (who, score, where) => `Someone dares you: ${score} in ${where}, by ${who}. Beat that.`,
];

const levelOf = (board) => board.split(':')[1];

/** Where a score was made, in words: the game's name, and the level when the game has more than one. */
export function whereWords(gameName, board) {
  const level = levelOf(board);
  return /^(solo|tower)$/.test(level) ? gameName : `${gameName}, ${level}`;
}

/** The challenge in a link's `hash`, or null when it carries no good one for `game` (its id, 'lob'). */
export function readChallenge(hash, game) {
  const challenge = unpackChallenge(codeInHash(hash));
  return challenge?.board.split(':')[0] === game ? challenge : null;
}

/** The words of the card for a challenge, in the game's own words for its score. */
export function challengeLine(challenge, { gameName, score, rand = Math.random }) {
  return pickLine(LINES, rand)(challenge.initials, score(challenge.value), whereWords(gameName, challenge.board));
}

/** What a shared link says next to it, for a table row `entry`. */
export const shareText = (entry, shown, gameName, board) =>
  `${entry.initials} scored ${shown} in ${whereWords(gameName, board)} on the Notchup Arcade. Can you beat it?`;

/**
 * A native modal for a heading, a body (a paragraph or a picture), the small print and its buttons, built
 * when it is needed: there is nothing to keep in every page.
 */
function sheet({ id, title, body, buttons }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'sheet challenge';
  dialog.setAttribute('aria-labelledby', id);
  const form = document.createElement('form');
  form.method = 'dialog';
  const heading = document.createElement('h2');
  heading.id = id;
  heading.tabIndex = -1;
  heading.autofocus = true;
  heading.textContent = title;
  const credit = document.createElement('p');
  credit.className = 'credit';
  credit.textContent = 'Challengers are not verified.';
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.append(...buttons);
  form.append(heading, body, credit, actions);
  dialog.append(form);
  return dialog;
}

/** The folded note in the hall of fame that says what sharing is, for someone who has not met it. */
export function explainSharing() {
  const details = document.createElement('details');
  details.className = 'how-sharing';
  const summary = document.createElement('summary');
  summary.textContent = 'How does sharing work?';
  const text = document.createElement('p');
  text.textContent = 'Challenge a friend makes a link to your best score, and Show QR makes a code to scan. '
    + 'Whoever opens it can try to beat you, and can save you in their Friends tab for four weeks. '
    + 'Nothing is sent to a server: scores stay in each browser, so a score from a link is not verified, '
    + 'and anyone could make one up. Keep it friendly.';
  details.append(summary, text);
  return details;
}

function submit(text, { value, primary } = {}) {
  const b = document.createElement('button');
  b.type = 'submit';
  if (value) b.value = value;
  if (primary) b.className = 'primary';
  b.textContent = text;
  return b;
}

/** The card that greets a visitor: what the challenge is, with Save challenger when it can be kept. */
function card(line, canSave) {
  const text = document.createElement('p');
  text.className = 'challenge-text';
  text.textContent = line;
  const play = submit('Play', { primary: true });
  return sheet({ id: 'challenge-title', title: 'A challenger!', body: text, buttons: canSave ? [submit('Save challenger', { value: 'save' }), play] : [play] });
}

/**
 * Greet a visitor who opened a challenge link, if the page's address (`hash`) carries a good one for
 * this game. A challenge made on the table this page shows (`board`) can be saved: `onSave(challenge)`
 * runs when the visitor taps Save challenger, and only then. One from another level of the game only
 * says so. `score(value)` words a score the way the game's tables do. Returns true when the card shows.
 */
export function greetChallenger({ hash, game, board, gameName, score, rand, onSave }) {
  const challenge = readChallenge(hash, game);
  if (!challenge) return false;
  const here = challenge.board === board;
  const line = here
    ? challengeLine(challenge, { gameName, score, rand })
    : `This challenge was made in ${whereWords(gameName, challenge.board)}. Switch to that level to take it on.`;
  history.replaceState(null, '', location.pathname + location.search); // a reload does not greet twice
  const dialog = card(line, here);
  document.body.append(dialog);
  dialog.addEventListener('close', () => {
    if (here && dialog.returnValue === 'save') onSave(challenge);
    dialog.remove();
  });
  dialog.showModal(); // greeted at page load only, before any run, so there is nothing to pause
  return true;
}

/** The link to this page that carries `entry` (a table row: initials, value, date) on `board`, or null when it cannot be packed. */
function challengeUrl(board, entry) {
  const code = packChallenge({ board, ...entry });
  if (!code) return null;
  const url = new URL(location.href);
  url.hash = `c=${code}`;
  return url.href;
}

/**
 * Share a score as a link to this page. `entry` is a table row ({ initials, value, date }). Uses the
 * phone's share sheet when there is one, else copies the link. Resolves to 'shared', 'copied',
 * 'cancelled' or 'failed'.
 */
export async function shareChallenge(board, entry, { text }) {
  const url = challengeUrl(board, entry);
  if (!url) return 'failed';
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Notchup Arcade', text, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (e) {
    return e?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}

/** The card with the QR code of the same link, for a friend standing next to you. The encoder loads only now. Resolves to 'shown' or 'failed'. */
export async function showChallengeQr(board, entry) {
  const url = challengeUrl(board, entry);
  if (!url) return 'failed';
  try {
    const { qrModules, qrPath } = await import('./qr.js');
    const modules = qrModules(url);
    if (!modules) return 'failed';
    const size = modules.length + 8; // the code plus a quiet zone of 4 modules on each side
    const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, role: 'img', 'aria-label': 'QR code with your challenge link', 'shape-rendering': 'crispEdges' });
    el('rect', { width: size, height: size, fill: '#fff' }, svg); // a scanner needs dark on light, whatever the theme
    el('path', { d: qrPath(modules), fill: '#000' }, svg);
    const dialog = sheet({ id: 'qr-title', title: 'Scan to play', body: svg, buttons: [submit('Done', { primary: true })] });
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
    return 'shown';
  } catch {
    return 'failed';
  }
}
