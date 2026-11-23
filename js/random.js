// Random numbers every game can replay: a seed in, the same numbers out, so tests and demos repeat.
// Every random choice takes `rand`, so it replays with the seed too.

/** A small, fast, seedable random number generator (mulberry32). Returns numbers in [0, 1). */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** A line from `list` picked with `rand`, never the same as `previous`, so a cheer stays fresh. */
export function pickLine(list, rand, previous = '') {
  const lines = list.filter((line) => line !== previous);
  return lines[Math.floor(rand() * lines.length)];
}
