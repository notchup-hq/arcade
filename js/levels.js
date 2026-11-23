// A game's levels: the radio buttons above the board and the link. The level lives in the link
// (?level=hard), so it can be shared and survives a reload; the first level keeps the link clean.

/** The level that `search` (a URL's query) names, or the first of `names`. */
export function levelOf(search, names) {
  const level = new URLSearchParams(search).get('level');
  return names.includes(level) ? level : names[0];
}

/**
 * Wire the level `radios` (inputs whose values are `names`, easiest first) to the link. Returns the
 * level the page opens on; when the player picks another, the link changes and `onChange(level)` runs.
 */
export function pickLevel(radios, names, onChange) {
  const first = levelOf(location.search, names);
  for (const radio of radios) {
    radio.checked = radio.value === first;
    radio.addEventListener('change', () => {
      const url = new URL(location.href);
      if (radio.value === names[0]) url.searchParams.delete('level');
      else url.searchParams.set('level', radio.value);
      history.replaceState(null, '', url);
      onChange(radio.value);
    });
  }
  return first;
}
