// The two things a person sees of a challenge (js/challenge.js has the code itself): the button that
// shares their best score as a link, and the card that greets someone who opens such a link. Loaded
// only when needed. Opening a link saves nothing; the card is read-only text (textContent, never HTML).

import { codeInHash, packChallenge, unpackChallenge } from './challenge.js';
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

/** The words of the card for a link's `hash`, or null when it carries no good challenge for `game`. */
export function challengeLine({ hash, game, gameName, score, rand = Math.random }) {
  const challenge = unpackChallenge(codeInHash(hash));
  if (!challenge || challenge.board.split(':')[0] !== game) return null;
  return pickLine(LINES, rand)(challenge.initials, score(challenge.value), whereWords(gameName, challenge.board));
}

/** What a shared link says next to it, for a table row `entry`. */
export const shareText = (entry, shown, gameName, board) =>
  `${entry.initials} scored ${shown} in ${whereWords(gameName, board)} on the Notchup Arcade. Can you beat it?`;

/** The card itself, a native modal built when a link arrives: there is nothing to keep in every page. */
function card(line) {
  const dialog = document.createElement('dialog');
  dialog.className = 'sheet challenge';
  dialog.setAttribute('aria-labelledby', 'challenge-title');
  const form = document.createElement('form');
  form.method = 'dialog';
  const heading = document.createElement('h2');
  heading.id = 'challenge-title';
  heading.tabIndex = -1;
  heading.autofocus = true;
  heading.textContent = 'A challenger!';
  const text = document.createElement('p');
  text.className = 'challenge-text';
  text.textContent = line;
  const credit = document.createElement('p');
  credit.className = 'credit';
  credit.textContent = 'Challengers are not verified.';
  const actions = document.createElement('div');
  actions.className = 'actions';
  const play = document.createElement('button');
  play.type = 'submit';
  play.className = 'primary';
  play.textContent = 'Play';
  actions.append(play);
  form.append(heading, text, credit, actions);
  dialog.append(form);
  return dialog;
}

/**
 * Greet a visitor who opened a challenge link, if the page's address (`hash`) carries a good one for
 * this game. `score(value)` words a score the way the game's tables do. Returns true when the card shows.
 */
export function greetChallenger(options) {
  const line = challengeLine(options);
  if (!line) return false;
  history.replaceState(null, '', location.pathname + location.search); // a reload does not greet twice
  const dialog = card(line);
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal(); // no game is running yet at page load, so there is nothing to pause
  return true;
}

/**
 * Share a score as a link to this page. `entry` is a table row ({ initials, value, date }). Uses the
 * phone's share sheet when there is one, else copies the link. Resolves to 'shared', 'copied',
 * 'cancelled' or 'failed'.
 */
export async function shareChallenge(board, entry, { text }) {
  const code = packChallenge({ board, ...entry });
  if (!code) return 'failed';
  const url = new URL(location.href);
  url.hash = `c=${code}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Notchup Arcade', text, url: url.href });
      return 'shared';
    }
    await navigator.clipboard.writeText(url.href);
    return 'copied';
  } catch (e) {
    return e?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
