# Bramble — Game Portal Design Spec

- **Date:** 2026-10-22
- **Status:** Draft, awaiting owner review
- **Owner:** Jimmy

## 1. Brief

Bramble is an original browser-game portal for the owner and a small group of friends, all teens and adults playing on their own devices. The game library is public from launch. Private sections, if any, come later.

The theme is **berries**. The look takes its cue from the **2008-era web**: early YouTube and Google pages on light backgrounds, with glossy gradient buttons, tabbed navigation, boxed sidebars and blue-ish links.

Bramble is inspired by the general feature set of tungtung.hadtea.com. It copies none of that site's code, assets, identity or filter-evasion features.

**Success for the first release (MVP):**

- A friend can open the site on a phone or a laptop, find a game by search or category, play it, favorite it, and come back to it from Home.
- The owner can add a game by giving one link or one HTML file. Adding it takes one command and no hand-edited code.
- Every game runs isolated from the portal.
- Lint, type checks, unit tests, end-to-end tests and accessibility checks all pass in CI before each deploy.

**Constraints, all decided:**

| Area | Decision |
|---|---|
| Hosting | GitHub Pages project site: `<user>.github.io/bramble/` |
| Domain | None at first. One can be added later. |
| Build location | The code is built in the cloud workspace and pushed to the owner's GitHub repo. |
| Game sources | Files and links the owner supplies and has permission to host or embed. Licensed partner feeds come later (Phase 2). |
| Backend | None until Phase 6. |

## 2. Reference findings

The evidence is five "Save Page WE" captures. The saver stripped the scripts. Full notes: Project doc `claude/reference-teardown.md`.

| Status | Findings |
|---|---|
| **Observed** | A shell with a nav pill holding 8 sections, which load as same-origin iframes. A persistent mini music player. CSS-variable theming with background images and a low-effects mode. Home is a splash screen with account, shop, premium and Discord links; premium sells a coins economy. Play holds 2,709 games from 4 source collections. Play has a search box with suggestions, a single dropdown that mixes sources with Favorites and Recent, image-only cards with a ★ favorite, and client-side pagination at 200 per page. The player is an overlay with leaderboard, report (links to Discord), fullscreen and close. The game iframe has `allow-scripts` and `allow-same-origin` on same-origin content. Listen has genres, playlists, queue, lyrics, an equaliser, a sleep timer and listen-party, sourced from YT Music. Browse is a proxy-style in-page browser with userscripts. The site also has a decoy "Student Practice Center" title, hidden fake curriculum text, a tab cloak, a panic key, obfuscated asset paths and a pop-under ad link. |
| **Inferred** | Favorites, Recent and settings are stored on the client. The section iframes exist so the music player survives navigation. The leaderboard and coins need a backend. |
| **Undetermined** | The search algorithm. How leaderboards and coins actually work. The proxy's implementation. The Chat, AI and Watch sections, which were not captured. The apps list (the grid was empty). Whether the deceptive overlay or popup the owner noted exist, since they are not visible in the captures. |

## 3. Feature matrix

| Phase | Features |
|---|---|
| **1 · MVP** | App shell and routing. Catalog schema, validator and build step. The `add-game` command. Library with search, category and tag filters, sort and pagination. Favorites, Recently played and best scores. Player page. One original game, **Orbit Hop**. Settings. About, Credits and Privacy page. Embed-compatibility checker. Tests, CI and deploy. |
| 2 · Catalog growth | Separate games origin (§7.3). CSV batch import. Licensed partner feeds, after the owner approves each one's terms. |
| 3 · Apps | Curated directory with "opens externally" and "embeddable" labels. |
| 4 · Listen | Audio player, queue, playlists and a persistent mini player. Licensed or royalty-free audio only. |
| 5 · Watch | Directory of officially embeddable videos. |
| 6 · Backend features | Accounts, chat, AI tools, leaderboards. Each needs a backend and moderation, and the owner decides before each one starts. |
| **Excluded** | Proxy-style Browse. Tab cloak and panic key. Decoy or hidden text. Scraped or rehosted unlicensed catalogs. Client-side coins or premium. Deceptive or overlay ads. Popularity numbers we don't actually have. |

## 4. Architecture

React 19 (the current stable release), TypeScript (strict) and Vite produce one static single-page app. React Router handles routing. The catalog is JSON files in the repo. A build step validates them and turns them into a compact index. There is no server.

```
catalog/games/*.json ─┐
catalog/sources.json ─┼─► scripts/build-catalog ─► public/catalog/index.json
games/<slug>/**      ─┘   (validates, fails build)    public/catalog/games/<slug>.json
                                                       + CSP frame-src list → index.html

Browser ── React app (/bramble/)
  ├─ app/        shell: header, tabs, routes, settings provider, background
  ├─ catalog/    schema, loader, search/filter/sort/paginate (pure functions)
  ├─ features/home, library, player, settings, about
  ├─ lib/storage favorites / recent / scores / settings (guarded localStorage)
  └─ <iframe sandbox> ─► own game files   (same Pages site, opaque origin)
                     ─► embed URLs        (allowlisted hosts only)
        ▲ postMessage {type:"bramble:ready"|"bramble:score"}, origin-checked
```

**Hosting constraints and how the design handles them:**

| GitHub Pages limit | What we do instead |
|---|---|
| No custom HTTP headers | The CSP goes in a `<meta>` tag. `frame-ancestors` and `X-Frame-Options` aren't possible, which we accept and document. |
| No rewrite rules | `404.html` loads the app, which then routes to the requested page. |
| All project repos share one origin | Games are isolated by sandboxing (§7.3). |

## 5. Catalog

### 5.1 Game entry schema

There is one file per game: `catalog/games/<slug>.json`. A Zod schema in `src/catalog/schema.ts` validates it, and that one schema is shared by the scripts and the app.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable and unique. Defaults to `slug`. |
| `slug` | string | Must match `^[a-z0-9-]+$`. Used in the URL. |
| `title` | string | 1–80 characters. |
| `description` | string | 1–300 characters. |
| `instructions` | string? | Shown on the player page. |
| `thumbnail` | string? | Path under `public/thumbs/`. A missing thumbnail falls back to a generated berry placeholder. |
| `category` | enum | Taken from `catalog/categories.json`: action, puzzle, arcade, racing, sports, strategy, platformer, casual. |
| `tags` | string[] | Lowercase, 0–8 tags. |
| `collection` | string | Defaults to `"bramble"`. Supports multiple sources without duplicating code. |
| `source` | union | `{type:"file", path:"games/<slug>/index.html"}` or `{type:"embed", url:"https://…"}`. |
| `controls` | enum[] | keyboard, mouse, touch, gamepad. |
| `fullscreen` | boolean | Whether the Fullscreen button is shown. |
| `mobile` | `"yes"` \| `"partial"` \| `"no"` | |
| `aspectRatio` | string | For example `"16:9"`, `"4:3"` or `"1:1"`. Defaults to `"16:9"`. |
| `permissions` | enum[] | Picked from an approved list (§7.2). Any game can use `pointer-lock`, `forms`, `modals`, `orientation-lock`, `fullscreen`, `gamepad` and `autoplay`. Only `embed` games can use `storage` and `popups`; the validator rejects them on `file` games. |
| `attribution` | `{author, url?}` | Required. |
| `license` | `{name, url?, permission}` | `permission` is a free-text record of where the right to host or embed came from. Required. |
| `status` | `"available"` \| `"broken"` \| `"hidden"` | Hidden games are left out of the index. |
| `featured` | boolean | |
| `addedAt` | ISO date | Drives the "Newest" sort. |

### 5.2 Validator (`npm run validate`, which also runs in the build and in CI)

The validator fails with a readable list of problems when it finds any of these:

- a field fails the schema
- a duplicate `id` or `slug`
- a `file` source path that is missing
- a thumbnail path that is set but doesn't exist
- an embed URL that isn't `https`
- an embed host that isn't in `catalog/sources.json`
- a permission token that isn't on the approved list

It only **warns** when a thumbnail is missing, when a description is very short, or when the embed check (§5.4) found a URL that refuses framing.

### 5.3 Adding a game: the owner's workflow

`npm run add-game` asks a short series of questions:

1. Is this an **HTML file**, a **folder**, or a **link**?
2. The path or URL.
3. Title, category, tags, controls and description. Each prompt shows the default.
4. Who made it, and where permission comes from.

It then does the following:

- For a file or folder, it copies the content to `games/<slug>/`. A single file becomes `index.html`.
- For a link, it adds the host to `sources.json` after you confirm.
- It optionally copies a thumbnail into `public/thumbs/`.
- It writes `catalog/games/<slug>.json`.
- It runs the validator and prints the local URL where you can try the game.

Non-interactive flags, such as `--link <url> --title …`, let Claude or a script add games in one line. `docs/adding-games.md` explains the workflow with examples. Editing the JSON by hand is still supported.

### 5.4 Embed checker (`npm run check-embeds`)

For each embed URL, the checker fetches the response headers. It reports any `X-Frame-Options` value, and any CSP `frame-ancestors` rule that would stop the game loading inside Bramble.

With `--write`, the results are saved to `catalog/embed-status.json` and the build merges them into each game's details as `embedBlocked`. A blocked game stays in the catalog. Its player page shows **"This game opens on its own site"** with an external link instead of a broken frame.

The checker runs on demand and once a week in CI. It never fails a deploy, because the network can be flaky.

### 5.5 Build output

- `index.json` holds one compact array with only the fields the cards need, so thousands of games stay small.
- Each game's full details are emitted separately and fetched when its player page opens.

## 6. Library and discovery

- **Route:** `/games`. The state lives in the URL: `?q=&cat=&tag=&sort=&page=`. The back button, reloads and shared links all reproduce the same view.
- **Search:**
  - It is instant, with the input debounced by 150 ms.
  - It is case- and accent-insensitive.
  - It matches title, tags and category.
  - Title matches rank first.
  - It is pure functions in `src/catalog/query.ts` with unit tests. A search library is added only if this measurably falls short.
- **Filters:** category tabs, one tag, and a collection filter that appears only when more than one collection exists.
- **Sort:** A–Z, Z–A and Newest. There is no popularity sort.
- **Pagination:** 24 per page. The pager shows berry-styled page numbers with Prev and Next. It resets to page 1 whenever the filters change.
- **Favorites** live at `/favorites` and use the same grid and query logic.
- **Empty state:** a friendly message, the active filters with "clear" links, and a "Surprise me" button.
- **Cards:**
  - A thumbnail with a 1-pixel bordered frame, the title as a link, and a small grey line with category and mobile support.
  - A ★ toggle with `aria-pressed` and a label.
  - The whole card is one link. The star is a separate button.

## 7. Player

### 7.1 Page (`/play/:slug`)

- **Layout:** a breadcrumb ("Games › Puzzle › Title"), then the game viewport sized to `aspectRatio` and fitted within the viewport height. A side box holds the instructions, controls icons, attribution and license. Below that are the actions: Favorite, Fullscreen, Reload, Report a problem.
- **States:**
  - loading: a spinner over the frame
  - ready
  - timeout: after 15 s, offer Retry and Report
  - unavailable: `status: "broken"`
  - not embeddable: the external link fallback
  - unknown slug: a 404 card with links back
- **Ready detection:** Bramble's own games post `bramble:ready` through `public/bramble-bridge.js`. Games without the bridge are treated as ready when the iframe's `load` event fires. The parent accepts a message only if `event.source` is the game iframe and the message matches the schema.
- **Fullscreen:** the parent calls `requestFullscreen()` on the viewport wrapper. Where the browser can't do that, as on iPhone Safari, an "expanded" overlay fills the window and Esc or a Close button exits it.
- **Recently played:** opening a game puts it at the top of a list capped at 20.
- **Best scores:** accepted from `bramble:score` messages and stored per game.
- **Report a problem:** opens a pre-filled GitHub "new issue" URL with the slug and browser in the text. No server is needed.

### 7.2 Iframe policy

Every game iframe is built by one tested function, `buildFrameAttrs(game)`. For each part of the attributes it uses:

| Attribute | Value |
|---|---|
| `sandbox` | `allow-scripts`, plus game-requested tokens from this approved list: `allow-pointer-lock`, `allow-forms`, `allow-modals`, `allow-orientation-lock`. |
| `allow` (Permissions Policy) | Only what the game declares: `fullscreen`, `gamepad`, `autoplay`. Everything else is denied by omission. |
| Other | `referrerpolicy="no-referrer"`, `loading="eager"` and a `title` set to the game's name. |

Three rules always hold:

- **`allow-same-origin` is never given to `file` games.** They are served from the portal's own origin, so it would cancel the sandbox.
- `allow-top-navigation` and `allow-popups-to-escape-sandbox` are never granted.
- `allow-popups` is granted only to embeds that declare it.

For an **embed**, the content's origin is the partner's own, so `allow-same-origin` can be granted when the game declares `storage`.

### 7.3 Isolating owner-supplied HTML: a known limit and the plan for it

A `file` game runs in an opaque origin. That means it cannot read Bramble's storage, but it also cannot use its own `localStorage`, so such games won't save progress.

There is a second issue. If someone opens a game file **directly**, at `/bramble/games/x/index.html`, it runs as same-origin with the portal. Today the portal stores only favorites and settings, with no secrets or accounts, so we accept this risk for the MVP.

**Phase 2's first task** removes both issues. Game files move to a free GitHub organization site, `bramble-games.github.io`, which is a separate origin. There, `allow-same-origin` becomes safe and games can save progress. This must happen before any account or other sensitive data exists.

## 8. Shell and visual design

### 8.1 Bramble look: "2008 web, berry patch"

This evokes the era's style without using any YouTube or Google logos, wordmarks, layouts or icons.

- **Page:** a white content area on a very light grey page. Base font is Arial or Helvetica at 14 px, larger than 2008's 12 px, for readability. The layout is centered with a max width of about 980 px, plus a 2-column variant (main plus a 300 px right sidebar).
- **Header:**
  - An original glossy **Bramble** wordmark: rounded, puffy lettering in blackberry purple with a highlight. The "B" sits in a berry cluster with a leaf. It is drawn as SVG by us.
  - A big rounded search box with a glossy **Search** button.
  - Links for Settings and About.
- **Nav:** rounded-top tabs (Home · Games · Favorites) with a gradient, where the active tab joins the content area.
- **Boxes:** sidebar modules with grey gradient title bars, such as "Recently played", "Your favorites" and "Surprise me".
- **Buttons:** light glossy gradient (#fdfdfd→#e6e6e6) with a 1 px #c6c6c6 border, a 3 px radius and an inset highlight. The primary button uses a raspberry gradient.
- **Palette (tokens in `src/styles/tokens.css`):**

  | Name | Hex |
  |---|---|
  | Blackberry | #3b1d4f |
  | Bramble purple | #6b2d8b |
  | Raspberry | #c4194f |
  | Blueberry link | #2a4fb5 |
  | Leaf | #4f8a2b |
  | Cream | #fbf7f2 |
  | Border | #cfcfd6 |

  Every text and background pair must meet WCAG AA, which the a11y tests check.
- **Footer:** small grey links (About · Credits · Privacy · Report a problem) and a "© Bramble" line.
- **Responsive:**
  - Below 760 px the sidebar stacks under the main content and the tabs become a horizontal scroller.
  - The search box goes full width.
  - Touch targets are at least 44 px.

### 8.2 Settings (`/settings`, saved locally)

- **Theme:** Classic, which is the default light look, or **Midnight Bramble**, a dark variant built from the same tokens.
- **Background:** Plain, Berry pattern (a static SVG tile) or Drifting leaves (CSS animation).
- **Reduced motion:** follows the operating system setting by default and can be overridden. When on, there are no animations.
- **Low-performance mode:** turns off background animation, gradients-heavy effects and transitions.
- **Text size:** 100%, 115% or 130%.
- **Clear my data:** resets favorites, recently played and scores, after a confirmation.

### 8.3 Home (`/`)

- **Main column:** a static grid (no carousel) of 6 featured games, then "Newest games", then a link to all games.
- **Sidebar:** "Recently played" (up to 5), "Your favorites" (up to 5) and a "Surprise me" button.
- **First visit:** the boxes show friendly explanations instead of sitting empty.

## 9. First game: Orbit Hop (original)

- **Gameplay:** a berry orbits a center point. Tap, click or press Space to hop between the inner and outer orbit and dodge thorns. The score rises over time and from collecting seeds, and the speed ramps up.
- **Controls:** P or a button pauses. R or a button restarts. The game auto-pauses when the tab loses focus.
- **Rendering:** a canvas that resizes to its container and handles `devicePixelRatio`. Touch and mouse both work.
- **Bridge:** posts `bramble:ready` and `bramble:score`.
- **Delivery:** plain HTML, CSS and JS in `games/orbit-hop/`, with no build step, so it's also a template for owner-made games. The core logic (collision, scoring, speed) is in a separate module with unit tests.

## 10. Quality

- **Tooling:** ESLint (typescript-eslint plus react-hooks plus jsx-a11y), Prettier and `tsc --noEmit` in strict mode.
- **Unit and integration (Vitest with Testing Library):**
  - schema and validator cases: duplicate IDs, bad paths, bad hosts, bad tokens
  - query functions
  - pagination edges
  - storage behavior when localStorage throws
  - `buildFrameAttrs`
  - Orbit Hop logic
  - player state transitions
  - card and favorite UI
- **End-to-end (Playwright on Chromium, plus a mobile viewport):**
  - navigation and history
  - deep links through 404.html
  - search with an empty result
  - filters and sort
  - pagination
  - favorites persisting across a reload
  - a missing thumbnail falling back
  - a broken or missing game showing the error state
  - Orbit Hop loading, scoring and the back link
  - fullscreen or the expanded fallback
  - keyboard-only navigation and visible focus
  - the iframe `sandbox` attribute contents
- **Accessibility:** `@axe-core/playwright` on every route with zero serious or critical violations. Also landmarks, a skip link, labels, `prefers-reduced-motion`, and contrast via the tokens.
- **Performance budget:**
  - initial JS at most 150 KB gzipped, checked in CI by a size script
  - route-level lazy loading for the player and settings
  - lazy thumbnails with fixed dimensions, so there's no layout shift
  - catalog index at most 300 KB gzipped at 3,000 games, measured with a generated fixture
- **CI (GitHub Actions):** install with `npm ci`, then lint, typecheck, unit tests, validate, build, size check, end-to-end and accessibility tests, `npm audit --audit-level=high`, and finally deploy to Pages on `main`. Dependabot is enabled.
- **Verification rule:** a feature is reported as working only after the relevant test or command has been run and its output observed.

## 11. Security and privacy

| Risk | Mitigation |
|---|---|
| Malicious or buggy game code | Opaque-origin sandbox, minimal tokens, no top-navigation, and no `allow-same-origin` for file games. A separate origin comes in Phase 2. |
| XSS through catalog text | React escapes all text. No `dangerouslySetInnerHTML`. The schema limits string lengths. |
| Hostile embed URLs | `https` only, host allowlist, URL parsed with `new URL`, and CSP `frame-src` generated from the same allowlist. |
| Injected or third-party scripts | Meta CSP, injected into production builds only because the Vite dev server needs inline scripts: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-src 'self' <allowlist>; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`. No external CDNs: fonts and icons are local. |
| Forged postMessage | Messages are accepted only from the game iframe's `contentWindow`, are schema-checked, and have no side effects beyond storing a score. |
| Reverse tabnabbing | External links get `rel="noopener noreferrer"`. |
| Clickjacking of Bramble | Can't be blocked on Pages. Accepted, because the site has no sensitive actions. Revisit if a custom host is used. |
| Supply chain | Lockfile committed, minimal dependencies, `npm audit` in CI, Dependabot. |
| Privacy | No analytics, cookies or personal data. Storage is local only. A Privacy page says so. |

A written review goes in `docs/security.md` at the end of the MVP. It covers the threat model, the decisions above, test evidence and known limits.

## 12. Project structure

```
bramble/
  catalog/            games/*.json, sources.json, categories.json
  games/              self-hosted game files (games/<slug>/index.html …)
  public/             thumbs/, bramble-bridge.js, 404.html, icons
  scripts/            build-catalog.ts, validate.ts, add-game.ts, check-embeds.ts, size-check.ts
  src/
    app/              App.tsx, routes.tsx, Layout (header, tabs, footer), SettingsProvider
    catalog/          schema.ts, load.ts, query.ts, frame.ts
    features/         home/, library/, player/, settings/, about/
    lib/              storage.ts, useLocalState.ts
    ui/               Button, Box, Pager, GameCard, SearchBox, Spinner, Icon
    styles/           tokens.css, global.css, themes.css
  tests/e2e/          Playwright specs
  docs/               adding-games.md, deploy.md, security.md, superpowers/{specs,plans}
  .github/workflows/  ci.yml
```

## 13. Deployment

- GitHub Pages is deployed from Actions using the official `actions/deploy-pages`.
- Vite `base` is set to `/bramble/` and the router `basename` matches.
- No secrets are needed.
- **Rollback:** revert the commit on `main`, or re-run an earlier successful workflow.
- `docs/deploy.md` walks a beginner through creating the repo, enabling Pages, the first deploy, and adding a custom domain later (CNAME file plus DNS records plus enforcing HTTPS).

## 14. MVP acceptance criteria

1. `npm ci && npm run build` succeeds on a clean checkout. `npm test` and `npm run e2e` pass.
2. The deployed site loads at `/bramble/`. A deep link such as `/bramble/play/orbit-hop` works on a fresh load.
3. Orbit Hop can be played start to finish from the library, the best score persists, and Back returns to the same library page and filters.
4. Searching for a nonsense term shows the empty state. Clearing filters restores the results.
5. A favorite survives a reload and appears on Home and on `/favorites`.
6. A catalog entry with a missing file fails `validate`. A runtime game with `status: "broken"` shows the unavailable state.
7. The iframe for a `file` game has `sandbox="allow-scripts …"` with no `allow-same-origin`, which is verified by an end-to-end assertion.
8. axe reports zero serious or critical violations on Home, Games, Player, Favorites, Settings and About.
9. Every flow works by keyboard only, with visible focus.
10. Initial JS is at most 150 KB gzipped.
11. `npm run add-game -- --link <url> …` and the HTML-file path each produce a valid, playable entry. Both are demonstrated with the owner's first supplied game, or with a fixture if none has been supplied yet.

## 15. Open items for later phases (not blocking the MVP)

- Phase 2: the GitHub organization name for the games origin, and which licensed partner feed(s) to use.
- Phase 4: the music source.
- Phase 6: the backend provider and moderation approach.
