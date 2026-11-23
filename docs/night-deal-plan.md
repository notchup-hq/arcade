# Night Deal (plan)

Status: proposed, nothing built. A calm card game for the hall: the traditional seven-column patience, where you build four stacks from ace to king. It is the sixth game, and the quiet one next to the fast ones. The name is ours (check it against known games and add it to `NAMES` in `tests/originality.test.js` as the guide says); this document and the code describe the genre in plain words and never name another game.

## What the player sees

- Seven columns, a draw pile, a discard pile and four stacks to fill, as in the genre. An empty place to put a king shows a gold outline.
- **Tap a card and it goes to the best legal place.** **Drag** works too, for a card or a run. Tapping the draw pile deals; tapping it when empty turns the discard pile over again.
- **Undo** has the empty slot between the discard pile and the stacks, so the top row is seven cells wide like the board. It is unlimited.
- **Two levels:** `draw-1` and `draw-3` (cards turned over one or three at a time). One high-score board each.
- **Every deal can be won.** The game checks before dealing that some order of moves wins. That means a win exists, not that it is easy to see; the copy never promises more.
- **"No moves left."** When nothing useful can be done, a dry line says so ("No moves left. Undo, or deal again.") and **Deal again** becomes the one primary button. Nothing ends silently.
- **When everything is face up and the draw and discard piles are empty,** the win is certain. The game stops the clock, shows **Finish**, and plays the last cards onto the stacks at a calm pace. No tedious tapping.
- **Win:** the logo notches up (`fanfare`), then the initials dialog if the time makes the top 5, with the same 0.8 s tap-safe grace as the fast games.
- Look: navy table, neon outlines; spades and clubs cyan, hearts and diamonds magenta (the suit shape also tells them apart). The backs show the logo's gear. Jack, queen and king are letters with a large suit sign, no pictures. As stacks fill, windows in the dim city behind the board light up, all lit at the win (opacity only).

### Time: counted, not shown

The clock runs from the first move, stops at the win, and pauses while a dialog is open or the tab is hidden. It is never drawn during play. The console shows **Moves** only, which changes when you act and so never ticks. The help dialog says time is counted and shown only at the end, so nothing is hidden from the player.

### Score

One number, as the kit expects (a challenge link packs one value): **the time of the win in ms, lower is better**, ranked by `order: 'low'`. Moves ride along as the game's own column (`extra: { moves }`), so the table reads place, initials, time, moves, date, and the challenge text reads "PEK scored 3:12.4 in Night Deal (draw 3)". Time is formatted with `formatTime` from `js/scores.js`.

Why not a blend of moves and time: a blend needs an invented unit nobody can read, and the challenge and the tables want one honest number. Time already costs you for undoing and for dithering; moves shown beside it keep the game from being only about speed. If Pete would rather rank by moves, it is one change (the value passed to `fame.offer`, plus `order` and the column head) with no change to the kit.

## How it is built

A game is three files of its own plus a scene (`docs/adding-a-game.md`). Everything shared comes from the kit; **no change to `js/` is planned**, because another thread is changing the kit for the challenger table. The one touch outside the game is a line at the end of the pinned board list in `tests/challenge.test.js` (the list only ever grows at the end); if that thread changes the same lines, rebase.

| File | Job |
|---|---|
| `games/night-deal/rules.js` | Pure, no DOM, all of it tested. State is plain data: the 7 columns (each card `{ rank, suit, up }`), the draw pile, the discard pile, the 4 stacks. `newGame(level, rand)`, `draw`, `recycle`, `move(g, from, to, count)`, `legalMoves`, `bestMove(g, from)` (what a tap does), `canFinish`, `isWon`, `isStuck`. Moves return a new state, so undo is a list of earlier states (52 small objects each, cheap). |
| `games/night-deal/solver.js` | Used only by the page, never by the demo. A depth-first search over the same `legalMoves`, with a table of seen positions and a cap on positions looked at (about 30 000, a few tens of ms). `dealWinnable(level, rand)` deals seeded shuffles until one is proved winnable; most random deals are, so it usually takes one or two tries. A deal the cap cannot settle counts as not proved and is skipped. The cap makes the deals a little easier than average, and that is fine. |
| `games/night-deal/scene.js` | `layout(width, height, g)` is pure: the rectangle of every pile and card, the fan overlap and the font size. `draw(ctx, g, layout, c, drag)` paints it. The page and the demo share both, so cards are drawn once. |
| `games/night-deal/main.js` | Page: pointer and keyboard, animation, clock, undo, `createFame`, `wireDialogs`, `pickLevel`, `consoleLogo`, `sfx`, `createLoop`, `holdButton`. |
| `games/night-deal/demo.js` | Hall demo: plays a recorded winning game for one fixed deal (a move list of about 150 moves, stored as a short string, checked against `rules.js` by a test), sped up to about 12 s, then ends on the logo notching up and the top 5 (`js/screens.js`). It carries no solver, so the 15 KB demo budget holds. |

Also by the guide: the cabinet and its place last in `js/games.js` (boards from `levels('night-deal', ['draw-1', 'draw-3'])`, `order: 'low'`), `styles.css`, `sitemap.xml`, a section in `docs/how-it-works.md`, a line under Unreleased in `CHANGELOG.md`, and a `./dev sync` for the preload list.

### Canvas with a thin keyboard layer

The board is drawn on one canvas (the same drawing the demo uses). Pointer events on the canvas hit-test with `layout`. For the keyboard and screen readers there are **14 buttons over the piles** (draw, discard, undo, 4 stacks, 7 columns), invisible apart from the focus ring, laid out as exactly two rows of seven, so `gridKeys` from `js/grid.js` moves between them with no new shared code. A button's label says what is there ("Column 3: 5 of hearts on top, 2 face down"). There are no per-card buttons: 52 of them would cost more than they give.

- **Enter or Space** on a pile does what a tap does (best move for the top card, or deal on the draw pile).
- **In a column, `[` and `]`** choose how many cards of the face-up run are meant (announced in a polite live region); the choice resets on any move.
- **Pick up, then place:** `M` picks up the chosen card or run, the arrow keys then step through only the legal places (highlighted), Enter drops it, Escape puts it back.
- `U` is undo, `N` deals again (after the leave-a-run question). All of it is in the help dialog.

### Rules that need a decision written down

- **What a tap does:** a single card goes to its stack if it fits; otherwise to the column that has the most face-down cards (it turns one over), then the leftmost fit; a king goes to the first empty column; a run goes to a column. If nothing fits, the card does a tiny nudge (only with motion allowed) and the live region says "Nowhere for that card".
- **Moves count** every deal of the draw pile, every placement and every undo. **Undo** does not turn the clock back.
- **No moves left** is judged on useful moves only: a move that just shifts a whole run from a column with nothing face down to another column is not useful, and neither is moving a card back off a stack. The draw pile is checked through one full cycle, because the columns do not change while it turns.
- **Finish:** the clock stops when `canFinish` becomes true (all columns face up, draw and discard piles empty), and the remaining moves are not counted.
- **Leaving a run:** the level radios and "Deal again" use `confirmLeave` while a run is in progress, as Fuse Box does. A run lost to a closed tab is not saved.
- **Seed:** each deal's seed is kept in memory only. Replaying a deal is not offered now; see the ideas below.

## Phone layout (320 px and up)

Seven columns at 320 px with 6 px side padding and 4 px gaps leave 40 px per column, so a card is 40 × 56 px. Cards in a board are marked `data-small-target` (24 px minimum, as the other boards); the undo cell and the buttons around the board stay at 44 px. Text is 16 px or more: rank and suit side by side in the corner (`10♠` is about 32 px wide, so it fits), the large suit sign in the middle on taller cards.

Vertical room on a 568 px phone, after the bar and the console, is about 400 px: the top row takes 56 + 8, leaving about 336 px for columns. Face-down cards overlap by 6 px and face-up cards by up to 22 px, and `layout` squeezes the face-up overlap down to a floor of 17 px (one line of the 16 px index) for a long column. The worst column is 6 face down and a 13-card run: 56 + 36 + 12 × 17 = 296 px, so it fits. A test builds that column and checks the layout at 320, 360, 768 and 1280 wide against the font floor, the overlap floor and the board's height. The page never scrolls and the canvas blocks touch drag as PR 32 does (`data-play`, `overscroll-behavior: none`). `./dev layout` already loads every game's page at the four widths, and does not see canvas text, so the unit test above covers the font floor.

Drags use pointer events with pointer capture, a 6 px threshold before a press turns into a drag (so a tap never drags), and a drop on the pile nearest the dragged card's centre that accepts it; otherwise the card slides back.

## Performance and the budget

- Draws only when something changed. Animation (a 120 ms slide per moved card, the dragged run following the pointer) moves cards on one canvas, and idle costs nothing. With reduced motion, moves are instant and the Finish step has no pauses.
- Canvas pauses off screen and in hidden tabs through `createLoop`, as the other games do.
- Budget: the game adds under 30 KB gzipped to the hall (rules, solver, scene and main are estimated at 12 to 15 KB together); the demo under 15 KB (rules, scene, demo, no solver). `./dev bench` row goes in the pull request. If the demo is over, the cabinet draws the cards as plain rounded rectangles with no corner indexes, and the page keeps the full drawing.

## Tests

One reason each, no sleeps, the seeded `rand` everywhere:

- **Rules:** a deal has 52 distinct cards, 28 in the columns with the right face-up cards, 24 in the draw pile; legal and illegal moves for each kind of target (colour alternation, king in an empty column, run moves, stacks by suit); draw-1 and draw-3 including the end of the pile and `recycle`; `bestMove` choices and the tie-break; `isStuck` for the useful-move definition; `canFinish`; undo restores the state.
- **Solver:** `dealWinnable` deals only positions that replaying its moves through `rules.js` wins, for both levels over a set of seeds; a deal the cap cannot settle is skipped; it finishes within the cap.
- **Demo:** the recorded move list wins when replayed through `rules.js`.
- **Layout:** the worst column fits at the four widths, with the font and overlap floors.
- **Clock:** a small injected-time timer: starts on the first move, pauses and resumes, stops at the win.
- **Kit:** `tests/kit.test.js` keeps passing (no copied kit code); `tests/challenge.test.js` pins the two new boards at the end of the list.

## Open points for Pete

1. **Rank by time (planned) or by moves.** See Score above.
2. **The name.** Night Deal is the working name; Quiet Hand and Last Table are spare.
3. **The window-lighting background** is a cheap extra; it is the first thing dropped if the budget is tight.

## Later, not now

- **A deal of the week:** everyone gets the same deal for a week (the seed from `weekOf`), which makes scores and challenge links comparable. It needs no server, only a seed, and only a small change to the challenge code if the link should carry the deal. Worth building once the game is in.
- **A hint** that runs the solver from the current position. Nice, but the solver then ships in the page for everyone and it softens the quiet feel.
- **Scoring by points,** or a "no undo" board. Neither is needed to make the game fun.

## Build order

1. Plan review in a fresh context ([review.md](review.md): a new game gets its plan reviewed first), then `./dev new-game night-deal "Night Deal"`.
2. `rules.js` with tests, then `solver.js` with tests.
3. `scene.js` and `layout` with their tests, then `main.js`: tap, drag, the keyboard layer, undo, the clock.
4. The win, Finish, no-moves-left and the high-score flow; the demo and the cabinet.
5. `./dev check`, `./dev layout`, `./dev bench`; play at 320 px, keyboard only, with less motion, with storage blocked; docs, changelog, review loop, draft PR.
