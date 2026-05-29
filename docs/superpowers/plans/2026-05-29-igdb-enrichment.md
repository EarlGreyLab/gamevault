# IGDB Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two scripts that fetch IGDB cover URLs + metadata for all console games and patch them into `games.json`.

**Architecture:** `fetch-igdb-data.js` authenticates with Twitch OAuth2, queries IGDB for each console game in `games.json`, and writes an auditable intermediate `data/igdb-enrichment.json`. `apply-igdb-data.js` reads that file and patches `games.json` in-place (fill-blanks-only by default, `--overwrite` to force, `--dry-run` to preview).

**Tech Stack:** Node.js built-ins only (`fs`, `path`, `https`, `os`) — no npm packages needed, same as existing scripts.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `scripts/fetch-igdb-data.js` | Create | Auth, search IGDB, write `data/igdb-enrichment.json` |
| `scripts/apply-igdb-data.js` | Create | Read enrichment JSON, patch `games.json` atomically |
| `data/igdb-enrichment.json` | Generated | Intermediate: title → {coverUrl, summary, year, rating} |

---

## Task 1: Create `scripts/fetch-igdb-data.js`

**Files:**
- Create: `scripts/fetch-igdb-data.js`

- [ ] **Step 1: Create the file with this complete implementation**

```javascript
const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Constants ─────────────────────────────────────────────────────────────────

const IGDB_PLATFORM_IDS = {
  PS1: 7, PS2: 8, PS3: 9, PSP: 38, VITA: 46,
  NDS: 20, N3DS: 37, WII: 5, WIIU: 41, NSW: 130
};

const COVER_BASE = 'https://images.igdb.com/igdb/image/upload/t_cover_big/';
const SIMILARITY_THRESHOLD = 0.6;
const RATE_LIMIT_DELAY_MS = 250;

// Strips trailing platform disambiguation like "(PS2)", "(Wii)", "(Switch)"
const PLATFORM_SUFFIX_RE = /\s*\((PS[123]|PSP|Vita|Wii U|Wii|N3DS|3DS|Switch|NDS|NSW|WIIU)\)\s*$/i;

// ── OAuth2 ────────────────────────────────────────────────────────────────────

function getAccessToken(clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
    const req = https.request(url, { method: 'POST' }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) resolve(json.access_token);
          else reject(new Error(`Auth failed: ${data}`));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Title helpers ─────────────────────────────────────────────────────────────

function normalizeTitle(title) {
  return title.replace(PLATFORM_SUFFIX_RE, '').trim();
}

function levenshtein(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) dp[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      dp[i][j] = b[i - 1] === a[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[b.length][a.length];
}

function titleSimilarity(a, b) {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1.0;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (longer.length === 0) return 1.0;
  return (longer.length - levenshtein(longer, shorter)) / longer.length;
}

// ── IGDB search ───────────────────────────────────────────────────────────────

function igdbPost(body, token, clientId) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.igdb.com',
      path: '/v4/games',
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 429) { resolve({ rateLimited: true }); return; }
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function searchGame(title, platformId, token, clientId, retries = 3) {
  const normalized = normalizeTitle(title);
  const safe = normalized.replace(/"/g, '');
  const body = `search "${safe}"; fields name,cover.image_id,summary,first_release_date,rating; where platforms = (${platformId}); limit 5;`;

  for (let attempt = 0; attempt < retries; attempt++) {
    let results;
    try {
      results = await igdbPost(body, token, clientId);
    } catch (err) {
      return { matched: false, reason: err.message };
    }

    if (results.rateLimited) {
      await delay(1000);
      continue;
    }

    if (!Array.isArray(results) || results.length === 0) {
      return { matched: false, reason: 'no results' };
    }

    let best = null;
    let bestScore = 0;
    for (const game of results) {
      const score = titleSimilarity(normalized, game.name || '');
      if (score > bestScore) { bestScore = score; best = game; }
    }

    if (bestScore < SIMILARITY_THRESHOLD || !best) {
      return { matched: false, reason: `low confidence (${Math.round(bestScore * 100)}%)` };
    }

    const coverUrl = best.cover && best.cover.image_id
      ? `${COVER_BASE}${best.cover.image_id}.jpg`
      : null;

    const year = best.first_release_date
      ? new Date(best.first_release_date * 1000).getFullYear()
      : null;

    return {
      matched: true,
      igdbId: best.id,
      igdbTitle: best.name,
      coverUrl,
      summary: best.summary || null,
      year,
      rating: best.rating !== undefined ? Math.round(best.rating * 10) / 10 : null
    };
  }

  return { matched: false, reason: 'max retries exceeded (rate limited)' };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = flag => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  const clientId = get('--client-id');
  const clientSecret = get('--client-secret');
  const output = get('--output') || path.join(__dirname, '..', 'data', 'igdb-enrichment.json');
  const platformFilter = get('--platforms')
    ? get('--platforms').toUpperCase().split(',').map(s => s.trim())
    : null;
  return { clientId, clientSecret, output, platformFilter };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { clientId, clientSecret, output, platformFilter } = parseArgs();

  if (!clientId || !clientSecret) {
    console.error('Usage: node scripts/fetch-igdb-data.js --client-id <ID> --client-secret <SECRET>');
    console.error('       [--output data/igdb-enrichment.json] [--platforms PS1,PS2,NSW]');
    process.exit(1);
  }

  const gamesPath = path.join(__dirname, '..', 'data', 'games.json');
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
  const consolePlatforms = new Set(Object.keys(IGDB_PLATFORM_IDS));

  const consoleGames = gamesData.GAMES.filter(g => {
    const plat = (g.p || 'PC').toUpperCase();
    if (!consolePlatforms.has(plat)) return false;
    if (platformFilter && !platformFilter.includes(plat)) return false;
    return true;
  });

  console.log(`Found ${consoleGames.length} console games to process`);

  // Load existing enrichment to allow resuming interrupted runs
  let enrichment = {};
  if (fs.existsSync(output)) {
    try { enrichment = JSON.parse(fs.readFileSync(output, 'utf8')); } catch (_) {}
    const alreadyDone = Object.keys(enrichment).length;
    if (alreadyDone > 0) console.log(`Resuming — ${alreadyDone} already in enrichment file`);
  }

  console.log('Fetching Twitch access token...');
  const token = await getAccessToken(clientId, clientSecret);
  console.log('Token obtained.\n');

  let matched = 0, unmatched = 0;

  for (let i = 0; i < consoleGames.length; i++) {
    const game = consoleGames[i];
    const plat = (game.p || 'PC').toUpperCase();
    const platformId = IGDB_PLATFORM_IDS[plat];

    if (enrichment[game.t] !== undefined) {
      if (enrichment[game.t].matched) matched++; else unmatched++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${consoleGames.length}] ${game.t} (${plat}) ... `);

    const result = await searchGame(game.t, platformId, token, clientId);
    enrichment[game.t] = result;

    if (result.matched) {
      matched++;
      console.log(`MATCH → ${result.igdbTitle}${result.coverUrl ? ' (cover ✓)' : ' (no cover)'}`);
    } else {
      unmatched++;
      console.log(`MISS — ${result.reason}`);
    }

    // Write after every entry so the run is resumable on crash
    fs.writeFileSync(output, JSON.stringify(enrichment, null, 2), 'utf8');

    if (i < consoleGames.length - 1) await delay(RATE_LIMIT_DELAY_MS);
  }

  console.log(`\nDone: ${matched} matched, ${unmatched} unmatched`);
  console.log(`Wrote ${output}`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Verify usage error works**

Run:
```
node scripts/fetch-igdb-data.js
```
Expected output:
```
Usage: node scripts/fetch-igdb-data.js --client-id <ID> --client-secret <SECRET>
       [--output data/igdb-enrichment.json] [--platforms PS1,PS2,NSW]
```

- [ ] **Step 3: Commit**

```
git add scripts/fetch-igdb-data.js
git commit -m "feat: add fetch-igdb-data.js — query IGDB for console game covers + metadata"
```

---

## Task 2: Smoke-test `fetch-igdb-data.js` with 3 PS1 games

**Files:**
- Read: `data/igdb-enrichment.json` (created by script)

- [ ] **Step 1: Run fetch for PS1 only**

Replace `<CLIENT_ID>` and `<CLIENT_SECRET>` with your actual Twitch credentials:
```
node scripts/fetch-igdb-data.js --client-id <CLIENT_ID> --client-secret <CLIENT_SECRET> --platforms PS1
```

Expected output (example):
```
Found 14 console games to process
Fetching Twitch access token...
Token obtained.

[1/14] Crash Bandicoot Trilogy (PS1) ... MATCH → Crash Bandicoot N. Sane Trilogy (cover ✓)
[2/14] Spyro the Dragon Trilogy (PS1) ... MATCH → Spyro Reignited Trilogy (cover ✓)
[3/14] Metal Gear Solid (PS1) ... MATCH → Metal Gear Solid (cover ✓)
...
Done: 13 matched, 1 unmatched
Wrote data/igdb-enrichment.json
```

- [ ] **Step 2: Inspect the enrichment file**

Open `data/igdb-enrichment.json` and verify:
- `matched: true` entries have a `coverUrl` starting with `https://images.igdb.com/`
- `summary` fields contain actual text
- `matched: false` entries have a `reason`

Example of a correct matched entry:
```json
"Metal Gear Solid": {
  "matched": true,
  "igdbId": 371,
  "igdbTitle": "Metal Gear Solid",
  "coverUrl": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg",
  "summary": "A special forces operative...",
  "year": 1998,
  "rating": 91.3
}
```

- [ ] **Step 3: Delete `data/igdb-enrichment.json` to reset for the full run**

```
del data\igdb-enrichment.json
```
(Or keep it — the full run will resume from where it left off.)

---

## Task 3: Full fetch run for all console platforms

- [ ] **Step 1: Run for all platforms (~328 games, ~2–3 minutes)**

```
node scripts/fetch-igdb-data.js --client-id <CLIENT_ID> --client-secret <CLIENT_SECRET>
```

Expected final line:
```
Done: ~300 matched, ~28 unmatched
Wrote data/igdb-enrichment.json
```

The script saves after every entry — if interrupted, re-run the same command and it will skip already-processed games.

- [ ] **Step 2: Review unmatched entries**

```
node -e "const e=require('./data/igdb-enrichment.json'); Object.entries(e).filter(([,v])=>!v.matched).forEach(([k,v])=>console.log(k,'—',v.reason))"
```

For any important unmatched game, you can manually add a `coverUrl` to `data/igdb-enrichment.json`:
```json
"Driver (PS1)": {
  "matched": true,
  "coverUrl": "https://images.igdb.com/igdb/image/upload/t_cover_big/<image_id>.jpg",
  "summary": null,
  "year": null,
  "rating": null
}
```

- [ ] **Step 3: Commit the enrichment file**

```
git add data/igdb-enrichment.json
git commit -m "data: add igdb-enrichment.json with cover URLs + metadata for console games"
```

---

## Task 4: Create `scripts/apply-igdb-data.js`

**Files:**
- Create: `scripts/apply-igdb-data.js`

- [ ] **Step 1: Create the file with this complete implementation**

```javascript
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const get = flag => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  return {
    input: get('--input') || path.join(__dirname, '..', 'data', 'igdb-enrichment.json'),
    overwrite: args.includes('--overwrite'),
    dryRun: args.includes('--dry-run')
  };
}

// Sets obj[key] = value only if the field is blank (or --overwrite).
// Returns true if the value was actually set.
function setIfBlank(obj, key, value, overwrite) {
  if (value === undefined || value === null) return false;
  const current = obj[key];
  if (!overwrite && current !== undefined && current !== null && current !== '') return false;
  obj[key] = value;
  return true;
}

const CONSOLE_PLATFORMS = new Set(['PS1', 'PS2', 'PS3', 'PSP', 'VITA', 'NDS', 'N3DS', 'WII', 'WIIU', 'NSW']);

async function main() {
  const { input, overwrite, dryRun } = parseArgs();

  if (!fs.existsSync(input)) {
    console.error(`Enrichment file not found: ${input}`);
    console.error('Run scripts/fetch-igdb-data.js first.');
    process.exit(1);
  }

  const enrichment = JSON.parse(fs.readFileSync(input, 'utf8'));
  const gamesPath = path.join(__dirname, '..', 'data', 'games.json');
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));

  if (dryRun) console.log('--- DRY RUN (no changes written) ---\n');

  let coversSet = 0, descriptionsSet = 0, yearsSet = 0, ratingsSet = 0, skipped = 0;

  for (const game of gamesData.GAMES) {
    const plat = (game.p || 'PC').toUpperCase();
    if (!CONSOLE_PLATFORMS.has(plat)) continue;

    const data = enrichment[game.t];
    if (!data || !data.matched) { skipped++; continue; }

    if (dryRun) {
      const changes = [];
      if (data.coverUrl && (overwrite || !game.consoleCover))
        changes.push(`consoleCover → ${data.coverUrl}`);
      if (data.summary && (overwrite || !game.d))
        changes.push(`d → "${data.summary.slice(0, 80)}..."`);
      if (data.year && (overwrite || !game.y))
        changes.push(`y → ${data.year}`);
      if (data.rating !== null && data.rating !== undefined)
        changes.push(`igdbRating → ${data.rating}`);
      if (changes.length) {
        console.log(`${game.t}:`);
        changes.forEach(c => console.log(`  ${c}`));
      }
      continue;
    }

    if (setIfBlank(game, 'consoleCover', data.coverUrl, overwrite)) coversSet++;
    if (setIfBlank(game, 'd', data.summary, overwrite)) descriptionsSet++;
    if (setIfBlank(game, 'y', data.year, overwrite)) yearsSet++;
    if (data.rating !== null && data.rating !== undefined) {
      game.igdbRating = data.rating;
      ratingsSet++;
    }
  }

  if (dryRun) {
    console.log('\n(dry-run — no changes written)');
    return;
  }

  // Atomic write: temp file in same directory as games.json (cross-drive rename fails on Windows)
  const tmp = path.join(path.dirname(gamesPath), `games-igdb-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify(gamesData, null, 2), 'utf8');
  fs.renameSync(tmp, gamesPath);

  console.log('Applied to games.json:');
  console.log(`  ${coversSet} consoleCover URLs set`);
  console.log(`  ${descriptionsSet} descriptions (d) set`);
  console.log(`  ${yearsSet} years (y) set`);
  console.log(`  ${ratingsSet} IGDB ratings added`);
  console.log(`  ${skipped} games skipped (unmatched or missing from enrichment)`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Verify usage error for missing enrichment**

First delete or rename `data/igdb-enrichment.json` temporarily, then run:
```
node scripts/apply-igdb-data.js --input data/nonexistent.json
```
Expected:
```
Enrichment file not found: data/nonexistent.json
Run scripts/fetch-igdb-data.js first.
```
Restore the enrichment file afterwards.

- [ ] **Step 3: Commit**

```
git add scripts/apply-igdb-data.js
git commit -m "feat: add apply-igdb-data.js — patch games.json from IGDB enrichment"
```

---

## Task 5: Apply enrichment to `games.json`

- [ ] **Step 1: Dry-run to preview changes**

```
node scripts/apply-igdb-data.js --dry-run
```

Expected output (first few lines):
```
--- DRY RUN (no changes written) ---

Crash Bandicoot Trilogy:
  consoleCover → https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg
  d → "Three iconic platforming games remastered in HD..."
  y → 1996
  igdbRating → 84.5
...

(dry-run — no changes written)
```

Check that the changes look correct before proceeding.

- [ ] **Step 2: Apply for real**

```
node scripts/apply-igdb-data.js
```

Expected output:
```
Applied to games.json:
  ~300 consoleCover URLs set
  ~280 descriptions (d) set
  ~290 years (y) set
  ~300 IGDB ratings added
  ~28 games skipped (unmatched or missing from enrichment)
```

- [ ] **Step 3: Verify in the browser**

Start the dev server:
```
npm start
```

Open `http://localhost:3000` and check:
- Filter by a console platform (e.g. PS1) — game cards should show IGDB cover art
- Click a card to open the modal — description should appear in the `d` field area
- Check a known game like "Metal Gear Solid" — cover should be a box art image, not the SVG fallback

- [ ] **Step 4: Commit**

```
git add data/games.json
git commit -m "data: enrich console games with IGDB covers, descriptions, and ratings"
```
