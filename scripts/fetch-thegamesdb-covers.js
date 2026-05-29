const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchJson(url, extraHeaders={}) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign({'User-Agent':'GameListFetcher/1.0','Accept':'application/json'}, extraHeaders);
    https.get(url, {headers}, (res) => {
      let data='';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function findBoxArt(title, apikey) {
  const q = encodeURIComponent(title);
  const url = `https://api.thegamesdb.net/Games/ByGameName?apikey=${apikey}&name=${q}`;
  try {
    // try multiple auth methods: query param (default), header 'apikey', header 'Authorization: Bearer'
    let res = await fetchJson(url);
    if (!res || !res.data || !res.data.games || !res.data.games.length) {
      res = await fetchJson(url.replace(/\?.*$/, '' ) + `?name=${q}`, {'apikey': apikey});
    }
    if (!res || !res.data || !res.data.games || !res.data.games.length) {
      res = await fetchJson(url.replace(/\?.*$/, '' ) + `?name=${q}`, {'Authorization': `Bearer ${apikey}`} );
    }
    if (!res || !res.data || !res.data.games || !res.data.games.length) return null;
    const game = res.data.games[0];
    // try to get boxart via ByGameID
    const idUrlBase = `https://api.thegamesdb.net/Games/ByGameID?id=${game.id}`;
    let r2 = await fetchJson(idUrlBase + `&apikey=${apikey}`);
    if (!r2 || !r2.data) r2 = await fetchJson(idUrlBase, {'apikey': apikey});
    if (!r2 || !r2.data) r2 = await fetchJson(idUrlBase, {'Authorization': `Bearer ${apikey}`});
    if (r2 && r2.data && r2.data.images && r2.data.base_url) {
      const base = r2.data.base_url.original || r2.data.base_url.medium || r2.data.base_url.thumb || '';
      // r2.data.images is keyed by game id
      const imgs = r2.data.images[game.id] || {};
      // prefer boxart
      const boxart = imgs.boxart || imgs.boxart_front || imgs.boxart_full || null;
      if (boxart && boxart.length) {
        // pick first
        const imgPath = boxart[0].filename || boxart[0];
        const full = base + imgPath;
        return full;
      }
    }
    // fallback: maybe res.data.games[0] has 'boxart'
    if (game.boxart) return game.boxart;
    return null;
  } catch (err) {
    return null;
  }
}

async function main() {
  const apikey = process.argv[2] || process.env.THEGAMESDB_KEY;
  if (!apikey) {
    console.error('Usage: node fetch-thegamesdb-covers.js <APIKEY>');
    process.exit(2);
  }
  const listPath = path.join(__dirname,'..','data','console-cover-list.txt');
  const lines = fs.readFileSync(listPath,'utf8').split(/\r?\n/).filter(Boolean);
  const template = {};
  // test first 12 entries for validation
  const testLines = lines.slice(0,12);
  for (const line of testLines) {
    const parts = line.split('->').map(s=>s.trim());
    if (parts.length!==2) continue;
    const title = parts[0];
    const dest = parts[1];
    process.stdout.write(`Querying: ${title} ... `);
    const url = await findBoxArt(title, apikey);
    if (url) {
      console.log('FOUND');
      template[dest] = url;
    } else {
      console.log('MISS');
      template[dest] = '';
    }
    // be gentle
    await new Promise(r => setTimeout(r, 600));
  }
  const outPath = path.join(__dirname,'..','data','console-cover-urls.partial.json');
  fs.writeFileSync(outPath, JSON.stringify(template, null, 2), 'utf8');
  console.log('Wrote partial mapping to', outPath);
}

main().catch(err=>{console.error(err); process.exit(1);});
