# Changelog

All notable changes to this project are listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- A big "New record!" banner in every game when a run beats the best score saved in this browser. It fades by itself and never takes a tap. (#51)
- Night Deal, a calm card game: build four stacks from ace to king by moving cards between seven columns. Tap a card to send it where it fits, or drag it; undo is free. Every deal can be won, and when nothing useful is left the game says so. The time is counted but only shown when you win, and your best time is your score (Draw 1 and Draw 3 are two levels; moves ride beside it). Behind the scenes: Pair Up's deck shuffle moved to a shared `js/shuffle.js`.
- A small cheer when a run passes a friend saved in the Friends table, in every game: a line with their initials slides in at the top edge for a moment ("Passed ABC!", "Sorry, ABC." and more, in changing colours and on alternate sides). It never takes a tap, does not flash, is read out politely, and names each friend once per run. In the timed games (Fuse Box, Night Deal) it comes when you finish with a faster time.
- Games on a phone held sideways show "Turn your phone upright": the screen is too short for any board, so it is asked to turn rather than shown a cut-off game.

### Changed

- The hall of fame fits a phone without scrolling (until friends are saved, which adds a row of buttons): the Friends buttons (Compare, Delete, Clear) show only while friends are saved, and the Friends note is shorter.
- Back from a shared link opened in a chat app shows a "Back to the arcade…" card while the hall loads.
- Pair Up's counters read Score, Chances, Round and Pairs, each with its own label (the round used to share a line with the pairs found).
- Opening a shared challenge link from a chat app leaves the hall behind the game, so Back goes to the arcade (on that game's cabinet, with the zoom back) instead of straight out of it.
- The hall of fame explains sharing: a folded "How does sharing work?" note covers Challenge a friend, Show QR and the Friends tab, and says scores stay in this browser and are not verified.
- Night Deal's card back is the Notchup logo instead of a plain ring of notches.
- Night Deal's cabinet plays its demo at a calmer pace, about a move every half second instead of ten a second.

### Fixed

- A long game title (Night Deal on a phone) no longer runs under the Arcade link: on phones the link is just the arrow, and the title shrinks to fit.
- A button that cannot be used now looks it: Challenge a friend and Show QR looked ready with no score to share, and Delete and Clear in Friends looked ready with nothing to remove. They are dimmed.
- Fuse Box: in Tag mode, tapping a number whose blown fuses are all tagged now tests the rest around it, as it already did in Test mode. (#50)
- The hall of fame table keeps its column widths when you switch between All time, This week and Friends, so it no longer stretches on a phone. (#50)

## 0.3.0 – 2026-11-24

### Added

- Show QR: next to Challenge a friend, a button shows the same link as a QR code, for a friend standing next to you. The code is made by our own small encoder, loaded only when you tap the button, and nothing is sent anywhere.
- Behind the scenes: a security test fails the build if any code turns text into markup or code (`innerHTML`, `eval`, string timers, inline handlers), navigates from data, or if the strict content security policy in `_headers` is loosened.
- Friends tab: the arrival card has a Save challenger button, and saved scores show in a third table in the hall of fame, Friends, apart from your own scores and the cabinets. Tap a row and Delete to remove one, Clear to remove the level's, Compare to see how far ahead (+) or behind your best is. A level keeps its best 5 (50 in all), the same initials keep only the better score, and a score expires 4 weeks after you saved it.
- Challenge a friend: the hall of fame has a button that shares your best score on the level as a link (the phone's share sheet, or a copied link). Opening such a link shows a card ("A challenger has arrived…"), with the score in the game's words. Nothing is saved or sent: the score travels in the link's `#` part, which the browser never sends, and it never touches your own tables. A challenge is a short code, not a secret, and is not verified.

### Changed

- Behind the scenes: `./dev version x.y.z` releases a version in one step (sets `js/version.js`, dates the changelog's Unreleased heading, and syncs the version every page shows), and `./dev sync` now writes that version into every page, so a bump no longer means editing seven files by hand.

## 0.2.0 – 2026-11-23

The game kit, a weekly hall of fame, and a round of polish.

### Added

- Every game's hall of fame has a second table, This week, beside All time. The week runs Monday to Sunday in Helsinki time and starts empty, so a score that cannot beat an old record can still top the board. A score that makes only the week's top 5 asks for initials too ("New weekly high score"). The cabinets in the hall keep showing all-time scores.
- The "CLICK TO PLAY" / "TAP TO PLAY" plate on each cabinet is now solid, with a border in the cabinet's colour, so it no longer blends into the demo behind it. It swells gently instead of fading.
- Lob has a chimney in the middle of the street, with slow smoke that leans with the wind. A flat throw at full power now hits it, so you have to lob over it. It gets taller with each rival, and the computer lifts its aim when it hits the chimney. The smoke used to come from a small chimney on the rival's roof; it comes from this one now.

### Changed

- Behind the scenes: `./dev bench` measures how much work the hall and each game make on a slow phone, and the games share one random line picker, one seeded random generator and one win fanfare instead of their own copies.
- Behind the scenes: every game ends a run through one shared hall of fame (ask for initials, save, show the table), so a fix there reaches all five.
- Behind the scenes: the help and hall of fame buttons, pausing while a dialog is open, the level picker and the console logo come from shared code too.
- Behind the scenes: canvases and the grid keys of Fuse Box and Pair Up are shared too, and a test stops a game from copying shared code again. In Fuse Box, Tab back into the panel now returns to the fuse last used, as in Pair Up.
- Behind the scenes: the HTML every game page shares (the head's first lines, the bar's buttons, the initials dialog) and the preload lists are written from one template by `./dev sync`, so a fix there is made once.
- Behind the scenes: `./dev new-game` starts a small working game and adds it to every list, the layout check takes its pages from `js/games.js`, and `docs/adding-a-game.md` walks through adding a game.

### Fixed

- The hall of fame dialog keeps its size when you switch between All time and This week, on every phone width. Both tables always show five rows, with `---` for places not played yet, and an empty table no longer shows a sentence. On phones narrower than 400 px the date column is left out, so a long score or Patch Night's extra columns cannot wrap a row or widen the table.
- A game page no longer moves under a finger: the page does not scroll, rubber-band or pull to refresh, and a drag on the play area (`data-play`) never scrolls the page. `./dev layout` now checks this at four more phone sizes.
- Fuse Box on a short phone: the Hard panel no longer scrolls inside its frame. It takes a squarer shape with the same 180 fuses and 40 blown (12×15 instead of 10×18 on a 360×640 screen), so cells stay at least 24 px.
- Fuse Box asks "Leave this panel?" before New panel or a level change drops a run in progress, so a stray tap does not end it.

## 0.1.0 – 2026-11-23

The first alpha: the hall and five games.

### Added

- Pair Up has four bugs among its faces: a beetle (the one from Patch Night), a ladybird, a spider and a butterfly. Each has its own colour and outline, and they look alike enough to be a challenge: Easy deals one bug, Medium two and Hard three.
- Pair Up, a memory game: turn the cards and find every pair; three wrong guesses end the run. The faces are letters and little pictures from the other games (the logo, a bug, a bulb, a fuse, a floor of the tower). Three levels (6, 8 and 10 pairs), a score that rewards pairs in a row and chances left, a top 5 per level, and a cheer with the logo notching up when every pair is found.
- Notch Up, a tower stacker: drop each floor on the one below and build the Notchup tower into the night sky. Whatever hangs over is cut off; a perfect drop keeps the width, and three perfects in a row start winning width back. 10, 50 and 100 floors, and beating your best, get a calm cheer: a big word and a dry building-site line picked at random, with a few drifting sparks. Milestones also help: the crane builds that floor wider (back to full width at 100). Every tenth floor the logo notches up. Tap, click, Space or Enter; top 5 in this browser. It takes the fourth cabinet.
- Patch Night, a times-table bug zapper: each wave asks one question and a bug carrying a number crawls in along every lane; zap the right one before it reaches the logo. Three levels (four lanes with easy tables, eight lanes with close wrong answers, and up to 12 × 12 with missing factors), a streak multiplier, and a top 5 per level. Missed facts come back a few questions later and are listed at the end; this browser remembers up to 20 per level, nothing leaves it. Its cabinet plays itself, and it takes the third cabinet.
- Lob, a rooftop duel: lob glowing bulbs across the street at your rival's billboard, with the wind changing every throw; three hits win. Solo is a run against computer rivals who aim a little better each time, scored by rivals beaten plus a bonus for few throws; two players can share one device. Drag back and let go, use the buttons, or use the keyboard. Its cabinet plays a duel between two computer players.
- The hall's cabinets look like real arcade machines, all in CSS: a lit marquee, the screen in its bezel with the game playing itself, a control panel with a stick and buttons, and a lit Play plate. Games still coming stand unlit with their screens off.
- Opening a game, the cabinet's screen grows into the game in 0.3 s, and shrinks back on the way out. Browsers without view transitions, and visitors who ask for less motion, get a normal page load.
- Patch Night pauses after every 10 answers on a small break card: a cheer, how many were right first time, the average answer time, and the one or two hardest facts, then Continue. The cheer is picked from a few lines at random, and every 50th answer gets a special one.
- The hall: a neon arcade at night, one cabinet per game. A ready game plays itself calmly on its cabinet's screen (attract mode, drawn by the game's own code), the rest say "Coming soon". Without JavaScript the cabinets are plain links. It fits a phone screen.
- The Notchup logo moves: its gear rolls slowly and its arrow notches up now and then; on a win the gear turns and the arrow rises.
- Fuse Box, a logic puzzle: find the blown fuses from the numbers on the good ones, then fix the panel. The whole game fits the screen with no scrolling, on a phone and a laptop; help and the hall of fame open in dialogs. Three levels, the first test is always safe, tag with the Test / Tag switch under the panel, a long press, a right click or the T key, and play it all with a keyboard.
- Hall of fame: the top 10 times per level with three-letter initials and dates, kept in this browser only.
- Sound effects made in code (no audio files), with a switch in the footer.
- Checks: unit tests, a privacy scan, a size budget, and a layout check in a real browser at 320, 360, 768 and 1280 px.

### Changed

- A cabinet's demo ends with the top 5 of every level that has a score (Easy, then Medium, then Hard; skipping empty ones), instead of Easy's table alone.
- Every ready cabinet's screen carries a slowly breathing "PRESS START" plate ("TAP TO PLAY" on a touch screen), and a tapped cabinet that is slow to open shows the logo notching round instead of looking frozen.
- Pair Up gives lamps back for a cleared deck, on top of the lamp the last pair lights: one on Easy and Medium, two on Hard.
- Pair Up is gentler: the chances depend on the level (Easy 4, Medium 5, Hard 6) and every pair you find lights one chance back. The bonus for chances left is the same total on every level.
- Pair Up goes on after a cleared deck: a cheer, then the next round with a fresh deck, the same score and chances, until the chances run out. The high score is the whole run.
- The hall keeps a last cabinet that would stand alone in its row in the middle, now that there are five games.
- Patch Night punishes guessing: each wrong zap in a wave takes more off the answer's worth than the last (25, 50, 75) and nudges the other bugs closer by more, and a third wrong zap in one wave puts out a light. One or two slips cost no light.
- The hall of fame keeps one layout in every game but adds what each game counts: Lob the rivals beaten, Patch Night the share right first time and the average answer time, Notch Up the most perfect drops in a row. The new high score dialog shows your score beside your place. Dates are shorter ("21Nov26"), so the table fits a small phone.
- High scores work the same in every game: a top 5 per board (was 10), and initials may have dots in them, so P.K works. Older tables keep their best 5.
- The hall fits four cabinets: two side by side from 768 px, all four in a row from 1120 px. Each cabinet's demo is fetched only when the cabinet comes into view, so the hall's first load stays small as games are added.
- The order of the games in the hall is one list, `js/games.js`; `./dev order` puts the cabinets in `index.html` in that order.
- The night city and the spark burst are shared (`js/city.js`, `js/sparks.js`) instead of living in Lob and Patch Night.
- README: says the games are inspired by the great arcade classics but our own take, lists three games, and a "Name and logo" section says forks need their own name and branding and are not Notchup's responsibility.
- Each page's source carries `<meta name="build" content="abc1234 2026-11-21">`: the short commit and date of the deploy, stamped by Cloudflare's build command (`scripts/stamp-build.mjs`). Locally it says `dev`.
- The hall no longer calls the games "original": the tagline, meta descriptions and README say "tiny classic arcade games".
- The hall is calmer: the logo is a still mark that links to the Notchup home page and glows softly on hover. Cabinets no longer lift on hover; they light up gold.

### Fixed

- The zoom into a game no longer ends on an empty or small board that jumps to full size: a game page now holds its first frame until its board is built and sized.
- Notch Up no longer flashes the whole tower on a phone at every tap; the frame lights up softly instead (gold for a perfect drop), and the windows of the floor you just built glow for a moment.
- A run that ends while you are still tapping no longer skips the high score or starts a new run: in Notch Up and Patch Night the buttons of the initials dialog and of the end and break cards wait 0.8 s. The initials dialog no longer opens the phone's keyboard until you tap the field, keeps your last initials from any game, and Enter in the field saves instead of skipping.
- Coming back to the hall, by the phone's back button or a game's Arcade link, centres the cabinet of the game you just played instead of leaving another game in view. The Arcade link goes back like the back button, so the hall does not open at its top and scroll down; opened from elsewhere, it goes to the top of the hall.
- Lob no longer rescales when the turn changes: the status line is always two lines high, so a longer message cannot take room from the street.
- Lob's wind smoke is visible on a phone: it rises from a small chimney at the inner edge of the rival's roof, clear of the billboard that used to hide it.
- The Lob and Patch Night pages carry the build tag too, so the deploy stamp reaches every page and CI is green again
