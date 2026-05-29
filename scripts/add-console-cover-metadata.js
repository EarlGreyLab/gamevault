const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'data', 'games.json');
const text = fs.readFileSync(file, 'utf8');
const data = JSON.parse(text);
const consolePlatforms = new Set(['PS1', 'PS2', 'PS3', 'PSP', 'VITA', 'NDS', 'N3DS', 'WII', 'WIIU', 'NSW']);
function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[’'"?!.:,\/&]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
let updated = 0;
for (const game of data.GAMES || []) {
  if (!game || typeof game !== 'object') continue;
  const p = String(game.p || 'PC').toUpperCase();
  if (consolePlatforms.has(p) && !game.cover && !game.consoleCover) {
    game.consoleCover = `covers/${p.toLowerCase()}/${slug(game.t)}.jpg`;
    updated += 1;
  }
}
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Updated ${updated} console games with consoleCover metadata`);
