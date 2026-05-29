# Modal Improvements: Favourites & Steam Descriptions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Steam/template description enrichment script and a client-side favourites system (heart button in modal, ♥ badge on cards, sidebar filter chip, topbar counter).

**Architecture:** The script is a standalone Node.js CLI that reads/writes `data/games.json` directly. The favourites feature is pure vanilla JS — a module-level `Set` backed by `localStorage`, wired into the existing `render()` / `getSorted()` / `openDetail()` / `buildCard()` functions already in `src/app.js`.

**Tech Stack:** Node.js 18+ (native fetch), vanilla JS, no new dependencies.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/fetch-steam-descriptions.js` | **Create** | Fetches Steam descriptions; generates templates for non-Steam games; writes `data/games.json` |
| `src/app.js` | **Modify** | Favourites Set + localStorage helpers + refreshFavouritesStat + getSorted filter + buildCard badge + openDetail button |
| `index.html` | **Modify** | Topbar `♥ N` counter element + sidebar `♥ Favs` chip + CSS for fav badge and fav button |

---

## Task 1: Description Script

**Files:**
- Create: `scripts/fetch-steam-descriptions.js`

- [ ] **Step 1: Create the script file**

```js
// scripts/fetch-steam-descriptions.js
const fs   = require('fs');
const path = require('path');

const DATA_PATH     = path.join(__dirname, '..', 'data', 'games.json');
const SKIP_EXISTING = process.argv.includes('--skip-existing');
const DELAY_MS      = 300;

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

  fs.writeFileSync(DATA_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\nDone — updated: ${updated}, skipped: ${skipped}`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Smoke-test the script with --skip-existing (safe — won't overwrite anything)**

```bash
node scripts/fetch-steam-descriptions.js --skip-existing
```

Expected output: lines like `✓  Steam: Cyberpunk 2077` or `◆  Template: ...`, then `Done — updated: N, skipped: M`. Open `data/games.json` and verify some `d` fields are populated. No entries with previously non-empty `d` should be changed.

- [ ] **Step 3: Commit**

```bash
git add scripts/fetch-steam-descriptions.js data/games.json
git commit -m "feat: add fetch-steam-descriptions script with template fallback"
```

---

## Task 2: Favourites State + Topbar Counter

**Files:**
- Modify: `src/app.js` — add after the existing state block (line ~84)
- Modify: `index.html` — add one `<div class="tstat">` to topbar stats, add CSS

- [ ] **Step 1: Add favourites state and helpers to `src/app.js`**

Find the line:
```js
let curSort = 'default', listView = false;
```

Add directly after it:
```js
// ── FAVOURITES ────────────────────────────────────────────────────────────
let favourites = new Set();
try {
  const _stored = localStorage.getItem('gv-favourites');
  if (_stored) favourites = new Set(JSON.parse(_stored));
} catch {}

function saveFavourites() {
  try { localStorage.setItem('gv-favourites', JSON.stringify([...favourites])); } catch {}
}

function refreshFavouritesStat() {
  const el = document.getElementById('sFavs');
  if (el) el.textContent = favourites.size;
}
```

- [ ] **Step 2: Call `refreshFavouritesStat()` at bootstrap time**

In `src/app.js`, find the `bootstrap()` function. After the existing call to `refreshHeaderStats()`, add:
```js
refreshFavouritesStat();
```

So the block looks like:
```js
  dataReady = true;
  refreshHeaderStats();
  refreshFavouritesStat();
  render();
```

- [ ] **Step 3: Add the topbar counter element to `index.html`**

Find the topbar stats row:
```html
  <div class="tstat">showing <span class="tstat-num" id="sCount">0</span></div>
```

Add directly after it (still inside `.topbar-stats`):
```html
  <div class="tstat"><span class="tstat-num" id="sFavs">0</span> ♥</div>
```

- [ ] **Step 4: Verify in browser**

Run `npm start`, open `http://localhost:3000`. The topbar should show a `0 ♥` counter. Open DevTools → Application → Local Storage → clear `gv-favourites` if it exists, reload — counter should still show `0`. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/app.js index.html
git commit -m "feat: add favourites state with localStorage persistence and topbar counter"
```

---

## Task 3: Sidebar Filter Chip + getSorted Filter

**Files:**
- Modify: `index.html` — add chip to Mode section, add CSS for active state
- Modify: `src/app.js` — add `favs` to FL map, add filter branch in `getSorted()`

- [ ] **Step 1: Add the chip to `index.html` Mode section**

Find the Mode chips block (inside `#FF`):
```html
          <button class="chip" data-flag="vita_warn">⚠️ Vita±</button>
```

Add directly after it:
```html
          <button class="chip" data-flag="favs">♥ Favs</button>
```

- [ ] **Step 2: Add active chip style to `index.html` CSS**

Find this block in the `<style>` section:
```css
.chip[data-flag="vita_warn"].active{background:var(--ylw);color:var(--bg)}
```

Add directly after:
```css
.chip[data-flag="favs"].active{background:var(--ylw);color:var(--bg)}
```

- [ ] **Step 3: Add `favs` to the FL label map in `src/app.js`**

Find:
```js
const FL = { must:'Must Play', owned:'Owned', classic:'Classic', couch:'Couch',
             party:'Party', coop:'Co-op', online:'Online', solo:'Solo',
             vita:'Vita ok', vita_warn:'Vita±' };
```

Replace with:
```js
const FL = { must:'Must Play', owned:'Owned', classic:'Classic', couch:'Couch',
             party:'Party', coop:'Co-op', online:'Online', solo:'Solo',
             vita:'Vita ok', vita_warn:'Vita±', favs:'Favourites' };
```

- [ ] **Step 4: Add filter branch in `getSorted()` in `src/app.js`**

Find the `activeFlags` loop inside `getSorted()`:
```js
    for (const fl of activeFlags) {
      if (fl === 'vita') { if (g.vita !== 'yes') return false; }
      else if (fl === 'vita_warn') { if (g.vita !== 'warn' && g.vita !== 'yes') return false; }
      else if (!g.f.includes(fl)) return false;
    }
```

Replace with:
```js
    for (const fl of activeFlags) {
      if (fl === 'vita') { if (g.vita !== 'yes') return false; }
      else if (fl === 'vita_warn') { if (g.vita !== 'warn' && g.vita !== 'yes') return false; }
      else if (fl === 'favs') { if (!favourites.has(g.t)) return false; }
      else if (!g.f.includes(fl)) return false;
    }
```

- [ ] **Step 5: Verify in browser**

Run `npm start`. Open app → sidebar → Mode section. The `♥ Favs` chip should appear. Clicking it should turn amber and show "Favourites" active tag above the grid. With no favourites yet, the grid should show the empty state ("No games match."). No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/app.js index.html
git commit -m "feat: add favourites filter chip to sidebar"
```

---

## Task 4: Heart Badge on Grid Cards

**Files:**
- Modify: `index.html` — add `.fav-badge` CSS
- Modify: `src/app.js` — modify `buildCard()` to render badge

- [ ] **Step 1: Add CSS for the badge to `index.html`**

Find this existing rule:
```css
.pb{position:absolute;bottom:6px;left:6px;...}
```

Add directly after it:
```css
.fav-badge{position:absolute;top:6px;right:6px;font-family:var(--fm);font-size:9px;
  background:rgba(7,9,13,.8);backdrop-filter:blur(4px);color:#fbbf24;
  padding:1px 7px;border-radius:999px;border:1px solid rgba(251,191,36,.3);
  pointer-events:none}
```

- [ ] **Step 2: Render the badge in `buildCard()` in `src/app.js`**

Find the `buildCard` function. Find this line inside it:
```js
  const vitaClass = g.vita === 'yes' ? 'ct-vy' : g.vita === 'warn' ? 'ct-vw' : 'ct-vn';
```

Add directly before it:
```js
  const favBadge = favourites.has(g.t) ? `<span class="fav-badge">♥</span>` : '';
```

Then find the `imgHtml` variable. The full current block is:
```js
  const imgHtml = img
    ? `<div class="ciw">
        <img src="${img}" alt="${g.t}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="cip" style="display:none">${ge}</div>
        <span class="yr">${g.y}</span>
        <span class="pb" style="background:${pi.c}">${pi.l}</span>
      </div>`
    : `<div class="ciw">
        <div class="cip">${ge}</div>
        <span class="yr">${g.y}</span>
        <span class="pb" style="background:${pi.c}">${pi.l}</span>
      </div>`;
```

Replace with:
```js
  const imgHtml = img
    ? `<div class="ciw">
        <img src="${img}" alt="${g.t}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="cip" style="display:none">${ge}</div>
        ${favBadge}
        <span class="yr">${g.y}</span>
        <span class="pb" style="background:${pi.c}">${pi.l}</span>
      </div>`
    : `<div class="ciw">
        <div class="cip">${ge}</div>
        ${favBadge}
        <span class="yr">${g.y}</span>
        <span class="pb" style="background:${pi.c}">${pi.l}</span>
      </div>`;
```

- [ ] **Step 3: Verify in browser**

Run `npm start`. No badge should appear on any card yet (favourites is empty). Open DevTools → Console, run:
```js
localStorage.setItem('gv-favourites', JSON.stringify(['Cyberpunk 2077']));
location.reload();
```
The Cyberpunk 2077 card should show a small amber `♥` badge at top-right of its cover image. Clear localStorage and reload to confirm it disappears.

- [ ] **Step 4: Commit**

```bash
git add src/app.js index.html
git commit -m "feat: add heart badge to favourited game cards"
```

---

## Task 5: Heart Button in Modal

**Files:**
- Modify: `index.html` — add `.modal-fav-btn` CSS
- Modify: `src/app.js` — add button to `openDetail()`, wire up toggle

- [ ] **Step 1: Add CSS for the modal button to `index.html`**

Find:
```css
.modal-steam-link:hover{color:var(--t1);background:rgba(255,255,255,.08)}
```

Add directly after:
```css
.modal-fav-btn{display:flex;align-items:center;justify-content:center;
  font-family:var(--fd);font-size:12px;font-weight:600;
  padding:8px 12px;border-radius:8px;width:100%;cursor:pointer;
  border:1px solid rgba(251,191,36,.25);background:rgba(251,191,36,.05);
  color:#fbbf24;transition:all .15s}
.modal-fav-btn:hover{background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.4)}
.modal-fav-btn.active{background:rgba(251,191,36,.18);border-color:rgba(251,191,36,.5)}
```

Also add the light-theme override — find:
```css
html[data-theme="light"] .modal-steam-link:hover{background:rgba(0,0,0,.08);color:var(--t1)}
```

Add after:
```css
html[data-theme="light"] .modal-fav-btn{border-color:rgba(180,130,0,.3);background:rgba(251,191,36,.07);color:#b45309}
html[data-theme="light"] .modal-fav-btn.active{background:rgba(251,191,36,.2);border-color:rgba(180,130,0,.5)}
```

- [ ] **Step 2: Add fav button HTML to `openDetail()` in `src/app.js`**

In `openDetail()`, find the block that builds `steamLink` and `steamDbLink`:
```js
  const steamLink = appId
    ? `<a class="modal-steam-link" ...>🎮 View on Steam</a>`
    : '';

  const steamDbLink = appId
    ? `<a class="modal-steam-link" ...>📊 View on SteamDB</a>`
    : '';
```

Add directly after `steamDbLink`:
```js
  const isFav = favourites.has(g.t);
  const favBtn = `<button class="modal-fav-btn${isFav ? ' active' : ''}" id="MFavBtn">${isFav ? '♥ Favourited' : '♥ Favourite'}</button>`;
```

Then in the `document.getElementById('MBody').innerHTML = ...` template, find the sidebar section:
```js
        ${steamLink}
        ${steamDbLink}
      </div>
```

Replace with:
```js
        ${steamLink}
        ${steamDbLink}
        ${favBtn}
      </div>
```

- [ ] **Step 3: Wire up the toggle event in `openDetail()` in `src/app.js`**

In `openDetail()`, find this line (near the end of the function):
```js
  document.getElementById('MO').classList.add('open');
```

Add directly before it:
```js
  document.getElementById('MFavBtn').addEventListener('click', () => {
    if (favourites.has(g.t)) favourites.delete(g.t);
    else favourites.add(g.t);
    saveFavourites();
    refreshFavouritesStat();
    render();
    const btn = document.getElementById('MFavBtn');
    const nowFav = favourites.has(g.t);
    btn.textContent = nowFav ? '♥ Favourited' : '♥ Favourite';
    btn.classList.toggle('active', nowFav);
  });
```

- [ ] **Step 4: Verify full flow in browser**

Run `npm start`. Click any game card to open its modal. The sidebar should show a `♥ Favourite` button below the Steam links. Click it:
- Button turns amber and reads `♥ Favourited`
- The topbar `♥` counter increments to `1`
- Close the modal — the card now shows a `♥` badge on its image
- Open the sidebar `♥ Favs` chip — it filters the grid to just that game
- Click the button again in the modal — button reverts, counter drops, badge disappears on next render
- Refresh the page — the favourite persists (loaded from localStorage)

- [ ] **Step 5: Commit**

```bash
git add src/app.js index.html
git commit -m "feat: add favourite button to game modal with full toggle and persistence"
```
