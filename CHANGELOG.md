# Changelog

All notable changes to this project are listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- The hall's cabinets look like real arcade machines, all in CSS: a lit marquee, the screen in its bezel with the game playing itself, a control panel with a stick and buttons, and a lit Play plate. Games still coming stand unlit with their screens off.
- Opening a game, the cabinet's screen grows into the game in 0.3 s, and shrinks back on the way out. Browsers without view transitions, and visitors who ask for less motion, get a normal page load.

### Changed

- The hall is calmer: the logo stays still until you tap it, then its gear turns four teeth with a click each and its arrow notches up. Cabinets no longer lift on hover; they light up gold.

## 0.1.0 – 2026-11-21

The first alpha: the hall and one game.

### Added

- The hall: a neon arcade at night, one cabinet per game. A ready game plays itself calmly on its cabinet's screen (attract mode, drawn by the game's own code), the rest say "Coming soon". Without JavaScript the cabinets are plain links. It fits a phone screen.
- The Notchup logo moves: its gear rolls slowly and its arrow notches up now and then; on a win the gear turns and the arrow rises.
- Fuse Box, a logic puzzle: find the blown fuses from the numbers on the good ones, then fix the panel. The whole game fits the screen with no scrolling, on a phone and a laptop; help and the hall of fame open in dialogs. Three levels, the first test is always safe, tag with the Test / Tag switch under the panel, a long press, a right click or the T key, and play it all with a keyboard.
- Hall of fame: the top 10 times per level with three-letter initials and dates, kept in this browser only.
- Sound effects made in code (no audio files), with a switch in the footer.
- Checks: unit tests, a privacy scan, a size budget, and a layout check in a real browser at 320, 360, 768 and 1280 px.
