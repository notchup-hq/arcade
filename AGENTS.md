# arcade

Notchup Arcade: a neon hall of tiny classic arcade games, at https://arcade.notchup.fi. MIT licensed, made by Notchup. How the hall and each game work: [docs/how-it-works.md](docs/how-it-works.md). Keep that file in step with any change in behaviour.

## Rules

- **Our own games, not copies.** The games are our own takes on classic genres, and the copy never calls them "original" or "new". Genres and mechanics are free to use; other games' names, characters, art, sounds, levels and look are not. Never name another game anywhere (code, docs, commits, PRs); describe the genre in plain words. `tests/originality.test.js` fails on known names.
- **Stack:** plain HTML, one stylesheet (`styles.css`), small ES modules. No build step, no npm dependencies, no framework, no third-party scripts, fonts, images or trackers. Sounds are made in code.
- **Shared first:** anything two games or the hall need lives once in `js/` (the hall's game list `js/games.js`, loop, attract mode, logo, city, sparks, sound, scores, memory, initials, fame, grace, settings). A game folder holds only its rules (`rules.js`, pure and tested), its page (`main.js`) and its attract-mode demo (`demo.js`).
- **Privacy:** no cookies, no requests, no forms that send. `localStorage` only in `js/memory.js` (sound setting, last initials, high scores of this browser); everything works when storage is blocked. `tests/privacy.test.js` enforces this.
- **Fast:** each page's first load stays under 50 KB gzipped, a cabinet's demo (fetched as it comes into view) under 15 KB, and a game adds under 30 KB (`tests/budget.test.js`). Animate only `transform` and `opacity`; canvases pause off screen and in hidden tabs; draw only when something changed.
- **Phone first, desktop as good:** a game page fits the screen with no scrolling (help and scores open in dialogs); works from 320 px, touch and keyboard both, tap targets 44 px (24 px inside a game board, marked `data-small-target`), text 16 px or more. `./dev layout` checks this in a real browser.
- **Accessible:** semantic HTML, one `h1` per page, labels, keyboard play, WCAG AA contrast, all motion inside `prefers-reduced-motion: no-preference`.
- **Look:** dark neon hall in Notchup navy and gold plus cyan and magenta, tokens in `styles.css` (`--neon-*`, read by canvas code too), system fonts. The Notchup logo is the mascot (`js/logo.js`, the shapes of `assets/mark.svg` in parts): in the hall it is a still link to notchup.fi. Motion stays calm: nothing fast or flashing. English only.
- **Search and previews:** a changed headline or description changes the `<title>`, meta description and Open Graph tags together. Absolute URLs point only at https://arcade.notchup.fi/.

## Workflow

- Branch (`feat/...`, `fix/...`), draft PR, merge when tested. Before a PR, run the review loop in [docs/review.md](docs/review.md) (Claude Code: `/review-loop`). Never commit to `main`; never push, tag or open a PR unless asked.
- Commits: Conventional Commits (`feat: add rooftop duel`), imperative, 72 characters or fewer, then a short `- ` bullet body on what and why. One logical change per commit, no WIP or fixup commits.
- Author: the owner's GitHub no-reply address from git config; never change `user.email`. No AI attribution lines in commits or PRs (switched off in `.claude/settings.json`).
- No secrets, Cloudflare IDs or tokens in the repo, and nothing about anyone's machine.
- GitHub Actions: the one workflow runs on every PR, drafts included, has a concurrency group and job timeouts, and runs on `ubuntu-latest`.

## Commands

```sh
./dev serve           # serve the folder and open it (ES modules do not load from file://)
./dev test            # unit tests, privacy scan, size budget
./dev check           # tests, then check that every file loads over HTTP
./dev order           # put the hall's cabinets in the order of js/games.js
./dev layout          # every page in Chromium at 320, 360, 768 and 1280 px (--shots saves screenshots)
./dev bench           # main-thread cost of the hall and each game on a slow phone; before and after a change
```

Run tests quietly; show the output only on failure.

## Deploy and releases

- Cloudflare Pages via its Git integration: a merge to `main` deploys https://arcade.notchup.fi, and PRs get preview URLs. Build command `node scripts/stamp-build.mjs` (stamps the commit and date into `<meta name="build">`, set in `wrangler.jsonc`), output directory `/`. Security headers live in `_headers`. Cloudflare Web Analytics stays off (it injects a script).
- The version lives only in `js/version.js` and must match the newest `## x.y.z – date` heading in `CHANGELOG.md` (`tests/version.test.js`) and the version shown on each page. A PR adds its changes under `## Unreleased`. The owner tags releases (`v0.1.0`).

## For agents

- Session start: read `.local/README.md` if it exists (gitignored working notes).
- Never read `assets/*.svg` in full; use grep or a line range.
- Screenshots go to `.local/shots/` (gitignored).
