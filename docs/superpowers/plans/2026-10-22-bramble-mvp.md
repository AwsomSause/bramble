# Bramble MVP (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy Bramble's first release. It is a static, berry-themed, 2008-web-styled game portal with a validated JSON catalog, a searchable and paginated library, favorites, a sandboxed player page, the original game Orbit Hop, and a one-command workflow for adding games.

**Architecture:** One React single-page app built by Vite and served by GitHub Pages at `/bramble/`. Game metadata lives in `catalog/games/*.json`. A build script validates it with a shared Zod schema and emits `public/catalog/index.json` plus one `public/catalog/games/<slug>.json` per game, and also copies `games/` into `public/games/`. Games run in sandboxed iframes. Browser storage holds favorites, recently played, scores and settings. There is no backend.

**Tech Stack:** Node 22; React 19.3, react-router ^7 (declarative `BrowserRouter`), Vite 8.3 with @vitejs/plugin-react 6.1; TypeScript 6.0.3 (strict); Zod 4.6; Vitest 5 with jsdom and Testing Library; Playwright 1.56.1 with @axe-core/playwright 4.14; ESLint 9.39 with typescript-eslint 8.72, react-hooks 7 and jsx-a11y 6.10; Prettier 3; tsx for scripts.

**Spec:** `docs/superpowers/specs/2026-10-22-game-portal-design.md`

## Global Constraints

- Base path is `/bramble/`. It is set in Vite `base`, the router `basename` and every asset URL, and comes from `import.meta.env.BASE_URL`, never hard-coded in components. The `BASE_PATH` env var overrides it.
- Pin exact dependency versions in `package.json` (no `^`) and commit `package-lock.json`.
- No runtime third-party scripts, fonts, CDNs, analytics or cookies. All assets are local.
- No `dangerouslySetInnerHTML` anywhere.
- `file` games never get `allow-same-origin`. `allow-top-navigation*` and `allow-popups-to-escape-sandbox` are never emitted.
- Approved permission tokens are `pointer-lock`, `forms`, `modals`, `orientation-lock`, `fullscreen`, `gamepad` and `autoplay`. `storage` and `popups` are allowed only on `embed` games.
- Categories are action, puzzle, arcade, racing, sports, strategy, platformer and casual.
- 24 games per page. Sorts are `az`, `za` and `new`. Recently played is capped at 20. The load timeout is 15 s. Search input is debounced by 150 ms.
- Storage keys are `bramble:v1:favorites`, `bramble:v1:recent`, `bramble:v1:scores` and `bramble:v1:settings`.
- Budgets: initial JS at most 150 KB gzipped; catalog index at most 300 KB gzipped at 3,000 games.
- Colors come only from `src/styles/tokens.css`: Blackberry #3b1d4f, Bramble purple #6b2d8b, Raspberry #c4194f, Blueberry link #2a4fb5, Leaf #4f8a2b, Cream #fbf7f2, Border #cfcfd6.
- Base font is Arial/Helvetica at 14 px. Layout max-width is 980 px with a 300 px sidebar. The layout stacks below 760 px. Touch targets are at least 44 px.
- No YouTube or Google logos, wordmarks, layouts or icons. The Bramble logo is our own SVG.
- A feature is reported as working only after its test or command has been run and its output observed.
- Every commit message ends with the attribution trailer lines from the session instructions.

## Review Focus

1. **Empty catalog.** If every game is hidden, or there are none, Home, Games and Favorites show friendly empty states instead of crashing. Tests go in Tasks 9 and 11.
2. **Stale or corrupted storage.** Malformed JSON, the wrong types, or favorite or recent slugs that are no longer in the catalog are ignored silently, and nothing shows a "ghost" card. Tests go in Tasks 4 and 9.
3. **Hostile or odd search input.** Regex characters (`.*(`), whitespace-only text and 500-character strings are matched literally and never throw. Tests go in Task 5.
4. **Out-of-range URL state.** `?page=999`, `?page=abc`, `?cat=nope` and `?sort=zzz` clamp or fall back to defaults. Tests go in Task 5.
5. **Catalog fetch failure.** If `index.json` or a game's details fail to load (network or 404), the page shows an error box with a Retry button, not a blank page. Tests go in Tasks 8 and 10.

---

### Task 1: Project scaffold and toolchain

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`, `vitest.config.ts`, `playwright.config.ts`, `src/App.test.tsx`, `src/config.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces:
  - npm scripts: `dev`, `build` (runs `build:catalog` then `vite build`, then copies `dist/index.html` to `dist/404.html`), `build:catalog`, `build:e2e`, `preview`, `test`, `e2e`, `lint`, `typecheck`, `validate`, `add-game`, `check-embeds`, `size`, `format`.
  - `src/config.ts` exports `siteConfig = { name: "Bramble", repoUrl: string, tagline: "Pick a game. Stay a while." }`. `repoUrl` is set in Task 17.
  - The Vitest environment is jsdom, with jest-dom matchers loaded by `src/test/setup.ts`.

- [ ] **Step 1:** In `package.json`, set `"type": "module"`, `engines.node >=22`, and pin the exact versions from the Tech Stack line. `.gitignore` covers `node_modules`, `dist`, `public/catalog`, `public/games`, `test-results`, `playwright-report`.
- [ ] **Step 2:** Write the failing test. `src/App.test.tsx` renders `<App />` and checks that `getByRole('heading', { name: /bramble/i })` is in the document.
- [ ] **Step 3:** Run `npm test`. Expected: FAIL, because the App has no such heading.
- [ ] **Step 4:** Make `App` a placeholder that renders `<h1>Bramble</h1>`. In `vite.config.ts`, set `base: process.env.BASE_PATH ?? '/bramble/'`, enable `build.manifest: true`, and use the React plugin.
- [ ] **Step 5:** Run `npm test && npm run typecheck && npm run lint && npx vite build`. Expected: all exit 0.
- [ ] **Step 6:** In `playwright.config.ts`:
  - `webServer` runs `npm run build:e2e && npm run preview -- --port 4173 --strictPort`.
  - `baseURL` is `http://localhost:4173/bramble/`.
  - Projects are `chromium` and `mobile` (Pixel 7).
  - When the `PW_CHROMIUM_PATH` env var is set, use it as `launchOptions.executablePath`.
- [ ] **Step 7:** Commit with `chore: scaffold Vite React TS project with test and lint tooling`.

### Task 2: Catalog schema

**Files:**
- Create: `src/catalog/schema.ts`, `catalog/categories.json`, `catalog/sources.json` (`{"hosts": []}`)
- Test: `src/catalog/schema.test.ts`

**Interfaces:**
- Produces from `src/catalog/schema.ts`:
  - `CATEGORIES`, a readonly tuple of the 8 categories, and `type Category`.
  - `CONTROLS = ['keyboard','mouse','touch','gamepad']` and `type Control`.
  - `PERMISSIONS`, a readonly tuple of the 9 tokens; `type Permission`; `EMBED_ONLY_PERMISSIONS = ['storage','popups']`.
  - `gameSchema` (Zod) and `type Game`, with the field table from spec §5.1. `id` defaults to `slug`, `collection` to `"bramble"`, `aspectRatio` to `"16:9"`, `permissions` to `[]`, `tags` to `[]`, `featured` to `false`, `status` to `"available"`.
  - `type GameSummary = Pick<Game, 'id'|'slug'|'title'|'category'|'tags'|'collection'|'thumbnail'|'mobile'|'featured'|'addedAt'|'status'>`.
  - `type GameDetails = Game & { embedBlocked: boolean }`.
  - `toSummary(g: Game): GameSummary`.
  - `parseAspectRatio(s: string): number`, which turns `"16:9"` into `1.777…` and throws on bad input.

- [ ] **Step 1: Write the failing tests.**
  - `accepts a minimal valid file game and applies defaults`: assert `id === slug`, `collection === 'bramble'`, `aspectRatio === '16:9'`.
  - `rejects slug "Bad Slug"`.
  - `rejects title longer than 80 chars`.
  - `rejects description longer than 300 chars`.
  - `rejects unknown category "shooter"`.
  - `rejects more than 8 tags and uppercase tags`.
  - `rejects embed url that is not https` (`http://x.com`).
  - `rejects permission "camera"`.
  - `requires attribution.author and license.permission`.
  - `parseAspectRatio("4:3") ≈ 1.3333` and `parseAspectRatio("x") throws`.
- [ ] **Step 2:** Run `npx vitest run src/catalog/schema.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `schema.ts`. `source` is `z.discriminatedUnion('type', …)`. `addedAt` uses `z.iso.date()`. Tags use the regex `^[a-z0-9-]+$`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(catalog): game schema and types`.

### Task 3: Validator, catalog build and CSP

**Files:**
- Create: `scripts/lib/catalog.ts`, `scripts/validate.ts`, `scripts/build-catalog.ts`, `scripts/lib/csp.ts`; `tests/fixtures/catalog-*/` (small fixture trees)
- Modify: `vite.config.ts` (CSP plugin, build only)
- Test: `scripts/lib/catalog.test.ts`, `scripts/lib/csp.test.ts`

**Interfaces:**
- Consumes: `gameSchema`, `toSummary`, `EMBED_ONLY_PERMISSIONS` (Task 2).
- Produces:
  - `type Issue = { level: 'error'|'warn'; file: string; message: string }`.
  - `loadCatalog(root: string, extraDirs?: string[]): Promise<{ games: Game[]; issues: Issue[] }>`. It reads `<root>/catalog/games/*.json` and `<root>/catalog/sources.json`. It checks file paths against `<root>/games/…` or the extra dir's `games/…`, and thumbnails against `<root>/public/…`.
  - `buildCatalog(root: string, outDir: string, opts?: { extraDirs?: string[] }): Promise<{ count: number }>`. It writes `outDir/catalog/index.json` (sorted by title, hidden games excluded), `outDir/catalog/games/<slug>.json` as `GameDetails`, copies `games/**` to `outDir/games/`, and merges `catalog/embed-status.json` when present.
  - `buildCsp(frameHosts: string[]): string`, which returns the exact policy from spec §11 with `frame-src 'self' https://<host>…`.
  - The CLI `npm run validate` prints issues and exits 1 if there is any error. `build:catalog` runs `buildCatalog(cwd, 'public')`, and `build:e2e` adds `--extra tests/e2e/catalog`.

- [ ] **Step 1: Write the failing tests** against fixture dirs:
  - `valid fixture yields 0 errors`.
  - `duplicate id → error mentioning both files`.
  - `duplicate slug → error`.
  - `file source path missing → error "file not found: games/x/index.html"`.
  - `embed host not in sources.json → error`.
  - `storage permission on file game → error`.
  - `thumbnail set but missing → error`.
  - `thumbnail absent → warn only`.
  - `malformed JSON file → error naming the file, other games still load`.
  - `buildCatalog excludes hidden games and writes details with embedBlocked from embed-status.json`.
  - `index.json for 3000 generated summaries gzips ≤ 300 KB` (use `zlib.gzipSync`).
  - `buildCsp(['games.example.com'])` contains `frame-src 'self' https://games.example.com` and `object-src 'none'`.
- [ ] **Step 2:** Run `npx vitest run scripts`. Expected: FAIL.
- [ ] **Step 3:** Implement the three files. Paths are resolved with `node:path` and must stay inside the repo: reject `..` that escapes, and report it as an error.
- [ ] **Step 4:** Add a Vite plugin in `vite.config.ts` with `apply: 'build'` and `transformIndexHtml`. It injects `<meta http-equiv="Content-Security-Policy" content={buildCsp(hosts)}>` and `<meta name="referrer" content="no-referrer">`.
- [ ] **Step 5:** Run the tests, then `npm run validate && npm run build`. Expected: PASS, and `dist/index.html` contains `Content-Security-Policy`.
- [ ] **Step 6:** Commit with `feat(catalog): validator, build step and CSP injection`.

### Task 4: Local storage layer

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/stores.ts`
- Test: `src/lib/storage.test.ts`, `src/lib/stores.test.ts`

**Interfaces:**
- Produces:
  - `readJSON<T>(key: string, fallback: T, guard: (v: unknown) => v is T): T`. It never throws: it returns the fallback on a missing value, bad JSON, a failed guard, or a storage exception.
  - `writeJSON(key: string, value: unknown): boolean`.
  - From `stores.ts` (each built on `useSyncExternalStore` and synced across tabs through the `storage` event):
    - `useFavorites(): { slugs: string[]; isFavorite(s: string): boolean; toggle(s: string): void }`
    - `useRecent(): { slugs: string[]; push(s: string): void }`. `push` moves the slug to the front, removes duplicates, and caps the list at 20.
    - `useBestScore(slug: string): [number | null, (score: number) => void]`. It keeps the maximum, and only accepts finite integers from 0 to 1e9.
    - `clearAllData(): void`.
  - Also the non-hook getters `getFavorites()`, `getRecent()` and `getScores()` for tests and Settings.

- [ ] **Step 1: Write the failing tests:**
  - `readJSON returns fallback when localStorage.getItem throws`.
  - `… when value is "{bad"`.
  - `… when guard fails (favorites stored as {"a":1})`.
  - `toggle adds then removes a slug and persists under bramble:v1:favorites`.
  - `recent dedupes, newest first, caps at 20`.
  - `best score keeps max and rejects NaN, -1, 1.5, 2e9`.
  - `clearAllData removes all four keys`.
  - `writeJSON returns false when setItem throws (quota)`.
- [ ] **Step 2:** Run `npx vitest run src/lib`. Expected: FAIL.
- [ ] **Step 3:** Implement both files.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(lib): guarded local storage and stores`.

### Task 5: Library query (search, filter, sort, paginate, URL state)

**Files:**
- Create: `src/catalog/query.ts`
- Test: `src/catalog/query.test.ts`

**Interfaces:**
- Consumes: `GameSummary`, `CATEGORIES` (Task 2).
- Produces:
  - `type SortKey = 'az'|'za'|'new'`.
  - `type LibraryQuery = { q: string; cat: Category|'all'; tag: string|null; collection: string|null; sort: SortKey; page: number }`.
  - `DEFAULT_QUERY`, with `sort: 'az'` and `page: 1`.
  - `PER_PAGE = 24`.
  - `parseQuery(p: URLSearchParams): LibraryQuery`, which falls back to the defaults on bad values. The page must be an integer ≥ 1.
  - `toSearchParams(q: LibraryQuery): URLSearchParams`, which omits default values.
  - `normalize(s: string): string`: lowercase, NFD with combining marks stripped, trimmed, whitespace collapsed.
  - `filterAndSort(games: GameSummary[], q: Omit<LibraryQuery,'page'>): GameSummary[]`. It keeps `status !== 'hidden'`. A game matches only if every query token is found in the title, a tag, or the category. Results are grouped by rank, then sorted by `sort` within each rank. The ranks are: 0 = normalized title starts with the full query, 1 = title contains every token, 2 = other matches.
  - `paginate<T>(items: T[], page: number, perPage = PER_PAGE): { items: T[]; page: number; totalPages: number; total: number }`. The page is clamped to `[1, max(1,totalPages)]`.

- [ ] **Step 1: Write the failing tests:**
  - `"orbit" finds "Orbit Hop"`.
  - `"ORBÍT" (accented, uppercase) finds it`.
  - `"hop puzzle" requires both tokens`.
  - `title-prefix match ranks above tag-only match`.
  - `regex chars ".*(" do not throw and match literally`.
  - `whitespace-only q returns all`.
  - `500-char q returns []`.
  - `cat filter`.
  - `tag filter`.
  - `sort za and new`.
  - `paginate(30 items, 2) → 6 items, totalPages 2`.
  - `paginate page 999 → clamps to last`.
  - `paginate empty → page 1, totalPages 1`.
  - `parseQuery("page=abc&cat=nope&sort=zzz") equals DEFAULT_QUERY`.
  - `toSearchParams(DEFAULT_QUERY).toString() === ""`.
  - `round-trip parse(toSearchParams(q)) equals q`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the module. It uses `includes` on normalized strings only, with no `RegExp` built from user input.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(catalog): search, filter, sort and pagination`.

### Task 6: Iframe policy and game messages

**Files:**
- Create: `src/catalog/frame.ts`, `public/bramble-bridge.js`
- Test: `src/catalog/frame.test.ts`

**Interfaces:**
- Consumes: `Game`, `Permission` (Task 2); `siteConfig.repoUrl` (Task 1).
- Produces:
  - `type FrameAttrs = { src: string; sandbox: string; allow: string; referrerPolicy: 'no-referrer'; title: string }`.
  - `buildFrameAttrs(game: Game, baseUrl: string): FrameAttrs`. For a file game, `src` is `baseUrl + source.path`; for an embed, it is the URL. The token mapping is: pointer-lock→`allow-pointer-lock`, forms→`allow-forms`, modals→`allow-modals`, orientation-lock→`allow-orientation-lock`, storage→`allow-same-origin` (embed only), popups→`allow-popups` (embed only). `allow` is built from fullscreen, gamepad and autoplay, joined with `; `.
  - `type GameMessage = { type: 'bramble:ready' } | { type: 'bramble:score'; score: number }`.
  - `parseGameMessage(data: unknown): GameMessage | null`.
  - `reportIssueUrl(game: Pick<Game,'slug'|'title'>, userAgent: string): string`, which builds `${repoUrl}/issues/new?title=…&body=…`.
  - `public/bramble-bridge.js` sets the global `window.Bramble = { ready(): void, score(n: number): void }`. It posts to `parent` with targetOrigin `'*'`.

- [ ] **Step 1: Write the failing tests:**
  - `file game: sandbox === "allow-scripts"`, and it never contains `allow-same-origin` even if the permissions include `storage` (defense in depth).
  - `embed with storage+popups → contains allow-same-origin and allow-popups`.
  - `never emits allow-top-navigation or allow-popups-to-escape-sandbox` (loop over all PERMISSIONS).
  - `allow is "" when no fullscreen/gamepad/autoplay`.
  - `allow lists "fullscreen; gamepad"`.
  - `src for file game is "/bramble/games/orbit-hop/index.html"`.
  - `parseGameMessage accepts ready and integer score, rejects {type:"bramble:score",score:"9"}, NaN, extra types, null`.
  - `reportIssueUrl encodes title and contains slug`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement `frame.ts` and the bridge file. The bridge is a classic script, not a module, so it works inside the opaque-origin sandbox.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(player): iframe policy builder, message parser, bridge`.

### Task 7: Design tokens, global styles and UI primitives

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/themes.css`, `src/ui/{Button,Box,SearchBox,Pager,Spinner,GameCard,Thumb,Logo,Icon}.tsx`, each with its `.module.css`
- Test: `src/ui/ui.test.tsx`

**Interfaces:**
- Consumes: `GameSummary` (Task 2); `useFavorites` (Task 4); `paginate` result shape (Task 5).
- Produces:
  - `Button({ variant?: 'default'|'primary', ...buttonProps })`
  - `Box({ title: string, children, as?: 'section'|'aside' })`, which renders a heading inside the gradient title bar
  - `SearchBox({ value, onChange, onSubmit, label = 'Search games' })`, with a visible glossy "Search" button
  - `Pager({ page, totalPages, hrefFor(page: number): string })`, which renders a `<nav aria-label="Pagination">` with Prev, berry-styled numbers and Next, and sets `aria-current="page"` on the current page
  - `Spinner({ label })`
  - `Thumb({ src?: string, title: string })`, which falls back to an inline berry SVG with the title's first letter when `src` is missing or `onError` fires
  - `GameCard({ game: GameSummary })`, where the title link goes to `/play/<slug>` and a separate star button has `aria-pressed` and the `aria-label` "Add <title> to favorites" or "Remove …"
  - `Logo()`, the original puffy Bramble wordmark SVG with a `<title>Bramble</title>`
- In `tokens.css`, the palette from Global Constraints plus `--radius: 3px`, `--btn-grad: linear-gradient(#fdfdfd,#e6e6e6)`, `--btn-border: #c6c6c6`, `--content-max: 980px`, `--sidebar: 300px` and `--text-scale`. `themes.css` adds `[data-theme="midnight"]` overrides that use the same token names.

- [ ] **Step 1: Write the failing tests:**
  - `Thumb shows fallback svg when src missing`.
  - `Thumb swaps to fallback after img error event`.
  - `GameCard star toggles aria-pressed and persists to bramble:v1:favorites`.
  - `GameCard title links to /play/orbit-hop`.
  - `Pager marks current page with aria-current and hides Prev on page 1`.
  - `Pager renders nothing when totalPages is 1`.
  - `SearchBox has an accessible label`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the components and styles. Use CSS Modules, include visible `:focus-visible` outlines, and wrap all transitions in `@media (prefers-reduced-motion: no-preference)` and `:root:not([data-motion="reduce"])`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(ui): Bramble tokens, 2008-style primitives and game card`.

### Task 8: App shell, routing and catalog loading

**Files:**
- Create: `src/app/routes.tsx`, `src/app/Layout.tsx` (+ css), `src/catalog/load.ts`, `src/app/ErrorBox.tsx`, `src/features/notfound/NotFound.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `src/catalog/load.test.ts`, `src/app/Layout.test.tsx`

**Interfaces:**
- Consumes: the UI primitives (Task 7) and `siteConfig` (Task 1).
- Produces:
  - `useCatalogIndex(): { status: 'loading'|'ready'|'error'; games: GameSummary[]; retry(): void }`. It fetches `${BASE_URL}catalog/index.json` once, caches the result in a module variable, and validates the shape loosely (it must be an array).
  - `useGameDetails(slug: string): { status: 'loading'|'ready'|'notfound'|'error'; game?: GameDetails; retry(): void }`. A 404 response maps to `notfound`.
  - `ErrorBox({ message, onRetry })`.
  - The routes are `/` (Home), `/games`, `/favorites`, `/play/:slug`, `/settings`, `/about` and `*` (NotFound). Every page except Home is loaded with `React.lazy`.
  - The Layout has a skip link to `#main`, a header (Logo, SearchBox that navigates to `/games?q=`, and links to Settings and About), tabs (Home · Games · Favorites with `aria-current`), `<main id="main">`, and a footer.

- [ ] **Step 1: Write the failing tests:**
  - `useCatalogIndex: fetch rejects → status error; retry → ready`.
  - `useGameDetails: 404 → notfound`.
  - `Layout: active tab has aria-current="page" on /games`.
  - `submitting header search navigates to /games?q=orbit`.
  - `skip link targets #main`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the shell. `main.tsx` uses `<BrowserRouter basename={import.meta.env.BASE_URL}>`. Placeholder pages render a heading only and are filled in by Tasks 9 to 12.
- [ ] **Step 4:** Run the tests, then `npm run dev` and fetch `/bramble/games` with `curl`. Expected: tests PASS and the HTML is served.
- [ ] **Step 5:** Commit with `feat(app): shell, routes, catalog loading with retry`.

### Task 9: Library and Favorites pages

**Files:**
- Create: `src/features/library/LibraryPage.tsx` (+ css), `src/features/library/FavoritesPage.tsx`, `src/features/library/Filters.tsx`
- Test: `src/features/library/library.test.tsx`

**Interfaces:**
- Consumes: `useCatalogIndex` (Task 8), `parseQuery`, `toSearchParams`, `filterAndSort`, `paginate` (Task 5), `GameCard`, `Pager`, `SearchBox` (Task 7), `useFavorites` (Task 4).
- Produces: `LibraryPage` and `FavoritesPage`. The library state lives only in `useSearchParams`. Any filter change resets `page` to 1.

- [ ] **Step 1: Write the failing tests** (catalog mocked):
  - `renders 24 cards on page 1 of 30 games and pager shows 2 pages`.
  - `typing "orbit" (debounced 150 ms, fake timers) updates URL q and results`.
  - `nonsense query shows empty state with "Clear filters" link that restores all`.
  - `category tab sets ?cat=puzzle and page resets to 1`.
  - `sort select changes order`.
  - `?page=999 shows last page`.
  - `catalog error shows ErrorBox with Retry`.
  - `zero games shows empty-catalog message`.
  - `FavoritesPage lists only favorites present in catalog, ignoring unknown slug "ghost"`.
  - `FavoritesPage empty state explains the ★`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the pages. The heading reads "Games" with a count such as "30 games". The collection filter appears only when there is more than one collection.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(library): games and favorites pages`.

### Task 10: Player page

**Files:**
- Create: `src/features/player/PlayerPage.tsx` (+ css), `src/features/player/usePlayerState.ts`, `src/features/player/useFullscreen.ts`
- Test: `src/features/player/player.test.tsx`, `src/features/player/usePlayerState.test.ts`

**Interfaces:**
- Consumes: `useGameDetails` (Task 8), `buildFrameAttrs`, `parseGameMessage`, `reportIssueUrl` (Task 6), `useRecent`, `useBestScore`, `useFavorites` (Task 4), `parseAspectRatio` (Task 2).
- Produces:
  - `type PlayerState = 'loading'|'ready'|'timeout'|'unavailable'|'blocked'`.
  - `usePlayerState(game: GameDetails): { state: PlayerState; onFrameLoad(): void; onReadyMessage(): void; retry(): void }`. A game with status `broken` starts in `unavailable`, and `embedBlocked` starts in `blocked`. The state moves to `ready` on a ready message, or on frame load when the game is not a Bramble-bridge game. Bridge games are identified by `collection === 'bramble' && source.type === 'file'`. After 15 000 ms the state becomes `timeout`, and `retry` reloads the iframe by bumping a `key`.
  - `useFullscreen(ref): { isFull: boolean; toggle(): void; mode: 'native'|'expanded' }`. It uses `element.requestFullscreen` when available and otherwise falls back to `expanded`. Esc exits.

- [ ] **Step 1: Write the failing tests:**
  - `usePlayerState: broken → unavailable`.
  - `embedBlocked → blocked`.
  - `bridge game stays loading after frame load until ready message`.
  - `non-bridge game ready on frame load`.
  - `15 s with fake timers → timeout`.
  - `retry returns to loading`.
  - `PlayerPage renders iframe with sandbox "allow-scripts" for orbit-hop`.
  - `ignores message events whose source is not the iframe window`.
  - `score message updates best score display`.
  - `blocked state shows external link with rel="noopener noreferrer"`.
  - `unknown slug shows not-found card with link to /games`.
  - `opening a game pushes it to recent`.
  - `details fetch error shows ErrorBox with Retry`.
  - `fullscreen falls back to expanded when requestFullscreen is undefined`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the page with the layout from spec §7.1: a breadcrumb, a viewport that keeps the aspect ratio (CSS `aspect-ratio`, `max-height: calc(100vh - 160px)`), a side Box, and the action buttons (Favorite, Fullscreen, Reload which calls `retry`, and Report a problem). "Back to games" uses `navigate(-1)` when `history.state.idx > 0` and otherwise links to `/games`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(player): sandboxed player with load states, fullscreen, scores`.

### Task 11: Home page

**Files:**
- Create: `src/features/home/HomePage.tsx` (+ css)
- Test: `src/features/home/home.test.tsx`

**Interfaces:**
- Consumes: `useCatalogIndex`, `useRecent`, `useFavorites`, `GameCard`, `Box`.
- Produces: `HomePage`, which shows a "Featured" grid (up to 6 featured games) and a "Newest games" grid (up to 6, sorted by `addedAt` descending) in the main column, and "Recently played", "Your favorites" and "Surprise me" boxes in the sidebar.

- [ ] **Step 1: Write the failing tests:**
  - `shows up to 6 featured`.
  - `newest sorted by addedAt desc`.
  - `recent box lists recent slugs in order, skipping unknown slugs`.
  - `first visit shows friendly text in recent and favorites boxes`.
  - `Surprise me navigates to /play/<slug of an available game>` (stub `Math.random`).
  - `Surprise me is disabled with zero games`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the page.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(home): featured, newest, recent, favorites, surprise me`.

### Task 12: Settings, backgrounds and the About page

**Files:**
- Create: `src/features/settings/SettingsPage.tsx`, `src/features/settings/useSettings.ts`, `src/features/settings/applySettings.ts`, `src/styles/backgrounds.css`, `public/bg/berries.svg`, `src/features/about/AboutPage.tsx`
- Test: `src/features/settings/settings.test.tsx`

**Interfaces:**
- Consumes: `readJSON`, `writeJSON`, `clearAllData` (Task 4).
- Produces:
  - `type Settings = { theme: 'classic'|'midnight'; background: 'plain'|'berries'|'leaves'; motion: 'system'|'reduce'|'full'; lowPerf: boolean; textScale: 1|1.15|1.3 }`. The defaults are `classic`, `plain`, `system`, `false` and `1`.
  - `useSettings(): [Settings, (patch: Partial<Settings>) => void]`.
  - `applySettings(s: Settings, prefersReduced: boolean): void`. It sets `data-theme`, `data-bg`, `data-motion` (`reduce` or `full`, after resolving `system`), `data-lowperf` and `--text-scale` on `document.documentElement`. Low-performance mode forces `data-bg` to the static version of the chosen background (`leaves` becomes `plain`) and `data-motion` to `reduce`.
  - The About page has three sections: "About Bramble", "Credits" (generated from each catalog game's attribution and license) and "Privacy", which says: "Bramble has no accounts, no analytics and no cookies. Your favorites, recently played games, scores and settings are stored only in this browser."

- [ ] **Step 1: Write the failing tests:**
  - `applySettings system+prefersReduced → data-motion reduce`.
  - `lowPerf forces reduce and static bg`.
  - `changing theme persists to bramble:v1:settings and sets data-theme`.
  - `Clear my data asks for confirmation (inline confirm step, not window.confirm) and then empties favorites`.
  - `corrupted settings JSON → defaults`.
  - `About lists credits for each game`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the settings code and the About page. Drifting leaves is a single CSS animation of an SVG pattern on `body::before`, and it is disabled under `data-motion="reduce"`. Call `applySettings` in `main.tsx` before the first render, and again on every change.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(settings): themes, backgrounds, motion, text size, data reset, about`.

### Task 13: Orbit Hop

**Files:**
- Create: `games/orbit-hop/index.html`, `games/orbit-hop/style.css`, `games/orbit-hop/logic.js`, `games/orbit-hop/game.js`, `public/thumbs/orbit-hop.svg`, `catalog/games/orbit-hop.json`, `src/test/loadClassicScript.ts`
- Test: `games/orbit-hop/logic.test.ts`

**Interfaces:**
- Consumes: `window.Bramble` (Task 6 bridge), loaded via `<script src="../../bramble-bridge.js">`.
- Produces:
  - `logic.js` is a classic script that sets `globalThis.OrbitHopLogic`, which has:
    - `createState(seed: number)`, returning `{ orbit: 0|1, angle, speed, score, seeds, thorns: [], alive: true, paused: false }`
    - `hop(state)`
    - `step(state, dtSeconds)`
    - `collides(state): boolean`
    - `ORBITS = [0.32, 0.46]` (fractions of the canvas' smaller side)
  - Spawning is deterministic for a given seed (mulberry32).
  - `loadClassicScript(path): any` runs a file in `node:vm` and returns its `globalThis`.
  - Catalog entry: slug `orbit-hop`, category `arcade`, tags `["one-button","berries"]`, controls `["keyboard","mouse","touch"]`, `fullscreen: true`, `mobile: "yes"`, `aspectRatio: "1:1"`, `featured: true`, attribution author "Bramble", license name "Original work" with permission "Made for Bramble".

- [ ] **Step 1: Write the failing tests** (through `loadClassicScript`):
  - `hop toggles orbit`.
  - `score increases with time while alive`.
  - `speed ramps and is capped`.
  - `collides when a thorn shares orbit and angle within tolerance`.
  - `step does nothing when paused or dead`.
  - `same seed → same thorn sequence`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the logic, then `game.js`:
  - The canvas resizes with a ResizeObserver and uses `devicePixelRatio`.
  - Controls: Space, click or tap hops; P or a button pauses; R or a button restarts. It auto-pauses on `visibilitychange` or `blur`.
  - The game over screen shows the score and a "Play again" button.
  - It calls `Bramble.ready()` after the first frame and `Bramble.score(score)` on game over.
  - Instructions are shown in the page itself, and the buttons are at least 44 px.
- [ ] **Step 4:** Run the tests and `npm run validate`. Then serve the page with `npm run dev` and load it in Playwright through a quick script that loads `/bramble/play/orbit-hop`, clicks the frame, waits 2 s and screenshots. Expected: tests PASS, 0 validation errors, and the screenshot shows the berry in orbit.
- [ ] **Step 5:** Commit with `feat(games): Orbit Hop, an original one-button arcade game`.

### Task 14: `add-game` command

**Files:**
- Create: `scripts/lib/add-game-core.ts`, `scripts/add-game.ts`, `docs/adding-games.md`
- Test: `scripts/lib/add-game-core.test.ts`

**Interfaces:**
- Consumes: `gameSchema` (Task 2), `loadCatalog` (Task 3).
- Produces:
  - `slugify(title: string): string`.
  - `type AddGameInput = { kind: 'html'|'folder'|'link'; from: string; title: string; category: Category; tags?: string[]; controls?: Control[]; description: string; author: string; permission: string; licenseName?: string; thumbnail?: string; fullscreen?: boolean; mobile?: 'yes'|'partial'|'no'; aspectRatio?: string }`.
  - `planAddGame(input: AddGameInput, existingSlugs: Set<string>, knownHosts: string[], today: string): { entry: Game; copies: { from: string; to: string }[]; newHost: string | null }`.
  - The CLI takes flags through `node:util` `parseArgs`: `--html`, `--folder`, `--link`, `--title`, `--category`, `--tags a,b`, `--description`, `--author`, `--permission`, `--thumb`, `--yes`. Anything missing is asked for with `node:readline/promises`. The CLI applies the plan, adds the new host to `sources.json` after confirming (or automatically with `--yes`), runs the validator, and prints `http://localhost:5173/bramble/play/<slug>`.

- [ ] **Step 1: Write the failing tests:**
  - `slugify("Bloons: TD 5!") === "bloons-td-5"`.
  - `duplicate slug gets "-2" suffix`.
  - `html kind copies file to games/<slug>/index.html`.
  - `folder kind requires index.html inside, else throws "folder must contain index.html"`.
  - `link kind returns newHost when host unknown, null when known`.
  - `link must be https`.
  - `entry passes gameSchema`.
  - `thumbnail copied to public/thumbs/<slug>.<ext>`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the core, the CLI and the doc. The doc covers three walkthroughs (an HTML file, a folder, a link), how to fill in the permission note, and how to hand-edit the JSON.
- [ ] **Step 4:** Run the tests, then do an end-to-end check in a temp copy of the repo: `npm run add-game -- --html tests/fixtures/hello.html --title "Hello Berry" --category casual --description "Test" --author Me --permission "Mine" --yes`, then `npm run validate`. Expected: PASS, the files are created, and there are 0 errors. Delete the temp copy afterwards.
- [ ] **Step 5:** Commit with `feat(scripts): add-game command and guide`.

### Task 15: Embed checker

**Files:**
- Create: `scripts/lib/embed-check.ts`, `scripts/check-embeds.ts`
- Test: `scripts/lib/embed-check.test.ts`

**Interfaces:**
- Produces:
  - `analyzeFrameHeaders(h: Headers, portalOrigin: string): 'ok'|'blocked'`. The result is `blocked` when `X-Frame-Options` is `DENY` or `SAMEORIGIN`. It is also `blocked` when the CSP has a `frame-ancestors` directive that lists neither `*` nor `portalOrigin`, or that lists only `'none'` or `'self'`.
  - The CLI fetches each embed URL with a GET request and a 10 s timeout, treating network errors as `unknown`. It prints a table and writes `catalog/embed-status.json` (`Record<slug, 'ok'|'blocked'|'unknown'>`) when run with `--write`. It always exits 0.
  - The `portalOrigin` value comes from the `PORTAL_ORIGIN` env var, defaulting to `https://<owner>.github.io`, where `<owner>` is parsed from `siteConfig.repoUrl`.

- [ ] **Step 1: Write the failing tests:**
  - `XFO DENY → blocked`.
  - `XFO sameorigin (lowercase) → blocked`.
  - `frame-ancestors 'self' → blocked`.
  - `frame-ancestors https://x.github.io with matching origin → ok`.
  - `frame-ancestors * → ok`.
  - `no headers → ok`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the checker.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(scripts): embed compatibility checker`.

### Task 16: End-to-end, accessibility and size checks

**Files:**
- Create: `tests/e2e/catalog/` (31 fixture entries: 29 fillers that point at `games/orbit-hop/index.html`, `broken-berry` with status `broken`, and `no-thumb` with no thumbnail), `tests/e2e/{navigation,library,player,a11y,security}.spec.ts`, `scripts/size-check.ts`
- Test: the specs listed above

**Interfaces:**
- Consumes: everything built so far, plus `build:e2e` (Task 3).
- Produces: `npm run e2e` and `npm run size`. The size check reads `dist/.vite/manifest.json`, gzips the entry chunk and its static imports, and exits 1 if the total is over 153 600 bytes.

- [ ] **Step 1: Write the specs:**
  - `navigation`:
    - Tabs change the URL, and Back/Forward restore it.
    - A fresh load of `/bramble/play/orbit-hop` works (served through 404.html).
    - An unknown route shows NotFound.
  - `library`:
    - Search with an empty state, then clear.
    - Changing the category resets the page.
    - Pagination goes to page 2.
    - A favorite persists after a reload and appears on Home and Favorites.
    - The `no-thumb` card shows the fallback SVG.
  - `player`:
    - Orbit Hop reaches ready (the spinner is gone) and hops on click.
    - Back returns to the same `/games?…` URL.
    - `broken-berry` shows the unavailable state.
    - The fullscreen button produces either `document.fullscreenElement` or the `.expanded` class.
  - `security`:
    - The Orbit Hop iframe's `sandbox` is exactly `allow-scripts`.
    - The page has a CSP meta tag that contains `object-src 'none'`.
    - Inside the frame, `localStorage` access throws (`frame.evaluate`).
  - `a11y`: run AxeBuilder on `/`, `/games`, `/favorites`, `/play/orbit-hop`, `/settings` and `/about` in both the classic and midnight themes. Expect zero violations with impact `serious` or `critical`. Also tab through the header to the first game card with the keyboard only and check that focus is visible (`:focus-visible` outline width > 0).
- [ ] **Step 2:** Run `npm run e2e`. Fix the real defects it finds; never loosen the assertions. Expected: all pass in both the chromium and mobile projects.
- [ ] **Step 3:** Run `npm run build && npm run size`. Expected: the printed total is at or under 150 KB, and the command exits 0.
- [ ] **Step 4:** Commit with `test(e2e): navigation, library, player, security and accessibility suites; size budget`.

### Task 17: CI, deployment and documentation

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/embeds.yml`, `.github/dependabot.yml`, `README.md`, `docs/deploy.md`, `docs/security.md`
- Modify: `src/config.ts` (`repoUrl`, once the owner names the repo)

**Interfaces:**
- Produces:
  - `ci.yml`: on push and pull request, a `check` job on Node 22 runs `npm ci`, lint, typecheck, test, validate, build, size, `npx playwright install --with-deps chromium`, e2e and `npm audit --audit-level=high`. On push to `main`, a `deploy` job (`needs: check`, permissions `pages: write` and `id-token: write`) runs `actions/configure-pages`, `actions/upload-pages-artifact` (path `dist`) and `actions/deploy-pages`, each pinned to its current major version, checked at implementation time.
  - `embeds.yml`: a weekly cron runs `npm run check-embeds` and uploads the output.
  - `dependabot.yml`: weekly for npm and github-actions.

- [ ] **Step 1:** Write the workflows. Validate their syntax with `npx --yes @action-validator/cli` if it's available, or otherwise with `npx yaml-lint`. Expected: no errors.
- [ ] **Step 2:** Write `README.md`, aimed at a beginner. It covers what Bramble is, installing Node 22, `npm ci`, `npm run dev`, running the tests, adding a game (with a link to `docs/adding-games.md`), and the project structure (spec §12, one line per directory).
- [ ] **Step 3:** Write `docs/deploy.md`:
  - creating the GitHub repo named `bramble`
  - pushing
  - Settings → Pages → Source: GitHub Actions
  - the first deploy
  - the site URL
  - rollback (revert the commit, or re-run an older workflow)
  - adding a custom domain later (a `public/CNAME` file, the apex A/AAAA records or the `www` CNAME, enforcing HTTPS, and updating `BASE_PATH` to `/`)
  - The doc states plainly that no secrets are needed.
- [ ] **Step 3b:** Write `docs/security.md` from spec §11. It covers the threat model, each mitigation with the file and test that enforces it, the known limits (meta CSP can't set `frame-ancestors`, the direct game-file URL risk with its Phase 2 fix, opaque-origin games can't use storage), and the `npm audit` result observed at the time.
- [ ] **Step 4:** Do a full local run: `npm ci && npm run lint && npm run typecheck && npm test && npm run validate && npm run build && npm run size && npm run e2e && npm audit --audit-level=high`. Expected: every command exits 0. Record the output summary in the report to the owner.
- [ ] **Step 5:** Commit with `ci: GitHub Actions build/test/deploy; docs: README, deploy, security`.
- [ ] **Step 6:** Pushing and the first deploy need the owner's GitHub repo connected to this session. Ask for it at that point, set `repoUrl`, push, and confirm the live URL loads `/bramble/` and `/bramble/play/orbit-hop`. Report that deployment is live only after the live URL has been fetched and checked.
