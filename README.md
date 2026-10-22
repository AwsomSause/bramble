# Bramble 🫐

A berry-themed patch of browser games for friends, styled like a 2008-era website: glossy buttons, tabs, boxed sidebars.

- **Find games:** search, categories, tags, sorting, pages of 24.
- **Keep track:** favorites, recently played, best scores. All are saved in your browser only.
- **Play safely:** every game runs in a locked-down frame (see [docs/security.md](docs/security.md)).
- **Add games easily:** one command for an HTML file, a folder, or a link (see [docs/adding-games.md](docs/adding-games.md)), or a hidden owner-only panel (see [docs/admin.md](docs/admin.md)).
- **Make it yours:** Classic or Midnight theme, optional backgrounds, reduced motion, low-performance mode, text size.

It's a plain static website: no server, no database, no accounts. It's hosted free on GitHub Pages.

## Run it on your computer

1. Install **Node.js 22** from <https://nodejs.org> (the "LTS" download). To check it worked, open a terminal and run `node -v`; it should print `v22…`.
2. In a terminal, go to this folder and install the project's tools (one time only):
   ```bash
   npm ci
   ```
3. Start the site:
   ```bash
   npm run dev
   ```
   Open the address it prints, which is usually <http://localhost:5173/bramble/>. The page reloads by itself when you change files. Press `Ctrl+C` in the terminal to stop.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Run the site locally while you work on it |
| `npm run add-game` | Add a game from the command line (it asks you questions) |
| `npm run set-admin` | Set the hidden admin panel's login (see [docs/admin.md](docs/admin.md)) |
| `npm run validate` | Check every game entry for mistakes |
| `npm test` | Run the fast unit tests (about 180) |
| `npm run e2e` | Run the browser tests, including accessibility scans. The first time, run `npx playwright install chromium` |
| `npm run lint` / `npm run typecheck` | Catch code mistakes before they run |
| `npm run build` | Make the final website in `dist/` |
| `npm run size` | Check the site still loads fast (budget: 150 KB of JavaScript) |
| `npm run check-embeds` | Check whether linked games still allow being shown inside Bramble |

## Putting it online

See **[docs/deploy.md](docs/deploy.md)**. In short: push to GitHub, turn on Pages, and every push to `main` is tested and published automatically.

## How the project is organized

```
catalog/        Game list: one JSON file per game, plus sources.json (sites allowed to be embedded)
games/          Game files hosted on Bramble (games/<slug>/index.html …)
public/         Images and files copied as-is: thumbs/, bg/, favicon, bramble-bridge.js
scripts/        Command-line tools: add-game, validate, build-catalog, check-embeds, size-check
src/
  app/          Page frame: header, tabs, footer, routes
  catalog/      Game data rules: schema, search/sort/pages, loading, iframe security policy
  features/     The pages: home, library (Games, Favorites), player, settings, about
  lib/          Saving favorites, history, scores and settings in the browser
  ui/           Reusable pieces: buttons, boxes, cards, pager, logo
  styles/       Colors (tokens.css), themes, backgrounds, base styles
tests/e2e/      Browser tests (Playwright) and their test-only game list
docs/           Guides: adding games, deploying, security, and the design spec and plan
.github/        Automatic testing, deployment and dependency updates
```

How it fits together:

1. `npm run build` checks `catalog/`.
2. It turns the catalog into small files the site downloads: `public/catalog/index.json` plus one file per game.
3. It copies `games/` next to them.
4. Vite then bundles the React app.

## Rules this project follows

- Only add games you have permission to host or embed. The permission note is stored with each game.
- No ads, trackers, analytics or cookies.
- Unfinished features don't appear on the site. There are no fake buttons.

## What's next

Phase 2 adds a separate games website, so hosted games can save progress, plus a CSV import tool and licensed partner feeds. After that come Apps, Listen (music) and Watch. Accounts, chat and AI would each need a server, so they wait until Phase 6. See [docs/superpowers/specs/2026-10-22-game-portal-design.md](docs/superpowers/specs/2026-10-22-game-portal-design.md).
