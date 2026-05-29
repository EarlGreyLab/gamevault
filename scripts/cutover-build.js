const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const start = html.indexOf('<script>') + 8;
const end = html.indexOf('</script>', start);
let js = html.slice(start, end);

js = js.replace(/const S=[\s\S]*?^};$/m, 'const IMG = {};');
js = js.replace(
  /const GAMES=\[[\s\S]*?\];\s*\n\nconst DATA_URL/,
  'const GAMES = [];\n\nconst DATA_URL'
);
js = js.replace(
  /const DATA_URL = 'data\/games\.json';\s*const STRICT_EXTERNAL_DATA[\s\S]*?const IS_FILE_PROTOCOL[^\n]*\n/,
  "const DATA_URL = 'data/games.json';\nlet dataSource = 'loading';\nlet dataReady = false;\n"
);
js = js.replace(/\/\/ Transitional helper[\s\S]*?^refreshHeaderStats\(\);\s*$/m, '');

const newBootstrap = `function showDataLoadError(reason) {
  dataReady = false;
  dataSource = 'error';
  const grid = document.getElementById('GRID');
  grid.innerHTML = '<div class="empty"><span>⚠️</span><div style="max-width:520px;margin:0 auto;line-height:1.6">' +
    '<strong>Could not load game data.</strong><br><br>' +
    reason + '<br><br>' +
    '<code style="color:var(--acc)">data/games.json</code> is required in JSON-only mode.' +
    '</div></div>';
  document.getElementById('sTotal').textContent = '0';
  document.getElementById('sMust').textContent = '0';
  document.getElementById('sVita').textContent = '0';
  document.getElementById('sCount').textContent = '0';
}

async function bootstrap() {
  const loaded = await tryLoadExternalData();
  if (!loaded) {
    const fileHint = window.location.protocol === 'file:'
      ? 'You opened this page via <code>file://</code>. Browsers block loading local JSON that way.<br>Run a local server from the repo root, for example: <code>npx serve .</code> or <code>python -m http.server</code>, then open <code>http://localhost:...</code>.'
      : 'Check that <code>data/games.json</code> exists and is valid JSON.';
    showDataLoadError(fileHint);
    console.error('GAMEVAULT: failed to load data/games.json');
    return;
  }
  dataReady = true;
  refreshHeaderStats();
  render();
  console.info('GAMEVAULT data source: ' + dataSource + ' (' + GAMES.length + ' games)');
}`;

js = js.replace(/async function bootstrap\(\)[\s\S]*?^bootstrap\(\);/m, newBootstrap);
js = js.replace('function render() {', 'function render() {\n  if (!dataReady) return;');

const srcDir = path.join(root, 'src');
fs.mkdirSync(srcDir, { recursive: true });
fs.writeFileSync(path.join(srcDir, 'app.js'), js.trim() + '\n');

const slim = html.replace(
  /<script>[\s\S]*<\/script>\s*<\/body>\s*<\/html>[\s\S]*/,
  '<script type="module" src="src/app.js"></script>\n</body>\n</html>\n'
);
fs.writeFileSync(htmlPath, slim);

console.log('Wrote src/app.js (' + fs.statSync(path.join(srcDir, 'app.js')).size + ' bytes)');
console.log('Wrote index.html (' + slim.split('\n').length + ' lines)');
