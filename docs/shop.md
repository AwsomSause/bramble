# The Patch Shop

A cosmetics shop you reach from the **Shop** tab, with **play-money coins**.

## Coins

Coins are just for fun — there are **no real purchases** and no real-world value. You earn them:

- **+25** the first time you visit each day.
- **+5** for each different game you play, up to **10 games a day** (so up to +50/day from playing).

Coins, purchases and what's equipped are stored **in this browser only** (they don't sync between devices).

Tune the numbers in `src/features/shop/economy.ts` (`DAILY_BONUS`, `PLAY_REWARD`, `PLAY_CAP`) and the prices in `src/features/shop/catalog.ts`.

## What's in it now

- **Cursors** — swap your mouse pointer for a berry, leaf or star.
- **Colour packs** — recolour buttons and highlights (Bubblegum, Forest, Sunset, Ocean) on top of whatever theme you're using.

Buy an item with coins, then **Use** it; the default "Normal pointer" / "Bramble purple" are free and always available, so you can switch back any time.

## Planned next (not built yet)

These were on the wishlist and are good follow-ups, each noted with what it needs first:

- **Pet accessories & more pet slots** — wait until the Bramble Buddy PR is merged, then they hook into the pet.
- **Background music loops** — needs an audio approach; the clean, licence-safe option is short **original** loops synthesised in the browser (Web Audio), so no files to license.
- **Sticker packs** — a board you decorate, with original/licensed stickers.
- **Custom game recommendations** — a "picks for you" shelf once there are more games.

## How it's built

- `economy.ts` — pure coin rules (earn/spend), fully unit-tested.
- `catalog.ts` — the list of items.
- `shopStore.ts` — wallet, owned items and what's equipped (per-browser).
- `useCosmetics.ts` + `styles/cosmetics.css` — apply the equipped cursor/accent via `data-` attributes.
- `ShopPage.tsx` — the page. Coins are awarded from the player page and on daily load.
