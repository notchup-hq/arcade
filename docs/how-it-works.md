# How it works

## Layout

| Path | What |
|---|---|
| `index.html`, `js/hall.js` | The hall: one cabinet per game. A ready game plays itself on its screen; the rest say "Soon". Without JavaScript the cabinets are plain links. |
| `games/<game>/` | One folder per game: `index.html` (its page), `main.js` (the page's code), `rules.js` (the rules, no DOM, tested), `demo.js` (attract mode for the hall). |
| `js/` | Shared by the hall and every game (below). |
| `styles.css` | The one stylesheet. Colour tokens `--neon-*` are read by canvas code too. |
| `_headers` | Security headers for Cloudflare Pages (strict CSP). |
| `tests/`, `scripts/`, `dev` | Unit tests and scans (`./dev test`), the browser layout check (`./dev layout`), the local helper. |

## Shared modules (`js/`)

| Module | Job |
|---|---|
| `loop.js` | `requestAnimationFrame` loop with a fixed timestep; stops in hidden tabs. |
| `attract.js` | Runs a game's demo on a cabinet canvas: sharp at any pixel ratio, paused off screen, one still frame with reduced motion, redrawn only when the demo says something changed. |
| `gear.js` | The Notchup gear (12 teeth, one taller: the notch) for canvas and inline SVG. It turns one tooth at a time: "notching up". |
| `sound.js` | Sound effects made with the Web Audio API, no files. The audio context starts on the first sound, which always follows a tap. |
| `scores.js` | High score rules: top 10 per board, ordered by time (`low`) or points (`high`), initials A–Z and Å Ä Ö. Pure. |
| `memory.js` | The only code that uses `localStorage`: one key, `arcade:v1`, holding the sound setting, the last initials and the tables. Works without storage. |
| `initials.js` | The "New high score" dialog (native `<dialog>`). |
| `settings.js` | The footer: sound switch and version. |

## Fuse Box

- A panel is a grid of fuses; some are blown. Testing a good fuse lights it and shows how many of its eight neighbours are blown; a fuse with none lights its neighbours too. Testing a blown fuse sparks and the game is over. Test every good fuse to fix the panel.
- The first test is always safe, and so are its neighbours: the blown fuses are placed after it.
- Tag a suspected blown fuse: right click, long press (with a short buzz where the phone can), the T or F key, or Tag mode. Testing a lit number again when all its blown neighbours are tagged tests the rest around it.
- Levels: Easy 8×8 with 10 blown, Medium 13×9 with 22, Hard 18×10 with 40. On a portrait screen the panel turns (9×13, 10×18) so cells stay big; the fuse count is the same, so times compare. The level is in the link (`?level=hard`).
- Cells are sized to fit the window (width and height), between 26 and 44 px. The panel is a grid of real buttons with one tab stop: arrow keys move, Enter tests, and each button says its row, column and state to a screen reader.
- On a win the gear turns a full circle one notch at a time and the lever clicks up. A time that makes the top 10 of its level asks for initials.
- Attract mode (`demo.js`) plays Easy by the same rules, knowing where the blown fuses are, then shows the gear notching up and this browser's top 5 for Easy.

## Adding a game

1. `games/<name>/` with `rules.js` (pure, with tests in `tests/<name>.test.js`), `main.js`, `index.html` (copy the Fuse Box page's head, footer and initials dialog) and `demo.js` (`{ step(dt), draw(ctx, w, h, colours) }`).
2. Its cabinet in `index.html` with `data-game="<name>"`, and its demo in `DEMOS` in `js/hall.js`.
3. Its page in `sitemap.xml` and in `PAGES` in `scripts/check-layout.mjs`.
4. Keep the preload lists whole (`tests/preload.test.js` says what is missing) and the budget green.
5. Pick an original name and check it is not another game's: add the names you checked against to `tests/originality.test.js`.

## Checks

- `./dev test`: rules, scores, memory, a privacy scan of every shipped file, the originality scan, the size budget, preload lists, the sitemap and the security headers.
- `./dev check`: the tests, then every page, its links and every module over HTTP.
- `./dev layout`: every page in Chromium at 320×568, 360×780, 768×1024 and 1280×800. It fails on sideways scroll, text under 16 px, tap targets under 44 px (24 px on a game board), not exactly one `h1`, unlabelled fields, requests to other origins and console errors. The first run installs Playwright into `.local/tools`.
