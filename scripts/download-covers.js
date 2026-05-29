const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // follow redirect
        return resolve(download(res.headers.location, dest));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      ensureDir(path.dirname(dest));
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', (err) => reject(err));
    });
    req.on('error', reject);
  });
}

async function main() {
  const mapPath = process.argv[2] || path.join(__dirname,'..','data','console-cover-urls.json');
  if (!fs.existsSync(mapPath)) {
    console.error('Mapping file not found:', mapPath);
    console.error('Create a JSON file mapping target paths to direct image URLs:');
    console.error('{"covers/ps1/crash-bandicoot-trilogy.jpg":"https://.../image.jpg", ...}');
    process.exit(2);
  }
  const mapping = JSON.parse(fs.readFileSync(mapPath,'utf8'));
  const entries = Object.entries(mapping);
  console.log('Found', entries.length, 'images to download');
  let success = 0;
  for (const [destRel, url] of entries) {
    const dest = path.join(__dirname,'..', destRel.replace(/^\//,''));
    try {
      process.stdout.write(`Downloading ${url} -> ${destRel} ... `);
      await download(url, dest);
      console.log('OK');
      success++;
    } catch (err) {
      console.log('ERR', err.message);
    }
  }
  console.log(`Done: ${success}/${entries.length} downloaded`);
}

main().catch(err => { console.error(err); process.exit(1); });
