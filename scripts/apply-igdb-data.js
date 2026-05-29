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
    overwriteCover: args.includes('--overwrite-cover'),
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
  const { input, overwrite, overwriteCover, dryRun } = parseArgs();

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
      if (data.coverUrl && (overwrite || overwriteCover || !game.consoleCover))
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

    if (setIfBlank(game, 'consoleCover', data.coverUrl, overwrite || overwriteCover)) coversSet++;
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
