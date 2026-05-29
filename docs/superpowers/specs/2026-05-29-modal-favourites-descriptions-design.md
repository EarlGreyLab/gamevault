# Modal Improvements: Favourites & Steam Descriptions

**Date:** 2026-05-29  
**Status:** Approved

## Overview

Two independent improvements to the GAMEVAULT game card modal:

1. **Steam/template descriptions** — a one-shot Node.js script that enriches `games.json` with real descriptions fetched from the Steam Store API (free, no key), with template fallback for non-Steam games.
2. **Favourites** — a client-side favouriting system stored in `localStorage`, surfaced as a heart button in the modal, a ♥ badge on grid cards, a sidebar filter chip, and a topbar counter.

No backend, no new dependencies, no breaking changes.

---

## Feature 1: Description Script

### File
`scripts/fetch-steam-descriptions.js` (new)

### Behaviour
- Reads `data/games.json`
- For each game **with a `steamId`**: calls the Steam Store API:
  ```
  https://store.steampowered.com/api/appdetails?appids={id}&filters=short_description
  ```
  Free, no API key required. Writes the returned `short_description` into `g.d`.
- For each game **without a `steamId`** (console games): generates a template description from existing fields:
  ```
  A {year} {genre} game for {platform}. {sentence about flags if present.}
  ```
  Example: `"A 2001 action game for PS2. A classic title with co-op and couch play."`
- **`--skip-existing` flag**: if passed, skips any game whose `d` field is already non-empty. Protects manually written descriptions.
- Adds a **300ms delay** between Steam API calls to avoid rate-limiting.
- Falls back to template if the Steam API call fails or returns an empty string — logs a warning.
- Writes the full `games.json` back in place — preserving the top-level `IMG` map and any other top-level fields, only modifying `GAMES[*].d`.

### Usage
```bash
node scripts/fetch-steam-descriptions.js                 # overwrite all
node scripts/fetch-steam-descriptions.js --skip-existing # only fill blanks
```

### Data change
Only the `d` field of each game object in `games.json` is modified. No new fields added.

---

## Feature 2: Favourites

### Storage
- `localStorage` key: `gv-favourites`
- Format: JSON array of game title strings, e.g. `["Elden Ring", "Cyberpunk 2077"]`
- Loaded into a module-level `Set<string>` (`favourites`) at app startup
- Saved back to localStorage on every toggle

### Graceful degradation
If `localStorage` is unavailable, favourites work for the current session but do not persist. No error is shown.

### Touch points

#### 1. Modal heart button
- Location: `.modal-sidebar`, below the existing Steam/SteamDB links
- Two visual states:
  - **Unfavourited**: `♥ Favourite` — subtle outline style
  - **Favourited**: `♥ Favourited` — filled amber (`#fbbf24`) style
- On click: toggle game title in `favourites` Set → save to localStorage → call `render()` to refresh grid badges → update topbar counter
- Modal stays open

#### 2. Heart badge on grid cards
- A small `♥` overlay on the card cover image, top-left corner
- Styled similarly to the existing `.yr` year badge (dark pill, monospace)
- Colour: amber (`#fbbf24`)
- Only rendered when `favourites.has(g.t)` is true
- Position: **top-right** corner of the card image (bottom corners are taken by `.yr` and `.pb`)
- Rebuilt on every `render()` call — no separate update needed

#### 3. Sidebar filter chip
- Added to the **Mode** filter section in the sidebar (alongside Must, Owned, Classic, etc.)
- Markup: `<button class="chip" data-flag="favs">♥ Favs</button>`
- Active style: amber background (consistent with the flag colour scheme)
- Filter logic in `getSorted()`: add `if (fl === 'favs') { if (!favourites.has(g.t)) return false; }` to the existing `activeFlags` loop

#### 4. Topbar counter
- New `<div class="tstat">` element in the topbar stats row
- Shows: `♥ N` where N is `favourites.size`
- Updated by a new `refreshFavouritesStat()` helper called after every toggle and on initial load

### Files changed
| File | Change |
|---|---|
| `scripts/fetch-steam-descriptions.js` | New file |
| `src/app.js` | Favourites state + `buildCard()` badge + `openDetail()` button + `getSorted()` filter + topbar refresh |
| `index.html` | Topbar stat element + sidebar `♥ Favs` chip |

---

## Out of scope
- Exporting/importing favourites
- Syncing favourites across devices
- Any backend or server-side component
- Changes to genres, platforms, or any other filter
