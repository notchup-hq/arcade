# Adding a game

How a new game gets into the arcade, from an empty folder to a pull request. A game is three small files of its own on top of the shared kit in `js/`: the rules (`rules.js`, pure and tested), the page (`main.js`) and the hall's attract-mode demo (`demo.js`). The kit does the rest, and `./dev new-game` starts all of it.

## 1. Pick the game

- Pick an idea from [next-games.md](next-games.md) or bring your own, and have the plan reviewed before any code ([review.md](review.md)).
- Pick a name of our own. Check it is not another game's name, and add the names you checked against to `NAMES` in `tests/originality.test.js`.
- Pick an id: the name in lowercase words joined by hyphens, like `light-up`. It is the folder, the link and the high-score board.

## 2. Start it

```sh
./dev new-game light-up "Light Up"
./dev serve
```

This writes a small game that already works: a light that comes on and goes out, a point for each tap while it is lit, and the run over on a tap in the dark. It has a score, a best, the hall of fame with initials, help, sound, keyboard play and a demo in the hall. It also adds the game to every list the arcade keeps:

| List | What `./dev new-game` adds |
|---|---|
| `games/<id>/` | `index.html`, `main.js`, `rules.js`, `scene.js` (the picture, shared by the page and the demo) and `demo.js`, from `scripts/templates/game/` |
| `tests/<id>.test.js` | Tests of the starter rules |
| `index.html` | The game's cabinet in the hall |
| `js/games.js` | The game, last in the hall, with one high-score board `<id>:solo` |
| `styles.css` | The zoom from the cabinet into the game (`view-transition-name`) |
| `sitemap.xml` | The game's page |

`./dev check` and `./dev layout` pass straight away; the layout check takes its pages from `js/games.js`.

## 3. Make it your game

Change the starter into the game, one piece at a time, with `./dev check` green after each:

1. **Rules first.** `rules.js` holds the whole game with no DOM: a state object, `step(g, dt)` for time and a function per move. Take every random number from a seeded `rand` (`js/random.js`), so tests and the demo replay. Test each rule in `tests/<id>.test.js`.
2. **The picture.** `scene.js` draws a state on a canvas in the neon colours from `neonColours()`. `js/canvas.js` keeps it sharp; draw only when something changed.
3. **The page.** `main.js` wires the rules to the page. Reuse the kit: `createFame` (hall of fame and initials), `wireDialogs` (help and pausing), `pickLevel` (levels in the link), `consoleLogo`, `sfx`, `createLoop`, `gridKeys` for a board of buttons. `tests/kit.test.js` fails when a game does again what a kit module does.
4. **The page's text.** In `games/<id>/index.html`, the title, description and Open Graph tags change together; then the console readouts, the help and the hall-of-fame caption. Leave the head's first lines, the bar's buttons and the initials dialog alone: `./dev sync` owns them.
5. **The demo.** `demo.js` plays a short game by the real rules, ends on the logo notching up, then shows this browser's top 5 (`js/screens.js`). It must stay calm and under its 15 KB budget.
6. **The cabinet.** Its pitch in the hall's `index.html`, and its place in `js/games.js` (move the line, then `./dev order`).

Levels: name them in `rules.js` as `LEVELS`, give each one a board in `js/games.js` (with `levels(...)`, like Fuse Box), and add the level radios to the page as Fuse Box does. The layout check then also loads the last level.

After a change to a game's imports, run `./dev sync` to write its preload list. To change the HTML every page shares, edit `scripts/templates/game/index.html` and run `./dev sync`.

## 4. Before the pull request

- `./dev check`, `./dev layout` and `./dev bench` (the game's row goes in the pull request).
- Play it at 320 px, with the keyboard only, with less motion, and with storage blocked.
- A section for the game in [how-it-works.md](how-it-works.md) like the others; take it off [next-games.md](next-games.md).
- A line under `## Unreleased` in `CHANGELOG.md`.
- The review loop in [review.md](review.md).

To throw a started game away, delete `games/<id>/` and `tests/<id>.test.js`, and undo its lines in `index.html`, `js/games.js`, `styles.css` and `sitemap.xml` (`git checkout` them if nothing else changed there).
