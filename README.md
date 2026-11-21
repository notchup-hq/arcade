# arcade

Neon arcade of tiny classic arcade games by Notchup. Plain HTML, CSS and JS: no build, no cookies, no tracking.

**Play:** https://arcade.notchup.fi

**Made by Notchup:** this arcade is a free side project of [Notchup](https://www.notchup.fi), a small Finnish software company. Come and see what else we make at **[www.notchup.fi](https://www.notchup.fi)**.

Alpha (v0.1). One game so far, more on the way.

## The games

| Game | What it is |
|---|---|
| **Fuse Box** | A logic puzzle. Every lit fuse shows how many of its neighbours are blown; find them all without testing one. Three levels, and the panel turns to fit a phone. |
| **Lob** | A rooftop duel at night. Lob glowing bulbs across the street at your rival's billboard, with the wind changing every throw. Three hits win. Play a run against computer rivals who get better one after another, or share one device with a friend. |
| **Night Shift** | Coming soon: keep the drones off the billboard until sunrise. |

Every game is our own: names, art, rules and levels. The hall shows each game playing itself on its cabinet's screen, and each game keeps a top 10 with three-letter initials, in your browser only.

## Why it's built this way

- **Light:** each page loads in under 50 KB, the size of one small photo. No framework, no build step, no downloads besides the site itself; even the sounds are made in code.
- **Private:** no cookies, no ads, no tracking, no requests to anyone else. Your high scores and sound setting stay in this browser.
- **Phone first:** made for a thumb, and just as good with a mouse and a keyboard. Checked in a real browser at 320, 360, 768 and 1280 px wide.

## Run it locally

```sh
git clone https://github.com/notchup-hq/arcade.git && cd arcade
./dev serve             # opens the browser; needs python3 (or Node.js)
./dev check             # tests, plus a check that every page loads
./dev layout            # every page in a real browser at phone, tablet and laptop widths
```

Do not open `index.html` straight from disk: browsers block ES modules on `file://`. How the hall and the games work, and how to add a game: [docs/how-it-works.md](docs/how-it-works.md).

## Licence

MIT, see [LICENSE](LICENSE). This project does not take issues or pull requests; fork it freely. The Notchup name and logo (`assets/mark.svg`) are © Notchup Oy, all rights reserved. They are not covered by the MIT licence, so replace them in a fork.

Made by [Notchup](https://www.notchup.fi) · *Knock it up a notch!*
