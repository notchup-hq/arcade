// A board of buttons in rows (Fuse Box's panel, Pair Up's deck): one tab stop for the whole board, and
// the arrow keys, Home and End move around it, so a keyboard and a screen reader play it like a grid.

/**
 * The cell the focus moves to from cell `i` for `key`, in a board of `count` cells `cols` wide (the
 * last row may be short), or -1 for a key that does not move. At an edge the focus stays where it is.
 */
export function gridMove(i, key, cols, count) {
  const x = i % cols;
  switch (key) {
    case 'ArrowLeft': return x > 0 ? i - 1 : i;
    case 'ArrowRight': return x < cols - 1 && i + 1 < count ? i + 1 : i;
    case 'ArrowUp': return i >= cols ? i - cols : i;
    case 'ArrowDown': return i + cols < count ? i + cols : i;
    case 'Home': return i - x;
    case 'End': return Math.min(i - x + cols - 1, count - 1);
    default: return -1;
  }
}

/**
 * Move the focus among the buttons of `board` with the keys above; `cols()` is the board's width
 * now. The one tab stop follows the focus, so Tab out and back returns to the cell last used. Enter
 * and Space stay each button's own click.
 */
export function gridKeys(board, cols) {
  const cells = () => board.querySelectorAll('button');
  board.addEventListener('keydown', (e) => {
    const from = e.target.closest('button');
    if (!from) return;
    const all = cells();
    const to = gridMove([...all].indexOf(from), e.key, cols(), all.length);
    if (to < 0) return;
    e.preventDefault();
    all[to].focus();
  });
  board.addEventListener('focusin', (e) => {
    const at = e.target.closest('button');
    if (!at) return;
    for (const cell of cells()) cell.tabIndex = cell === at ? 0 : -1;
  });
}
