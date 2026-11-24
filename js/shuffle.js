// A deck in random order, for the games that deal one (Pair Up's cards, Night Deal's 52). Apart from
// random.js because the hall's demos load that, and they have little room to spare.

/** A copy of `list` in random order (Fisher-Yates); with a seeded `rand` the deal replays. */
export function shuffled(list, rand) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
