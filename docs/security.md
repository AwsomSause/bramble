# Bramble security review (MVP)

- **Date:** 2026-10-22
- **Scope:** the Phase 1 static site, the catalog build and the developer scripts.

This document records what we protect against, how, and where each protection is tested. **A clean scan does not mean the site is secure.** These are the risks we thought about, and the list is not exhaustive.

## What we're protecting

- **The people playing.** No game should be able to hijack the Bramble page, steal what's typed into it, send players to other sites, or pop up fake windows.
- **Their saved data.** Favorites, recently played games, scores and settings live in the browser's localStorage. There are no accounts, passwords or payment details anywhere, which keeps the stakes low by design.
- **The site's integrity.** Only reviewed code and allowlisted sites should run inside Bramble.

## Threats and mitigations

| # | Threat | Mitigation | Enforced by / tested in |
|---|---|---|---|
| 1 | **A game is malicious or buggy.** It's someone else's code. | Every game runs in `<iframe sandbox>`. That starts with everything off (forms, popups, top navigation, plugins, same-origin access) and adds back only `allow-scripts` plus what the game declares from an approved list. | `src/catalog/frame.ts`; `frame.test.ts`; e2e `security.spec.ts` ("sandboxed with scripts only") |
| 2 | **A game reads Bramble's data.** Our own games are served from the same site, so they'd normally count as "same origin". | File games **never** get `allow-same-origin`, so the browser gives them a blank "null" origin. The builder strips it even if the catalog asks for it. | `frame.test.ts` (defense-in-depth case); e2e checks the game frame's origin is `null` and its storage access is blocked |
| 3 | **A game navigates the whole page away** (to a phishing page, say). | `allow-top-navigation*` and `allow-popups-to-escape-sandbox` are never emitted. `allow-popups` is only allowed for embedded games on other sites. | `frame.test.ts`; schema and validator reject `popups`/`storage` on file games |
| 4 | **A game asks for camera, microphone, location and so on.** | The iframe's `allow` attribute (Permissions Policy) lists only `fullscreen`, `gamepad` and `autoplay`, and only when the game declares them. Everything else is denied. | `frame.test.ts` |
| 5 | **Forged messages to the portal.** | Messages are accepted only when `event.source` is the game's own frame, and only in two exact shapes (`bramble:ready`, or `bramble:score` with an integer). Scores are capped at 0–1,000,000,000 and only ever stored. | `parseGameMessage` tests; `player.test.tsx` ("ignores message events whose source is not the iframe window") |
| 6 | **Embedding unexpected sites.** | Embed links must be `https://`. Their host must be in `catalog/sources.json`, or the build fails. The page's CSP `frame-src` is generated from that same list, so the browser refuses any other frame too. | `scripts/lib/catalog.ts`; `catalog.test.ts`; `csp.test.ts` |
| 7 | **Script injection (XSS) through catalog text.** | React escapes all text. `dangerouslySetInnerHTML` is banned by a lint rule. The schema limits lengths and formats (slugs, tags, dates, URLs). | `eslint.config.js`; `schema.test.ts` |
| 8 | **Injected or third-party scripts.** | The Content-Security-Policy is `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-src 'self' <allowlist>; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`. There are no CDNs, web fonts, analytics or ads. | `vite.config.ts`; e2e checks the CSP is present and that the main pages produce no console errors (no CSP violations) |
| 9 | **Path tricks in the catalog** (`games/../secret`). | Paths are resolved and must stay inside `games/` (game files) or `public/` (thumbnails). | `catalog.test.ts` ("file path escaping the games folder") |
| 10 | **Reverse tabnabbing via external links.** | Every `target="_blank"` link has `rel="noopener noreferrer"`. Game frames use `referrerpolicy="no-referrer"`. | `player.test.tsx` (blocked-embed link) |
| 11 | **Supply chain.** | Exact versions in `package.json`, a committed lockfile, `npm ci` in CI, `npm audit --audit-level=high` in CI, and Dependabot weekly. Runtime dependencies are just React, React DOM, React Router and Zod. | `.github/workflows/ci.yml`; `.github/dependabot.yml` |
| 12 | **Privacy.** | Nothing leaves the browser. No cookies, analytics, accounts or server. The About → Privacy section says so, and Settings → "Clear my data" deletes everything. | `settings.test.tsx`; About page test |
| 13 | **Crashes from bad stored data.** | Every read of storage is wrapped: bad JSON, wrong types, blocked storage or a full disk all fall back to defaults. | `storage.test.ts`; `stores.test.tsx`; `settings.test.tsx` |

## Known limits (accepted for now)

1. **No `frame-ancestors` and no `X-Frame-Options`.** GitHub Pages can't send custom headers, and `frame-ancestors` doesn't work in a `<meta>` tag. So another site could show Bramble inside a frame ("clickjacking"). Bramble has no logins, purchases or other sensitive buttons, so the impact is low. *Fix:* if Bramble ever moves to a host that supports headers (Cloudflare Pages, Netlify), send `Content-Security-Policy: frame-ancestors 'none'` as a header.
2. **Opening a game file directly.** Someone could open `/bramble/games/x/index.html` as a normal page instead of inside Bramble's frame. It then runs with full access to Bramble's origin and could read favorites and settings. Only games you chose to add live there, and the data is low-value. *Fix (Phase 2, first task):* move game files to a separate site (`<org>.github.io`), which is a different origin, so this becomes impossible. **Do this before adding accounts or anything sensitive.**
3. **Hosted games can't save progress.** This is a direct result of the protection in threat 2. Phase 2's separate games site fixes it safely.
4. **Embedded sites can change.** A partner site could start serving different content. The host allowlist and the sandbox limit what it can do. Review `catalog/sources.json` occasionally, and remove hosts you no longer use.
5. **The CSP only applies to production builds.** The development server needs inline scripts for hot reload. Don't use `npm run dev` as a public server.

## Evidence at time of writing

These results were observed on 2026-10-22 on the `mvp` branch:

- `npm test`: 178 unit and integration tests passed.
- `npm run e2e`: 59 passed and 1 skipped (the keyboard test runs on desktop only), across desktop and mobile Chromium. This includes axe accessibility scans of 6 pages × 2 themes with zero serious or critical findings.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- `npm run size`: 87 KB of initial JavaScript, gzipped (budget 150 KB).

## Before Phase 6 (accounts, chat, AI)

Each of these needs a server and a fresh security review. It covers authentication from a reputable provider, server-side authorization, rate limits, moderation and reporting, secrets kept on the server only, a privacy policy, and age considerations.
