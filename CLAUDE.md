# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**GAMEVAULT** — a static single-page game library browser. No framework, no build step required. Two user-facing pages share one core module:

- `index.html` + `src/app.js` — desktop app
- `mobile.html` — mobile web app (structurally separate UI, inline script)
- `src/gv-core.js` — shared constants and helpers (platform/genre maps, cover resolution, SVG fallback art, data fetching, search-key building), loaded by **both** pages before their page script. Page-agnostic logic goes here, never duplicated into the pages.

All game data lives in `data/games.json`. The `www/` directory is the Capacitor webDir (iOS shell) — a generated copy of the mobile app. Never edit `www/` by hand; run `npm run sync:www` after changing `mobile.html`, `src/gv-core.js`, styles, or game data.

## Running locally

```bash
npm start          # npx serve . -p 3000  (required — file:// cannot fetch JSON)
```

The app **must** be served over HTTP; opening `index.html` directly via `file://` will fail to load `data/games.json`.

## Architecture

### Data flow
`data/games.json` → fetched at runtime by `src/app.js` → rendered into `#GRID`

The JSON shape (`src/data-types.md`):
```json
{
  "IMG": { "Game Title": "https://cdn.akamai.steamstatic.com/steam/apps/<appId>/header.jpg" },
  "GAMES": [{ "t": "title", "y": 2024, "g": "genre", "vita": "yes|warn|no",
               "p": "PC", "f": ["must","solo","owned"], "d": "description",
               "cover": "optional-url", "consoleCover": "optional-url", "steamId": 12345 }]
}
```

### Cover resolution priority (per game, in `gvGetImg()` in `src/gv-core.js`)
1. `g.cover` explicit field
2. `g.consoleCover` explicit field
3. `IMG[g.t]` from the IMG map in `games.json`
4. Local file at `covers/<platform>/<slug>.jpg` (console platforms only: PS1/2/3, PSP, VITA, NDS, N3DS, WII, WIIU, NSW)
5. SVG fallback generated inline

### Modal hero image (Steam games only)
Uses `library_hero.jpg` from Steam CDN (falls back to `header.jpg`, then SVG). Portrait uses `library_600x900.jpg`.

### Filter/sort state
Lives entirely in module-level variables in `src/app.js`: `curGenre`, `curPlat`, `activeFlags` (Set), `curSort`, `listView`. All filters call `render()` which calls `getSorted()`.

## Adding/editing games

Edit `data/games.json` directly and refresh the browser. No build needed.

**Valid genre keys:** `open-world`, `action`, `shooter`, `rpg`, `coop`, `racing`, `strategy`, `platformer`, `fighting`, `sports`

**Valid platform keys:** `PC`, `PS1`, `PS2`, `PS3`, `PSP`, `VITA`, `NDS`, `N3DS`, `WII`, `WIIU`, `NSW`

**Valid flag values:** `must`, `owned`, `coop`, `online`, `solo`, `couch`, `party`, `classic`

## Scripts

| Script | Purpose |
|---|---|
| `scripts/sync-www.js` | Copies mobile app + shared core + data + styles into `www/` (Capacitor webDir). Run via `npm run sync:www` |
| `scripts/download-covers.js` | Downloads local cover images from a URL map JSON (`data/console-cover-urls.json` by default) into `covers/<platform>/` |
| `scripts/add-console-cover-metadata.js` / `.py` | Adds `consoleCover` fields to `games.json` entries |
| `scripts/export-console-covers.js` | Exports cover URL data |
| `scripts/fetch-thegamesdb-covers.js` | Fetches cover URLs from TheGamesDB API |
| `scripts/make-url-template.js` | Generates `data/console-cover-urls.template.json` |
| `scripts/cutover-build.js` | One-time migration script that extracted inline JS from `index.html` into `src/app.js` |

Run scripts with `node scripts/<name>.js`.
