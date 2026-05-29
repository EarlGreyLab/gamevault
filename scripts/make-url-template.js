const fs = require('fs');
const path = require('path');
const inPath = path.join(__dirname,'..','data','console-cover-list.txt');
const outPath = path.join(__dirname,'..','data','console-cover-urls.template.json');
if (!fs.existsSync(inPath)) {
  console.error('Input list not found:', inPath);
  process.exit(2);
}
const lines = fs.readFileSync(inPath,'utf8').split(/\r?\n/).filter(Boolean);
const obj = {};
for (const line of lines) {
  const parts = line.split('->').map(s=>s.trim());
  if (parts.length===2) obj[parts[1]] = "";
}
fs.writeFileSync(outPath, JSON.stringify(obj, null, 2), 'utf8');
console.log('Wrote template to', outPath, 'with', Object.keys(obj).length, 'keys');
