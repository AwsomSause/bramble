# The admin "Add Game" panel

Bramble has a hidden owner-only panel for adding games with a thumbnail and description, so you don't have to use the command line.

## ⚠️ Read this first: the login is a soft lock, not real security

Bramble is a **static site** — all its code is public on GitHub, and there's no server to check a password. So the admin login **keeps the panel out of sight from your friends, but a determined person could get past it** by reading the source. Don't put anything truly private behind it. Real protection would need a backend (a later phase).

Because of that, your password is **never stored in the repo**. The setup command saves only a scrambled fingerprint (a salted SHA-256 hash). Your actual password isn't written anywhere you can read it back.

## One-time setup

On your computer, in the project folder:

```bash
npm run set-admin
```

It asks for a **username**, a **password**, and a **secret answer** (your 3rd grade school — e.g. `Elk City Elementary`). It writes the fingerprint to `src/features/admin/admin.config.json`. Commit that file and redeploy. Until you do this, the panel stays locked and shows a setup message.

- Username and the school answer are **not** case-sensitive and ignore punctuation (`Elk City Elementary!` = `elk city elementary`).
- The password **is** exact.
- To change it later, run `npm run set-admin` again.

You can also set it non-interactively: `npm run set-admin -- --username you --password 'yourpass' --school 'Elk City Elementary'`.

## Opening the panel

On the **Orbit Hop** start screen there's a faint raspberry in the bottom-right corner. Click it, then enter your three answers. (Any game's page can be told to show the login, but the raspberry is the intended way in — and the login still protects it.)

## Adding a game

Fill in the title, description, category, how-to-play, controls, and either a **link** to a game or an **HTML file** to upload, plus an optional thumbnail image. Enter who made it and where your permission comes from. Click **Save as draft**.

**Drafts live in this browser only.** They show up in your library with a green **Draft** badge, and you can play-test them right away — no one else sees them. Drafts are listed at the bottom of the panel, where you can Play, Export, Publish, or Delete each one.

## Making a game go live

A draft is only on your device until you publish it. Two ways:

### Publish with a GitHub token (local only)

When you run Bramble on your own computer (`npm run dev`), each draft gets a **Publish to GitHub** button. It commits the game's files to your repo, and CI deploys them. This is **turned off on the live site** on purpose: a repo-writing token sitting in a public web page is a real risk, so publishing only works from your machine.

To use it, create a **fine-grained personal access token** at GitHub → Settings → Developer settings → Fine-grained tokens:
- **Repository access:** only your `bramble` repo.
- **Permissions:** Contents → **Read and write** (nothing else).
Paste it into the token box in the panel. By default it's kept only for the browser session; "Remember on this device" stores it in this browser (less safe) — leave it off on a shared computer. If a token ever leaks, delete it on GitHub and make a new one; because it's scoped to just this repo with only Contents access, the worst case is someone editing this one repo, which git history can undo.

### Export and commit by hand (works anywhere)

Each draft has an **Export** button that downloads its files (the entry JSON, the thumbnail, and the HTML for a file game). Drop them into the matching folders (`catalog/games/`, `public/thumbs/`, `games/<slug>/`), run `npm run validate`, commit and push. Same result, no token.

## Removing the panel

If you don't want it, delete `src/features/admin/` and the `<AdminHost />` line in `src/App.tsx`, and remove the raspberry button from `games/orbit-hop/index.html`.
