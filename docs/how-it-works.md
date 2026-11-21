# How it works

## Layout

| Path | What |
|---|---|
| `index.html`, `js/hall.js` | The hall: one arcade cabinet per game (below). A ready game plays itself on its screen; the rest say "Coming soon". Without JavaScript the cabinets are plain links. |
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
| `logo.js` | The Notchup logo in parts (gear, compass, arrow), with the same shapes as `assets/mark.svg` (`tests/logo.test.js`), as inline SVG or on canvas. In the hall the logo is the plain mark, a link to notchup.fi (the demo screen also draws it); on a win the gear turns four teeth and the arrow rises. |
| `sound.js` | Sound effects made with the Web Audio API, no files. The audio context starts on the first sound, which always follows a tap. |
| `scores.js` | High score rules: top 10 per board, ordered by time (`low`) or points (`high`), initials A–Z and Å Ä Ö. Pure. |
| `memory.js` | The only code that uses `localStorage`: one key, `arcade:v1`, holding the sound setting, the last initials and the tables. Works without storage. |
| `screens.js` | The two screens a demo ends with: the logo notching up under a line of text, and this browser's top 5. |
| `initials.js` | The "New high score" dialog (native `<dialog>`). |
| `settings.js` | The sound switch (an icon button) and the version. |

## Cabinets and the zoom into a game

- Each cabinet is an arcade machine drawn in CSS only, no images: a lit marquee with the name, the screen in its bezel with a still glass sheen, a control panel that sticks out past the sides (a stick and three buttons, decoration hidden from screen readers), and the base with the pitch (wide screens only) and a lit Play plate. A game still coming has its marquee unlit, its screen off with a faint Notchup mark, and "Coming soon" on its base. Nothing on a cabinet moves on its own; only the demo on a ready screen does.
- Phones: the ready game is one big cabinet, the coming ones share a row below it. From 768 px: three cabinets side by side.
- Opening a game, the cabinet's screen grows into the game's play area (`.game-main`) in 0.3 s, and going back it shrinks into the screen again. This is a cross-document view transition, pure CSS: `@view-transition` opts both pages in, the screen and the play area share a `view-transition-name` (one per game, since a name may be used once per page), and the growing box is a solid lit screen so the pages never show through each other. The demo's picture fades out in 0.12 s, before it is stretched much.
- Browsers without cross-document view transitions get a normal page load. Under `prefers-reduced-motion: reduce` the `@view-transition` rule is off, so every visitor who asked for less motion gets a normal page load too. `tests/site.test.js` checks both the names and this.

## Fuse Box

- A panel is a grid of fuses; some are blown. Testing a good fuse lights it and shows how many of its eight neighbours are blown; a fuse with none lights its neighbours too. Testing a blown fuse sparks and the game is over. Test every good fuse to fix the panel.
- The first test is always safe, and so are its neighbours: the blown fuses are placed after it.
- Tag a suspected blown fuse: the Test / Tag switch under the panel (in Tag, the panel's frame turns gold and every tap tags), a long press (with a short buzz where the phone can), a right click, or the T or F key. Testing a lit number again when all its blown neighbours are tagged tests the rest around it.
- Levels: Easy 8×8 with 10 blown, Medium 13×9 with 22, Hard 18×10 with 40. On a portrait screen the panel turns (9×13, 10×18) so cells stay big; the fuse count is the same, so times compare. The level is in the link (`?level=hard`).
- The page fits the screen with no scrolling: a bar (back, title, help, hall of fame, sound), the levels, the counters with the logo, the panel, one status line and the two buttons. The panel takes the room that is left and `main.js` sizes the cells to the biggest that fits, 24 to 52 px; below 24 px the panel scrolls inside its frame. Help and the hall of fame open in dialogs. The panel is a grid of real buttons with one tab stop: arrow keys move, Enter tests, and each button says its row, column and state to a screen reader.
- On a win the logo's gear turns four teeth and its arrow rises. A time that makes the top 10 of its level asks for initials, then shows the hall of fame.
- Attract mode (`demo.js`) plays Easy by the same rules, calmly: about one move a second, the cursor stepping to a fuse near the last one, no glow or flashing. Then the logo notches up and this browser's top 5 for Easy shows.

## Lob

- Two rooftops face each other across a street at night. You throw glowing bulbs at the rival's billboard on the right; the rival throws at yours, which shows the Notchup mark. A billboard that has taken three hits goes dark, and its owner loses. Rooftops do not break.
- A throw has an angle (5° to 85°, up from flat, toward the other roof) and a power (10 to 100). `rules.js` holds the whole simulation, with no DOM: fixed 1/120 s steps, gravity, and a sideways push from the wind. A bulb that meets the other billboard hits; one that meets a roof, your own sign, the street or the edge misses. The first wind of a match and a new wind after every throw are whole numbers from −9 to 9 (the rival sets the limit), shown by the number beside the readout and by chimney smoke that leans with it.
- Aiming: drag back from your roof and let go (touch and mouse; a drag under 14 px is a tap and does nothing), or − and + for each value and Throw, or the arrow keys (up and down for the angle, left and right for the power) and Space. A short dotted guide shows only the start of the arc. The last throw stays on screen as a faint dotted trail, the one before it fainter.
- Solo is the main mode and opens straight into a match against the computer. It is a run: rival after rival, each aiming a little better (`skill` 0.3 up to 0.9) with a little more wind (up to 9). The run ends on your first loss. A won match is worth 100 points and 10 more for every throw under ten. A run with points that makes the top 10 asks for initials (board `lob:solo`, points, higher wins, kept in this browser only). Two players on one device is a small switch under the street; it has no scores.
- The computer aims like a person (`aimComputer`): a rough first guess that reads only part of the wind, then after each throw it scales its power by how far it carried and adds what it thinks the change in wind is worth, so it overcorrects when the wind changes a lot. Its hand wobbles less as `skill` rises.
- Each rival has its own sign and its own stretch of street (`STREETS`: roof heights and the skyline). On an upright screen the rooftops are closer and taller, so the tall screen is used for higher arcs; the shape is chosen when a match starts.
- The picture (`scene.js`) is the same city as notchup.fi in the arcade's colours: navy night, stars, two skylines with lit windows, billboards on steel frames. It is drawn on one canvas; the street is cached and copied. The camera is still, nothing shakes or flashes, a hit is a soft ring and the rival's letters go dark. With `prefers-reduced-motion` a throw is shown at once instead of flying.
- Win a match and the logo's gear turns four teeth and its arrow rises, as in Fuse Box.
- Attract mode (`demo.js`) has two computer players trade throws by the real rules at a calm pace, then the logo notches up and this browser's top 5 shows.

## Adding a game

1. `games/<name>/` with `rules.js` (pure, with tests in `tests/<name>.test.js`), `main.js`, `index.html` (copy the Fuse Box page's head, bar and dialogs) and `demo.js` (`{ step(dt), draw(ctx, w, h, colours) }`).
2. Its cabinet in `index.html` with `data-game="<name>"` (copy a ready one), its demo in `DEMOS` in `js/hall.js`, `data-game="<name>"` on its page's `<body>`, and its line next to Fuse Box's `view-transition-name` rule in `styles.css` (`tests/site.test.js` says what is missing).
3. Its page in `sitemap.xml` and in `PAGES` in `scripts/check-layout.mjs`.
4. Keep the preload lists whole (`tests/preload.test.js` says what is missing) and the budget green.
5. Pick a name of our own and check it is not another game's: add the names you checked against to `tests/originality.test.js`.

## Checks

- `./dev test`: rules, scores, memory, a privacy scan of every shipped file, the originality scan, the size budget, preload lists, the sitemap and the security headers.
- `./dev check`: the tests, then every page, its links and every module over HTTP.
- `./dev layout`: every page in Chromium at 320×568, 360×780, 768×1024 and 1280×800. It fails on sideways scroll, a game page that scrolls at all, text under 16 px, tap targets under 44 px (24 px on a game board), not exactly one `h1`, unlabelled fields, requests to other origins and console errors. The first run installs Playwright into `.local/tools`.
