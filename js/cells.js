// Helpers for a board of square cells in a frame (Fuse Box's panel, Bent Beam's board): sizing the
// cells to the room the frame has, and the words a screen reader hears for a cell.

/**
 * Size the cells of `board` to fit `frame`: as big as the room allows (`pad` is the board's own padding
 * and border), between `min` and `max` px, for a board `cols` by `rows` cells. Sets --cell on the board
 * and marks the frame `scrolls` when even the smallest cells overflow it. Returns the cell size.
 */
export function fitCell(frame, board, { cols, rows, pad, min, max }) {
  const cell = Math.floor(Math.max(min, Math.min(max, (frame.clientWidth - pad) / cols, (frame.clientHeight - pad) / rows)));
  board.style.setProperty('--cell', `${cell}px`);
  // The browser's own verdict, so padding and borders cannot drift from it.
  frame.classList.toggle('scrolls', frame.scrollWidth > frame.clientWidth || frame.scrollHeight > frame.clientHeight);
  return cell;
}

/** "Row 2, column 3" for cell `i` of a board `cols` wide. */
export const cellName = (i, cols) => `Row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}`;
