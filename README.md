# arcade

Neon arcade of tiny classic arcade games by Notchup. Plain HTML, CSS and JS: no build, no cookies, no tracking.

**Play:** https://arcade.notchup.fi

**Made by Notchup:** this arcade is a free side project of [Notchup](https://www.notchup.fi), a small Finnish software company. Come and see what else we make at **[www.notchup.fi](https://www.notchup.fi)**.

Alpha (v0.1). Five games so far, more on the way.

## The games

| Game | What it is |
|---|---|
| **Fuse Box** | A logic puzzle. Every lit fuse shows how many of its neighbours are blown; find them all without testing one. Three levels, and the panel turns to fit a phone. |
| **Lob** | A rooftop duel at night. Lob glowing bulbs across the street at your rival's billboard, with the wind changing every throw. Three hits win. Play a run against computer rivals who get better one after another, or share one device with a friend. |
| **Patch Night** | A times-table bug zapper. Bugs crawl in with answers on their backs; zap the one that is right before it reaches the logo. Three levels, and the facts you miss come back until you know them. |
| **Notch Up** | A tower stacker. Drop each floor on the one below; whatever hangs over is cut off, so the tower gets narrower unless your drops are perfect. 10, 50 and 100 floors get a cheer. |
| **Pair Up** | A memory game. Turn the cards and find every pair; three wrong guesses end the run. Faces are letters and little pictures from the other games, and a win gets a cheer. Three levels. |

Inspired by the great arcade classics, every game here is our own take: the code, art and sounds are written from scratch, and the names, rules and levels are ours. The hall shows each game playing itself on its cabinet's screen, and each game keeps a top 5 with three-letter initials, in your browser only.

## Why it's built this way

- **Light:** each page loads in under 50 KB, the size of one small photo. No framework, no build step, no downloads besides the site itself; even the sounds are made in code.
- **Private:** no cookies, no ads, no tracking, no requests to anyone else. Your high scores, sound setting and the few times-table facts you missed stay in this browser.
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

MIT, see [LICENSE](LICENSE). This project does not take issues or pull requests; fork it freely.

## Name and logo

The code is MIT, but the Notchup name and logo (`assets/mark.svg`) are © Notchup Oy, all rights reserved, and are not licensed for reuse. Forks are welcome; please give yours its own name and branding, and remove ours. If you build on this, a small credit like "based on arcade by Notchup" is always appreciated.

A fork or modified version is not made, endorsed or supported by Notchup Oy, must not suggest otherwise, and Notchup is not responsible for it or for how it is used.

Made by [Notchup](https://www.notchup.fi) · *Knock it up a notch!*
