# Adding games to Bramble

Every game on Bramble is a small JSON file in `catalog/games/`. If the game's files live on Bramble, they go in `games/<slug>/` (the slug is the game's short web name). **You never need to edit React code to add a game.**

> Only add games you have permission to host or embed. The command asks where that permission comes from and saves your answer with the game, so you have a record.

## The quick way: `npm run add-game`

Open a terminal in the project folder and run:

```bash
npm run add-game
```

It asks a few questions, then:

1. copies the game files into `games/<slug>/` (or allows the website, for a link),
2. writes `catalog/games/<slug>.json`,
3. checks the entry and tells you the address where you can try it.

Then run `npm run dev` and open the address it printed.

### 1. A single HTML file

You have `space-pie.html` and the game is entirely inside that one file:

```bash
npm run add-game -- --html ~/Downloads/space-pie.html --title "Space Pie" --category arcade \
  --description "Fling pies at passing comets." --author "Sam Lee" \
  --permission "Sam said yes in Discord, 2026-10-21" --thumb ~/Downloads/space-pie.png
```

The file becomes `games/space-pie/index.html`.

### 2. A folder (HTML plus images, sounds, scripts)

The folder must have an `index.html` at its top level:

```bash
npm run add-game -- --folder ~/Downloads/maze-runner --title "Maze Runner" --category puzzle \
  --description "Find the exit before the hedge grows back." --author "Ava" --permission "Ava's MIT license"
```

The whole folder is copied to `games/maze-runner/`.

### 3. A link to a game hosted somewhere else

Use the game's **official embed address**. Many game sites list one under "Embed" or "Share".

```bash
npm run add-game -- --link https://games.example.com/embed/rocket-jam --title "Rocket Jam" \
  --category action --description "Keep the rocket in the air." --author "Example Games" \
  --permission "Official embed code from example.com"
```

The site (`games.example.com`) is added to `catalog/sources.json`. That file is Bramble's list of sites that may appear inside it, and the security rules are built from it.

Some websites refuse to be shown inside other sites. Run `npm run check-embeds -- --write` to find those. Bramble then shows an "open on its own site" button for them instead of a broken frame.

### Handy extra flags

| Flag | Meaning | Default |
|---|---|---|
| `--tags a,b` | Up to 8 tags | none |
| `--controls keyboard,touch` | Any of `keyboard`, `mouse`, `touch`, `gamepad` | `keyboard,mouse` |
| `--mobile yes\|partial\|no` | Whether it works on phones | `partial` |
| `--aspect 4:3` | Shape of the game screen | `16:9` |
| `--instructions "…"` | "How to play" text | none |
| `--license "CC BY 4.0"` | License name | `Used with permission` |
| `--author-url https://…` | Link to the creator | none |
| `--yes` | Don't ask anything; fail if something's missing | off |

## Editing a game by hand

Open `catalog/games/<slug>.json` in any editor. The fields:

```json
{
  "slug": "space-pie",
  "title": "Space Pie",
  "description": "Fling pies at passing comets.",
  "instructions": "Click to throw.",
  "thumbnail": "thumbs/space-pie.png",
  "category": "arcade",
  "tags": ["one-button"],
  "source": { "type": "file", "path": "games/space-pie/index.html" },
  "controls": ["mouse", "touch"],
  "fullscreen": true,
  "mobile": "yes",
  "aspectRatio": "4:3",
  "permissions": [],
  "attribution": { "author": "Sam Lee", "url": "https://example.com/sam" },
  "license": { "name": "Used with permission", "permission": "Sam said yes in Discord, 2026-10-21" },
  "status": "available",
  "featured": false,
  "addedAt": "2026-10-22"
}
```

- **Categories:** action, puzzle, arcade, racing, sports, strategy, platformer, casual.
- **`status`:** `available`, `broken` (shown with a "not working right now" message) or `hidden` (left out of the site entirely).
- **`featured: true`** puts the game on the Home page.
- **`permissions`:** extra abilities, all off by default. You can turn on:
  - `pointer-lock`, for mouse-look games
  - `forms`
  - `modals`
  - `orientation-lock`
  - `fullscreen`, which lets the game itself go fullscreen; Bramble's own Fullscreen button works without it
  - `gamepad`
  - `autoplay`
  - `storage` and `popups`, **for link games only**

  Only add a permission when a game needs it.

After editing, run:

```bash
npm run validate
```

It lists any mistakes, such as a missing file, a duplicate name, or a website that isn't allowed.

## Saving progress and scores

Games stored on Bramble run in a locked-down frame and **can't use their own saved data** (localStorage). That's what keeps them from touching Bramble's data. Games that only keep scores in memory work fine. A separate games website that removes this limit is planned for Phase 2.

Games you make yourself can send their best score to Bramble. Add this line to your game's HTML:

```html
<script src="../../bramble-bridge.js"></script>
```

Then call `Bramble.ready()` once the game is drawn, and `Bramble.score(points)` when a round ends. `games/orbit-hop/` is a complete example.
