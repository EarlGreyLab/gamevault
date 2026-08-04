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
  ['vendor/zxing-browser.min.js', 'vendor/zxing-browser.min.js'],
];

// Gitignored, developer-supplied — skip silently if not present locally
// (see data/pricecharting-key.template.json) so sync:www still works for
// anyone who hasn't set up the barcode scanner feature.
const optionalCopies = [
  ['data/pricecharting-key.json', 'pricecharting-key.json'],
];

for (const [from, to] of copies) {
  const dest = path.join(www, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, from), dest);
  console.log(`${from} -> www/${to}`);
}

for (const [from, to] of optionalCopies) {
  const src = path.join(root, from);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(www, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`${from} -> www/${to}`);
}
console.log('www/ is in sync.');
