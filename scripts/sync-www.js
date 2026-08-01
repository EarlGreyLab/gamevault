// Syncs the mobile web app into www/ (the Capacitor webDir).
// Run after editing mobile.html, src/gv-core.js, styles, or game data:
//   node scripts/sync-www.js        (or: npm run sync:www)
// Then `npx cap sync` if the iOS shell should pick it up too.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

const copies = [
  ['mobile.html', 'index.html'],
  ['data/games.json', 'games.json'],
  ['mobile.css', 'mobile.css'],
  ['tokens.css', 'tokens.css'],
  ['src/gv-core.js', 'src/gv-core.js'],
];

for (const [from, to] of copies) {
  const dest = path.join(www, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, from), dest);
  console.log(`${from} -> www/${to}`);
}
console.log('www/ is in sync.');
