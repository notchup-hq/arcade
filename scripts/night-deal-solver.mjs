// Night Deal's solver: a depth-first search that finds a way to win a deal, or gives up after looking
// at a fixed number of positions. It runs here, in the build tools and the tests, never in a page:
// scripts/night-deal-deals.mjs uses it to list the deals that can be won (games/night-deal/deals.js),
// and the demo's recorded game comes from it. With the draw pile turning over again and again the
// search space is huge, so it only tries what leads somewhere: moves to a stack, whole runs, cards off
// the discard pile and the deal, and it never steps back to a position it has seen.

import { canFinish, finishMove, isProgress, legalMoves, place, play, positionKey } from '../games/night-deal/rules.js';

export const LOOK = 100000;

/** A card to a stack that nothing else needs: an ace or 2, or one whose opposite-colour cards one rank down are already up there. */
function safe(g, { to, n }) {
  if (to[0] !== 'f' || n !== 1) return false;
  const rank = g.found[place(to)] + 1;
  if (rank <= 2) return true;
  const mates = place(to) < 2 ? [2, 3] : [0, 1];
  return mates.every((s) => g.found[s] >= rank - 1);
}

/** Moves of a position worth trying, best first. Part of a run is moved only when that bares a card for a stack. */
function candidates(g) {
  const moves = legalMoves(g).filter((m) => {
    if (m.from === 's' || m.from === 'w' || m.to[0] === 'f') return true;
    const col = g.cols[place(m.from)];
    if (m.n === col.up.length) return true;
    const bared = col.up[col.up.length - m.n - 1];
    return bared.rank === g.found[bared.suit] + 1;
  });
  const score = (m) => {
    if (m.to[0] === 'f') return 0;
    if (m.from[0] === 'c' && m.n === g.cols[place(m.from)].up.length) return 1 + 1 / (1 + g.cols[place(m.from)].down.length);
    if (m.from === 'w') return 3;
    if (m.from === 's') return 5;
    return 4;
  };
  return moves.sort((a, b) => score(a) - score(b));
}

/**
 * The moves that win `start`, ending when the rest is only moving cards to the stacks, or null when
 * none was found within `look` positions.
 */
export function solve(start, look = LOOK) {
  const seen = new Set([positionKey(start)]);
  const path = [];
  let looked = 0;

  function visit(g) {
    if (canFinish(g)) return true;
    for (const move of candidates(g)) {
      if (looked >= look) return false;
      let next = play(g, move);
      const forced = [move];
      for (let m = next && safeMove(next); m; m = safeMove(next)) {
        next = play(next, m);
        forced.push(m);
      }
      const key = positionKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      looked++;
      path.push(...forced);
      if (visit(next)) return true;
      path.length -= forced.length;
    }
    return false;
  }

  return visit(start) ? path : null;
}

/** A forced, harmless move to a stack, if the position has one. */
function safeMove(g) {
  return legalMoves(g).find((m) => safe(g, m) && isProgress(g, m)) ?? null;
}

/** The full winning line, the finishing moves included. */
export function winningLine(start, look = LOOK) {
  const line = solve(start, look);
  if (!line) return null;
  let g = start;
  for (const m of line) g = play(g, m);
  for (let m = finishMove(g); m; m = finishMove(g)) {
    line.push(m);
    g = play(g, m);
  }
  return line;
}
