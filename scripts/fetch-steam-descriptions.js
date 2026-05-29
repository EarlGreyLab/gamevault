// scripts/fetch-steam-descriptions.js
const fs   = require('fs');
const path = require('path');

const DATA_PATH     = path.join(__dirname, '..', 'data', 'games.json');
const SKIP_EXISTING = process.argv.includes('--skip-existing');
const DELAY_MS      = 300; // Steam's unofficial API; increase to 1000+ if you hit 429s

const PLAT_NAMES = {
  PC:'PC', PS1:'PS1', PS2:'PS2', PS3:'PS3', PSP:'PSP',
  VITA:'PS Vita', NDS:'Nintendo DS', N3DS:'Nintendo 3DS',
  WII:'Wii', WIIU:'Wii U', NSW:'Nintendo Switch',
};

const FLAG_SENTENCES = {
  must:   'A must-play title.',
  classic:'A beloved classic.',
  coop:   'Features co-op play.',
  couch:  'Great for couch co-op.',
  party:  'A fun party game.',
  online: 'Supports online play.',
  solo:   'Best enjoyed solo.',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateTemplate(g) {
  const genre = g.g || 'game';
  const year  = g.y || 'Unknown year';
  const plat  = PLAT_NAMES[g.p] || g.p || 'unknown platform';
  const flags = (g.f || []).filter(f => FLAG_SENTENCES[f]);
  const extra = flags.length ? ' ' + FLAG_SENTENCES[flags[0]] : '';
  return `A ${year} ${genre} game for ${plat}.${extra}`;
}

async function fetchSteamDescription(steamId) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${steamId}&filters=short_description`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data  = await res.json();
  const entry = data[String(steamId)];
  if (!entry?.success) throw new Error('success:false');
  return (entry.data?.short_description || '').trim();
}

async function main() {
  const raw     = fs.readFileSync(DATA_PATH, 'utf8');
  const payload = JSON.parse(raw);
  const games   = payload.GAMES;

  let updated = 0, skipped = 0;

  for (const g of games) {
    if (SKIP_EXISTING && g.d && g.d.trim()) {
      skipped++;
      continue;
    }

    if (g.steamId) {
      try {
        await sleep(DELAY_MS);
        const desc = await fetchSteamDescription(g.steamId);
        g.d = desc || generateTemplate(g);
        if (!desc) console.warn(`⚠  Empty Steam desc, used template: ${g.t}`);
        else        console.log(`✓  Steam: ${g.t}`);
      } catch (err) {
        g.d = generateTemplate(g);
        console.warn(`⚠  Steam failed (${err.message}), used template: ${g.t}`);
      }
    } else {
      g.d = generateTemplate(g);
      console.log(`◆  Template: ${g.t}`);
    }
    updated++;
  }

  if (updated === 0) {
    console.log(`\nDone — nothing to update (skipped: ${skipped})`);
    return;
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\nDone — updated: ${updated}, skipped: ${skipped}`);
}

main().catch(err => { console.error(err); process.exit(1); });
