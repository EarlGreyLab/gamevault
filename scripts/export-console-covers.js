const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','games.json'),'utf8'));
const out = [];
for (const g of data.GAMES || []) {
  if (g && typeof g === 'object' && g.consoleCover) {
    out.push(`${g.t} -> ${g.consoleCover}`);
  }
}
const outPath = path.join(__dirname,'..','data','console-cover-list.txt');
fs.writeFileSync(outPath, out.join('\n') + '\n', 'utf8');
console.log('Wrote', out.length, 'entries to', outPath);
