# IGDB Enrichment — Design Spec

**Date:** 2026-05-29  
**Status:** Approved

## Goal

Enrich all console game entries in `data/games.json` with cover images and metadata from the IGDB API (authenticated via Twitch OAuth2). Cover URLs are stored directly in the `consoleCover` field — no local download required.

## Scope

Console platforms: PS1, PS2, PS3, PSP, VITA, NDS, N3DS, WII, WIIU, NSW (~328 games in `data/console-cover-list.txt`).

PC/Steam games are out of scope — they already have covers via the Steam CDN.

## Architecture

Two new scripts in `scripts/`:

```
scripts/fetch-igdb-data.js   ← authenticates + queries IGDB, writes intermediate file
scripts/apply-igdb-data.js   ← patches games.json from intermediate file
```

Workflow:

```
games.json (console games)
    ↓
node scripts/fetch-igdb-data.js --client-id X --client-secret Y
    ↓
data/igdb-enrichment.json   ← auditable, manually editable before applying
    ↓
node scripts/apply-igdb-data.js [--overwrite]
    ↓
games.json (enriched: consoleCover + d + y + igdbRating)
```

## Script 1: `fetch-igdb-data.js`

### Usage

```bash
node scripts/fetch-igdb-data.js --client-id <ID> --client-secret <SECRET>
# --output data/igdb-enrichment.json   (default)
# --platforms PS1,PS2,NSW              (default: all console platforms)
```

### Steps

1. Fetch OAuth2 token: `POST https://id.twitch.tv/oauth2/token?client_id=X&client_secret=Y&grant_type=client_credentials`
2. Filter `games.json` for console platform games
3. For each game: `POST https://api.igdb.com/v4/games` with Apicalypse query — title search + platform filter
4. Select best match: first result with title similarity ≥ 60% (Levenshtein-based)
5. Build cover URL: `https://images.igdb.com/igdb/image/upload/t_cover_big/{image_id}.jpg`
6. Write result to output file; print live progress per game

### IGDB Platform IDs

| App key | IGDB ID |
|---------|---------|
| PS1     | 7       |
| PS2     | 8       |
| PS3     | 9       |
| PSP     | 38      |
| VITA    | 46      |
| NDS     | 20      |
| N3DS    | 37      |
| WII     | 5       |
| WIIU    | 41      |
| NSW     | 130     |

### Rate Limiting

250ms pause between requests (stays under the free-tier 4 req/s limit). On HTTP 429: retry up to 3 times with 1s backoff.

### Title Normalisation

Many titles in `games.json` include platform suffixes for disambiguation (e.g. `"God of War (PS2)"`, `"Crash Team Racing (PS1)"`). These suffixes are stripped before searching IGDB — the platform filter in the query handles disambiguation instead.

Stripping rule: remove trailing `(PS1)`, `(PS2)`, `(PS3)`, `(PSP)`, `(Vita)`, `(Wii)`, `(Wii U)`, `(3DS)`, `(Switch)`, `(NDS)`, and similar patterns.

### IGDB Query (Apicalypse)

```
search "Game Title";
fields name, cover.image_id, summary, first_release_date, rating, rating_count;
where platforms = (X);
limit 5;
```

## Script 2: `apply-igdb-data.js`

### Usage

```bash
node scripts/apply-igdb-data.js
# --input data/igdb-enrichment.json   (default)
# --overwrite                          (overwrite existing values; default: fill blanks only)
# --dry-run                            (print changes without writing)
```

### Steps

1. Read `igdb-enrichment.json` and `games.json`
2. For each console game in `games.json`, look up by title (`t` field):
   - Set `consoleCover` if blank (or `--overwrite`)
   - Set `d` if blank (or `--overwrite`)
   - Set `y` if blank (or `--overwrite`)
   - Set `igdbRating` unconditionally if present (new field, non-destructive)
3. Write `games.json` atomically (temp file → rename)
4. Print summary: X covers set, Y descriptions, Z skipped (unmatched)

### Fields never touched

`g` (genre), `f` (flags), `vita`, `p`, `t`, `steamId`, manually set `cover` fields.

## Intermediate Format: `data/igdb-enrichment.json`

Keyed by game title (matches `t` field in `games.json`):

```json
{
  "Crash Bandicoot Trilogy": {
    "igdbId": 123,
    "igdbTitle": "Crash Bandicoot N. Sane Trilogy",
    "coverUrl": "https://images.igdb.com/igdb/image/upload/t_cover_big/abc123.jpg",
    "summary": "Three remastered PS1 platformers...",
    "year": 1996,
    "rating": 84.5,
    "matched": true
  },
  "Driver (PS1)": {
    "matched": false,
    "reason": "no results for platform PS1"
  }
}
```

`matched: false` entries can be manually filled with a `coverUrl` before running `apply-igdb-data.js` — the apply script skips unmatched entries otherwise.

## Error Handling

| Situation | Behavior |
|-----------|----------|
| No IGDB match | `matched: false` + `reason`, script continues |
| Title similarity < 60% | `matched: false` + `reason: "low confidence (X%)"` |
| HTTP 429 rate limit | Retry up to 3× with 1s pause |
| Network error | `matched: false` + `reason: error message` |
| `games.json` write failure | Abort; source file unchanged (atomic write) |

## Fields Written to `games.json`

| Field | Source | Condition |
|-------|--------|-----------|
| `consoleCover` | IGDB cover URL (`t_cover_big`) | Blank only (or `--overwrite`) |
| `d` | IGDB `summary` | Blank only (or `--overwrite`) |
| `y` | IGDB `first_release_date` (year) | Blank only (or `--overwrite`) |
| `igdbRating` | IGDB `rating` (0–100) | Always if present (new field) |
