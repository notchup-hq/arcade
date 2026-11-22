# Changelog

All notable changes to this project are listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- Patch Night, a times-table bug zapper: each wave asks one question and a bug carrying a number crawls in along every lane; zap the right one before it reaches the logo. Three levels (four lanes with easy tables, eight lanes with close wrong answers, and up to 12 × 12 with missing factors), a streak multiplier, and a top 10 per level. Missed facts come back a few questions later and are listed at the end; this browser remembers up to 20 per level, nothing leaves it. Its cabinet plays itself, and it takes the third cabinet.
- Lob, a rooftop duel: lob glowing bulbs across the street at your rival's billboard, with the wind changing every throw; three hits win. Solo is a run against computer rivals who aim a little better each time, scored by rivals beaten plus a bonus for few throws; two players can share one device. Drag back and let go, use the buttons, or use the keyboard. Its cabinet plays a duel between two computer players.
- The hall's cabinets look like real arcade machines, all in CSS: a lit marquee, the screen in its bezel with the game playing itself, a control panel with a stick and buttons, and a lit Play plate. Games still coming stand unlit with their screens off.
- Opening a game, the cabinet's screen grows into the game in 0.3 s, and shrinks back on the way out. Browsers without view transitions, and visitors who ask for less motion, get a normal page load.

### Changed

- README: a "Name and logo" section says forks need their own name and branding and are not Notchup's responsibility.
- Each page's source carries `<meta name="build" content="abc1234 2026-11-21">`: the short commit and date of the deploy, stamped by Cloudflare's build command (`scripts/stamp-build.mjs`). Locally it says `dev`.
- The hall no longer calls the games "original": the tagline, meta descriptions and README say "tiny classic arcade games".
- The hall is calmer: the logo is a still mark that links to the Notchup home page and glows softly on hover. Cabinets no longer lift on hover; they light up gold.

### Fixed

- Lob no longer rescales when the turn changes: the status line is always two lines high, so a longer message cannot take room from the street.
- Lob's wind smoke is visible on a phone: it rises from a small chimney at the inner edge of the rival's roof, clear of the billboard that used to hide it.
- The Lob and Patch Night pages carry the build tag too, so the deploy stamp reaches every page and CI is green again

## 0.1.0 – 2026-11-21

The first alpha: the hall and one game.

### Added

- The hall: a neon arcade at night, one cabinet per game. A ready game plays itself calmly on its cabinet's screen (attract mode, drawn by the game's own code), the rest say "Coming soon". Without JavaScript the cabinets are plain links. It fits a phone screen.
- The Notchup logo moves: its gear rolls slowly and its arrow notches up now and then; on a win the gear turns and the arrow rises.
- Fuse Box, a logic puzzle: find the blown fuses from the numbers on the good ones, then fix the panel. The whole game fits the screen with no scrolling, on a phone and a laptop; help and the hall of fame open in dialogs. Three levels, the first test is always safe, tag with the Test / Tag switch under the panel, a long press, a right click or the T key, and play it all with a keyboard.
- Hall of fame: the top 10 times per level with three-letter initials and dates, kept in this browser only.
- Sound effects made in code (no audio files), with a switch in the footer.
- Checks: unit tests, a privacy scan, a size budget, and a layout check in a real browser at 320, 360, 768 and 1280 px.
