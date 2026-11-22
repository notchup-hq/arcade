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
| `screens.js` | The two screens a demo ends with: the logo notching up under a line of text, and this browser's top 5. |
| `random.js` | A seedable random number generator, so rules and demos can replay in tests. |
| `scores.js` | High score rules, the same for every game: top 5 per board, ordered by time (`low`) or points (`high`), initials of three characters, letters (A–Z and Å Ä Ö) or dots, at least one a letter (`PEK`, `P.K`). Pure. |
| `memory.js` | The only code that uses `localStorage`: one key, `arcade:v1`, holding the sound setting, the last initials, the tables, and a short list per level of the times-table facts missed (Patch Night, at most 20, as keys like `7x8`). Nothing leaves the browser. Works without storage. |
| `screens.js` | The two screens a demo ends with: the logo notching up under a line of text, and this browser's top 5. |
| `initials.js` | The "New high score" dialog (native `<dialog>`), the same markup on every game page (`tests/site.test.js`); typing keeps only what can become valid initials. |
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
- On a win the logo's gear turns four teeth and its arrow rises. A time that makes the top 5 of its level asks for initials, then shows the hall of fame.
- Attract mode (`demo.js`) plays Easy by the same rules, calmly: about one move a second, the cursor stepping to a fuse near the last one, no glow or flashing. Then the logo notches up and this browser's top 5 for Easy shows.

## Lob

- Two rooftops face each other across a street at night. You throw glowing bulbs at the rival's billboard on the right; the rival throws at yours, which shows the Notchup mark. The target is always the billboard, never the player: the sign being aimed at wears gold corner brackets, and the prompts and help say so. A billboard that has taken three hits goes dark, and its owner loses. Rooftops do not break.
- A throw has an angle (5° to 85°, up from flat, toward the other roof) and a power (10 to 100). `rules.js` holds the whole simulation, with no DOM: fixed 1/120 s steps, gravity, and a sideways push from the wind. A bulb that meets the other billboard hits; one that meets a roof, your own sign, the street or the edge misses. The first wind of a match and a new wind after every throw are whole numbers from −9 to 9 (the rival sets the limit), shown by the number beside the readout and by the smoke of a small chimney on the rival's roof, which leans with it. It stands at the inner edge of the roof beside the rival, clear of the billboard: next to the billboard, on a phone, it was hidden.
- Aiming: drag back from your roof and let go (touch and mouse; a drag under 14 px is a tap and does nothing), or − and + for each value and Throw, or the arrow keys (up and down for the angle, left and right for the power) and Space. A short dotted guide shows only the start of the arc. The last throw stays on screen as a faint dotted trail, the one before it fainter.
- Solo is the main mode and opens straight into a match against the computer. It is a run: rival after rival, each aiming a little better (`skill` 0.3 up to 0.9) with a little more wind (up to 9). The run ends on your first loss. A won match is worth 100 points and 10 more for every throw under ten. A run with points that makes the top 5 asks for initials (board `lob:solo`, points, higher wins, kept in this browser only). Two players on one device is a small switch under the street; it has no scores.
- The computer aims like a person (`aimComputer`): a rough first guess that reads only part of the wind, then after each throw it scales its power by how far it carried and adds what it thinks the change in wind is worth, so it overcorrects when the wind changes a lot. Its hand wobbles less as `skill` rises.
- Each rival has its own sign and its own stretch of street (`STREETS`: roof heights and the skyline). On an upright screen the rooftops are closer and taller, so the tall screen is used for higher arcs; the shape is chosen when a match starts.
- The picture (`scene.js`) is the same city as notchup.fi in the arcade's colours: navy night, stars, two skylines with lit windows, billboards on steel frames. It is drawn on one canvas; the street is cached and copied. The camera is still, nothing shakes or flashes, the smoke drifts slowly (redrawn about 15 times a second, not at all in a hidden tab or with reduced motion), a hit is a soft ring and the rival's letters go dark. With `prefers-reduced-motion` a throw is shown at once instead of flying.
- The street keeps its size all game: the status line is always two lines high (messages stay short enough), so a longer message never takes room from the picture and rescales it.
- Win a match and the logo's gear turns four teeth and its arrow rises, as in Fuse Box.
- Attract mode (`demo.js`) has two computer players trade throws by the real rules at a calm pace, then the logo notches up and this browser's top 5 shows.
## Patch Night

- A times-table bug zapper. Night in a dark server room drawn as a circuit board; the Notchup logo sits in the middle and its arrow turns to aim. Each wave asks one question, shown above the board (a live region for screen readers), and a bug crawls in slowly along every lane, each carrying a number; exactly one is right. The page has a bar, the levels, the score, the three lights and the streak, the question, the board and one status line, and fits the screen with no scrolling. Help and the hall of fame open in dialogs, and the game waits while one is open.
- Zap the right bug: a short gold line fades, a ring of gold, cyan and magenta sparks drifts out of the bug and fades in 0.8 s (slowing down, no flash; not drawn with reduced motion), the bug curls up and fades, the gear's wave is over and the next one starts after a short pause. Zap a wrong one: that bug is pushed back a little, the other bugs creep a little closer, the wave's worth drops by 25, the streak ends, a low buzz. The right bug reaching the logo puts out one of three lights; wrong bugs that reach it just fade. Three lights out ends the run. Speed starts slow and rises a little with each right answer up to a cap, and drops a little after a missed wave.
- Levels, in the link (`?level=medium`): Simple (tables 1 to 5 and 10, four lanes, wrong answers far from the right one), Medium (tables 1 to 10, eight lanes, close wrong answers: the neighbours in the same tables, e.g. for 7 × 8: 48, 54, 63, 49), Hard (up to 12 × 12, eight lanes, close wrong answers, and sometimes a missing factor, `7 × ? = 56`, where the bugs carry factors). The lane count belongs to the level, not the device, so scores compare. No answer appears twice in a wave.
- Learning: a fact that was missed (a wrong zap, or the right bug getting through) comes back two to four questions later, and again five to eight questions after a right answer, until it has been answered right twice (7 × 8 and 8 × 7 are the same fact). Game over lists the facts missed in the run ("Practise these"). This browser remembers up to 20 missed facts per level (`memory.js`, `patch-night:<level>`); a new run asks the first few early, and a fact answered right once is forgotten again. Nothing is sent anywhere.
- Breaks: after every 10 answers (a wave that ends zapped or arrived) the game pauses on a card over the board: a short cheer (one of a few lines for how many were right first time, picked at random and never the same line twice in a row; on every 50th answer a special "fifty" cheer instead), "N of 10 right first time", the average time of those answers, and up to two hardest facts (misses first, then the slowest right ones). Continue starts the next wave and a new set is counted. Losing the last light on the tenth answer ends the run instead. Nothing is stored or sent beyond the missed-facts memory above; the card is static, with no motion.
- Controls: tap or click a bug or anywhere in its lane (the nearest lane to the tap, by angle) fires at once. On a keyboard you aim, then fire: the arrow keys turn the turret (one arrow is a straight lane, two held together are the corner between them; on four lanes the last arrow wins), Q E Z C and the number pad (8 9 6 3 2 1 4 7) aim too, and Space or Enter fires at the lane it is set on. The aimed lane's trace turns gold and the logo's arrow points along it. The lanes are also a ring of real buttons over the canvas, labelled like "Up: 42", each at least 44 px, which keeps screen reader play whole (activating one fires at that lane).
- Score: a right zap is worth what the wave is worth when it lands, times the streak multiplier (×2 at 3 in a row, ×3 at 6, ×4 at 10). The worth starts at 200 and counts down to 100 as the right bug crawls to the logo, and each wrong zap in the wave takes 25 off it (`worth()` in `rules.js`). The page shows it, with the multiplier, in the board's top right corner, so a quick answer is plainly worth more. Top 5 per level (board `patch-night:<level>`, points, higher wins).
- Calm: bugs crawl, nothing shakes or flashes. With `prefers-reduced-motion` bugs step forward in ten still steps instead of gliding, the zap is a still line that disappears, and a frame is drawn only when something changed.
- `rules.js` holds everything with no DOM (waves, wrong-answer choice, the review queue, scoring), seeded and tested; `scene.js` draws the board for both the page and the demo; `demo.js` has the logo zap the right bug about every 1.5 s on Simple for a few waves, then shows this browser's top 5.

## Adding a game

1. `games/<name>/` with `rules.js` (pure, with tests in `tests/<name>.test.js`), `main.js`, `index.html` (copy the Fuse Box page's head, bar and dialogs) and `demo.js` (`{ step(dt), draw(ctx, w, h, colours) }`).
2. Its cabinet in `index.html` with `data-game="<name>"` (copy a ready one), its demo in `DEMOS` in `js/hall.js`, `data-game="<name>"` on its page's `<body>`, and its line next to Fuse Box's `view-transition-name` rule in `styles.css` (`tests/site.test.js` says what is missing).
3. The `<meta name="build" content="dev">` tag, copied from another page, and its page in `sitemap.xml` and in `PAGES` in `scripts/check-layout.mjs`.
4. Keep the preload lists whole (`tests/preload.test.js` says what is missing) and the budget green.
5. Pick a name of our own and check it is not another game's: add the names you checked against to `tests/originality.test.js`.

## Which version is live

Every page has `<meta name="build" content="dev">`. On a Cloudflare deploy, the build command in `wrangler.jsonc` runs `scripts/stamp-build.mjs`, which turns it into the short commit and the date, for example `abc1234 2026-11-21` (view the page source). The commit comes from `WORKERS_CI_COMMIT_SHA`; without it the pages keep `dev`. A new game page needs the same tag (`tests/stamp.test.js`).

## Checks

- `./dev test`: rules, scores, memory, a privacy scan of every shipped file, the originality scan, the size budget, preload lists, the sitemap and the security headers.
- `./dev check`: the tests, then every page, its links and every module over HTTP.
- `./dev layout`: every page in Chromium at 320×568, 360×780, 768×1024 and 1280×800. It fails on sideways scroll, a game page that scrolls at all, text under 16 px, tap targets under 44 px (24 px on a game board), not exactly one `h1`, unlabelled fields, requests to other origins and console errors. The first run installs Playwright into `.local/tools`.
