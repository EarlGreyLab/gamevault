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
  if (longer.length === 0) return 1.0;
  return (longer.length - levenshtein(longer, a.length >= b.length ? b : a)) / longer.length;
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
