// Shared constants and helpers (PC_PLAT, GE, GL, PL, cover resolution,
// fallback art, data fetching) come from src/gv-core.js, loaded before
// this script by index.html.
const IMG = {};
const GAMES = [];

// Intro: plays once per session (~3.4s), skipped entirely for reduced motion
// and return visits — the head script gates via the intro-play class.
if (document.documentElement.classList.contains('intro-play')) {
  try { sessionStorage.setItem('gv-intro', '1'); } catch {}
  setTimeout(() => {
    const el = document.getElementById('intro-overlay');
    if (el) el.classList.add('fade-out');
  }, 2600);
  setTimeout(() => {
    document.getElementById('intro-overlay')?.remove();
    document.documentElement.classList.remove('intro-active');
  }, 3400);
} else {
  document.getElementById('intro-overlay')?.remove();
  document.documentElement.classList.remove('intro-active');
}

const DATA_URL = 'data/games.json';
let dataSource = 'loading';
let dataReady = false;

// called once at boot — counts intentionally reflect full library, not current filter
function refreshHeaderStats() {
  const total = GAMES.length;
  const must = GAMES.filter(g => g.f.includes('must')).length;
  const vita = GAMES.filter(g => g.vita === 'yes').length;
  document.getElementById('sTotal').textContent = total;
  document.getElementById('sMust').textContent = must;
  document.getElementById('sVita').textContent = vita;
  const sOwned = document.getElementById('sOwned');
  if (sOwned) sOwned.textContent = GAMES.filter(g => g.f.includes('owned')).length;

  const hs = document.getElementById('HS');
  if (!hs) return;

  const scrollToLibrary = () =>
    document.querySelector('.library-section')?.scrollIntoView({ behavior: 'smooth' });

  const makeStatBtn = (count, label, action) => {
    const btn = document.createElement('button');
    btn.className = 'hero-stat-btn';
    btn.innerHTML = `<span class="hero-stat-num">${count}</span> ${label}`;
    btn.addEventListener('click', () => { action(); scrollToLibrary(); });
    return btn;
  };

  const toggleFlag = (flag) => {
    const chip = document.querySelector(`#FF [data-flag="${flag}"]`);
    if (activeFlags.has(flag)) {
      activeFlags.delete(flag);
      chip?.classList.remove('active');
    } else {
      activeFlags.add(flag);
      chip?.classList.add('active');
    }
    render();
  };

  hs.innerHTML = '';

  hs.appendChild(makeStatBtn(total, 'games', clearAllFilters));

  hs.appendChild(makeStatBtn(must, 'must play', () => toggleFlag('must')));
  hs.appendChild(makeStatBtn(vita, 'vita ok',   () => toggleFlag('vita')));
}

function applyExternalData(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!payload.IMG || !payload.GAMES) return false;
  if (typeof payload.IMG !== 'object' || !Array.isArray(payload.GAMES)) return false;

  const validGames = payload.GAMES.filter(g => g && typeof g === 'object');
  if (validGames.length !== payload.GAMES.length) {
    console.warn('GAMEVAULT: filtered invalid game entries from data/games.json');
  }

  for (const key of Object.keys(IMG)) delete IMG[key];
  Object.assign(IMG, payload.IMG);

  GAMES.splice(0, GAMES.length, ...validGames);
  GAMES.forEach(g => { g._q = gvSearchKey(g); });
  dataSource = 'external-json';
  return true;
}

async function tryLoadExternalData() {
  const payload = await gvFetchGameData([DATA_URL]);
  return payload ? applyExternalData(payload) : false;
}


// ── STATE ─────────────────────────────────────────────────────────────────
let curGenre = 'all', curPlat = 'all', activeFlags = new Set();
let curSort = 'default', listView = false;

function clearAllFilters() {
  curGenre = 'all';
  curPlat = 'all';
  activeFlags.clear();
  document.getElementById('SI').value = '';
  document.getElementById('HI').value = '';
  document.querySelectorAll('#GF .chip').forEach(b => b.classList.remove('active'));
  document.querySelector('#GF [data-genre="all"]')?.classList.add('active');
  document.querySelectorAll('#PF .chip').forEach(b => b.classList.remove('active'));
  document.querySelector('#PF [data-plat="all"]')?.classList.add('active');
  document.querySelectorAll('#FF .chip').forEach(b => b.classList.remove('active'));
  render();
}

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

// ── HELPERS ───────────────────────────────────────────────────────────────
const getImg = g => gvGetImg(g, IMG);

function getSteamAppId(g) {
  if (g.steamId) return String(g.steamId);
  const u = IMG[g.t];
  if (!u || !u.length) return null;
  const m = u.match(/apps\/(\d+)\//);
  return m ? m[1] : null;
}

// ── BUILD CARD ─────────────────────────────────────────────────────────────
function buildCard(g, idx) {
  const img = getImg(g);
  const isMust = g.f.includes('must');
  const plat = g.p || 'PC';
  const pi = PC_PLAT[plat] || PC_PLAT.PC;
  const ge = GE[g.g] || '🎮';

  const favBadge = favourites.has(g.t) ? `<span class="fav-badge">♥</span>` : '';

  const vitaClass = g.vita === 'yes' ? 'ct-vy' : g.vita === 'warn' ? 'ct-vw' : 'ct-vn';
  const vitaLabel = g.vita === 'yes' ? 'Vita✓' : g.vita === 'warn' ? 'Vita±' : 'No Vita';

  const flagDefs = [
    ['must','ct-must','Must'], ['couch','ct-couch','Couch'],
    ['party','ct-party','Party'], ['coop','ct-coop','Co-op'],
    ['online','ct-online','Online'], ['solo','ct-solo','Solo'],
    ['owned','ct-owned','Owned'], ['classic','ct-classic','Classic']
  ];
  const flagTags = flagDefs
    .filter(([k]) => g.f.includes(k))
    .map(([, cls, l]) => `<span class="ct ${cls}">${l}</span>`)
    .join('');

  // Local covers/ paths may not exist on disk — fall back to the generated
  // SVG cover on 404 instead of dropping to the bare emoji placeholder.
  const fbk = img.startsWith(LOCAL_COVER_ROOT + '/') ? ` data-fbk="${makeFallbackCover(g)}"` : '';
  // Platform reads as a color dot + mono label, never a filled badge
  const platBadge = `<span class="pb"><i style="background:${pi.c}"></i>${pi.l}</span>`;
  const imgHtml = img
    ? `<div class="ciw">
        <img src="${img}" alt="${g.t}" loading="lazy"${fbk}
          onerror="if(this.dataset.fbk){this.src=this.dataset.fbk;this.removeAttribute('data-fbk');}else{this.style.display='none';this.nextElementSibling.style.display='flex'}">
        <div class="cip" style="display:none">${ge}</div>
        ${favBadge}
        <span class="yr">${g.y}</span>
        ${platBadge}
      </div>`
    : `<div class="ciw">
        <div class="cip">${ge}</div>
        ${favBadge}
        <span class="yr">${g.y}</span>
        ${platBadge}
      </div>`;

  const card = document.createElement('div');
  card.className = 'card' + (isMust ? ' must' : '');
  card.dataset.i = idx;
  // stagger only the first viewport-or-so of cards; the rest land together
  card.style.animationDelay = Math.min(idx * 0.025, 0.3) + 's';
  // Spotlight glow (see .card::after in index.html's <style>) tracks the
  // cursor and tints itself with the game's platform color.
  card.style.setProperty('--glow-color', pi.c);
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
  card.innerHTML = `
    ${imgHtml}
    <div class="cbody">
      <div class="ctitle">${g.t}</div>
      <div class="cdesc">${g.d}</div>
      <div class="ctags">
        <span class="ct ct-genre">${g.g}</span>
        ${flagTags}
        <span class="ct ${vitaClass}">${vitaLabel}</span>
      </div>
    </div>`;
  return card;
}

// ── FILTER + SORT ─────────────────────────────────────────────────────────
function getSorted() {
  const q = (document.getElementById('SI').value || '').toLowerCase();
  let list = GAMES.filter(g => {
    if (curGenre !== 'all' && g.g !== curGenre) return false;
    if (curPlat !== 'all' && (g.p || 'PC') !== curPlat) return false;
    if (q && !g._q.includes(q)) return false;
    for (const fl of activeFlags) {
      if (fl === 'vita') { if (g.vita !== 'yes') return false; }
      else if (fl === 'vita_warn') { if (g.vita !== 'warn' && g.vita !== 'yes') return false; }
      else if (fl === 'favs') { if (!favourites.has(g.t)) return false; }
      else if (!g.f.includes(fl)) return false;
    }
    return true;
  });
  if (curSort === 'year-new') list.sort((a, b) => b.y - a.y);
  else if (curSort === 'year-old') list.sort((a, b) => a.y - b.y);
  else if (curSort === 'az') list.sort((a, b) => a.t.localeCompare(b.t));
  else list.sort((a, b) => (b.f.includes('must') ? 1 : 0) - (a.f.includes('must') ? 1 : 0));
  return list;
}

// ── ACTIVE TAG LABELS ─────────────────────────────────────────────────────
const FL = { must:'Must Play', owned:'Owned', classic:'Classic', couch:'Couch',
             party:'Party', coop:'Co-op', online:'Online', solo:'Solo',
             vita:'Vita ok', vita_warn:'Vita±', favs:'Favourites' };

function renderActiveTags() {
  const el = document.getElementById('AT');
  el.innerHTML = '';
  const add = (label, removeFn) => {
    const tag = document.createElement('div');
    tag.className = 'atag';
    tag.innerHTML = `${label} <span class="x">✕</span>`;
    tag.addEventListener('click', () => { removeFn(); render(); });
    el.appendChild(tag);
  };
  if (curGenre !== 'all') {
    add(GL[curGenre] || curGenre, () => {
      curGenre = 'all';
      document.querySelectorAll('#GF .chip').forEach(b => b.classList.remove('active'));
      document.querySelector('#GF [data-genre="all"]').classList.add('active');
    });
  }
  if (curPlat !== 'all') {
    add(PL[curPlat] || curPlat, () => {
      curPlat = 'all';
      document.querySelectorAll('#PF .chip').forEach(b => b.classList.remove('active'));
      document.querySelector('#PF [data-plat="all"]').classList.add('active');
    });
  }
  activeFlags.forEach(fl => {
    add(FL[fl] || fl, () => {
      activeFlags.delete(fl);
      document.querySelector(`#FF [data-flag="${fl}"]`)?.classList.remove('active');
    });
  });
}

// ── RENDER ────────────────────────────────────────────────────────────────
// The list currently shown in the grid — card click/hover handlers are
// delegated on #GRID and look games up here via each card's data-i index.
let curList = [];

function render() {
  if (!dataReady) return;
  const grid = document.getElementById('GRID');
  curList = getSorted();
  grid.innerHTML = '';
  if (!curList.length) {
    const q = (document.getElementById('SI').value || '').trim();
    const sub = q
      ? `No match for <span style="font-family:var(--fm);color:var(--t1)">&quot;${q.replace(/&/g,'&amp;').replace(/</g,'&lt;')}&quot;</span>`
      : 'No games match the active filters.';
    grid.innerHTML = `<div class="empty">
      <div class="empty-glyph">⬡</div>
      <div class="empty-title">Nothing in the vault</div>
      <div class="empty-sub">${sub}</div>
      <button class="empty-clear" id="EmptyClear">Clear filters</button>
    </div>`;
  } else {
    const frag = document.createDocumentFragment();
    curList.forEach((g, i) => frag.appendChild(buildCard(g, i)));
    grid.appendChild(frag);
  }
  document.getElementById('sCount').textContent = curList.length;
  renderActiveTags();
}

// ── MODAL ─────────────────────────────────────────────────────────────────
function openDetail(g) {
  const appId = getSteamAppId(g);
  const plat = g.p || 'PC';
  const pi = PC_PLAT[plat] || PC_PLAT.PC;
  const ge = GE[g.g] || '🎮';
  const isMust = g.f.includes('must');

  // Hero image: library_hero.jpg is 1920×620 — perfect for modal
  // Falls back to header.jpg, then emoji
  const heroSrc = appId
    ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`
    : null;
  const headerSrc = getImg(g);

  const heroEl = document.getElementById('MHero');
  const heroPh = document.getElementById('MHeroPh');
  heroPh.textContent = ge;
  // Remove any previous img
  heroEl.querySelectorAll('img').forEach(el => el.remove());

  if (heroSrc) {
    const heroImg = document.createElement('img');
    heroImg.className = 'modal-hero-img';
    heroImg.alt = g.t;
    // Try library_hero first, fall back to header
    heroImg.onerror = function() {
      if (headerSrc && this.src !== headerSrc) {
        this.src = headerSrc;
        this.onerror = () => this.remove();
      } else {
        this.remove();
      }
    };
    heroImg.src = heroSrc;
    heroEl.insertBefore(heroImg, heroEl.firstChild);
  } else if (headerSrc) {
    const heroImg = document.createElement('img');
    heroImg.className = 'modal-hero-img';
    heroImg.alt = g.t;
    heroImg.src = headerSrc;
    heroImg.onerror = () => heroImg.remove();
    heroEl.insertBefore(heroImg, heroEl.firstChild);
  }

  // Ambient light: the game's own hero art, blurred behind the modal box —
  // every game tints the overlay with its own palette (no color extraction)
  const amb = document.getElementById('MAmb');
  if (amb) {
    const ambSrc = heroSrc || headerSrc;
    if (ambSrc) {
      amb.style.display = '';
      amb.onerror = () => {
        if (headerSrc && amb.src !== headerSrc) { amb.src = headerSrc; }
        else { amb.style.display = 'none'; }
      };
      amb.src = ambSrc;
    } else {
      amb.style.display = 'none';
    }
  }

  // Portrait cover for sidebar: library_600x900.jpg
  const portraitSrc = appId
    ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`
    : makeFallbackPortrait(g);

  // Tag chips
  const flagDefs = [
    ['must','ct-must','⭐ Must Play'],
    ['couch','ct-couch','🛋️ Couch Co-op'],
    ['party','ct-party','🎉 Party'],
    ['coop','ct-coop','🤝 Co-op'],
    ['online','ct-online','🌐 Online'],
    ['solo','ct-solo','Solo'],
    ['owned','ct-owned','📦 Owned'],
    ['classic','ct-classic','🕹️ Classic']
  ];
  const flagTags = flagDefs
    .filter(([k]) => g.f.includes(k))
    .map(([, cls, l]) => `<span class="ct ${cls}">${l}</span>`)
    .join('');

  // Vita info
  const vitaInfo = {
    yes: { cls:'ct-vy', icon:'✅', title:'Vita Compatible', text:'Fully playable on PS Vita via Moonlight. No problematic button requirements.' },
    warn: { cls:'ct-vw', icon:'⚠️', title:'Vita Limited', text:'Playable with limitations — some controls use LB/RB or stick-click but are not essential.' },
    no: { cls:'ct-vn', icon:'❌', title:'Not Vita Friendly', text:'Requires L2/R2/L3/R3 — not mappable on PS Vita without major issues.' }
  };
  const vi = vitaInfo[g.vita] || vitaInfo.no;

  // Steam link
  const steamLink = appId
    ? `<a class="modal-steam-link" href="https://store.steampowered.com/app/${appId}" target="_blank" rel="noopener">🎮 View on Steam</a>`
    : '';

  const steamDbLink = appId
    ? `<a class="modal-steam-link" href="https://steamdb.info/app/${appId}/" target="_blank" rel="noopener">📊 View on SteamDB</a>`
    : '';

  const isFav = favourites.has(g.t);
  const favBtn = `<button class="modal-fav-btn${isFav ? ' active' : ''}" id="MFavBtn">${isFav ? '♥ Favourited' : '♥ Favourite'}</button>`;

  // Portrait img or placeholder
  const portraitFallback = makeFallbackPortrait(g);
  const portraitHtml =
    `<img class="modal-portrait" src="${portraitSrc}" alt="${g.t}"
         onerror="if(this.dataset.fbk){this.src=this.dataset.fbk;this.onerror=()=>this.remove();}else{this.remove();}"
         data-fbk="${portraitFallback}"
         loading="lazy">
     <div class="modal-portrait-ph" style="display:none">${ge}</div>`;

  document.getElementById('MBody').innerHTML = `
    <div class="modal-layout">
      <div class="modal-sidebar">
        <div class="modal-portrait-wrap">
          ${portraitHtml}
        </div>
        <div class="modal-plat-badge" style="background:${pi.c}22;border-color:${pi.c}44;color:${pi.c}">
          ${pi.l}
        </div>
        ${steamLink}
        ${steamDbLink}
        ${favBtn}
      </div>
      <div class="modal-content">
        <div class="modal-title">${g.t}</div>
        <div class="modal-meta">
          <span>${g.y}</span>
          <span>·</span>
          <span class="modal-genre-tag">${g.g}</span>
          ${isMust ? '<span class="ct ct-must">⭐ Must Play</span>' : ''}
        </div>
        <div class="modal-desc">${g.d}</div>
        <div class="modal-tags-row">
          ${flagTags}
        </div>
        <div class="modal-vita-box">
          <span class="modal-vita-icon">${vi.icon}</span>
          <div>
            <div class="modal-vita-title">${vi.title}</div>
            <div class="modal-vita-text">${vi.text}</div>
          </div>
        </div>
      </div>
    </div>`;

  // Wire up fav button
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

  // Open overlay
  document.getElementById('MO').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('MO').classList.remove('open');
  document.body.style.overflow = '';
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────
// Card click delegated once on the grid instead of one listener per card
const _GRID = document.getElementById('GRID');
_GRID.addEventListener('click', e => {
  if (e.target.closest('.empty-clear')) { clearAllFilters(); return; }
  const card = e.target.closest('.card');
  if (!card || card.dataset.i === undefined) return;
  const g = curList[+card.dataset.i];
  if (g) openDetail(g);
});

// Search — topbar and hero inputs kept in sync; render is debounced so
// fast typing doesn't rebuild the full grid on every keystroke
const _SI = document.getElementById('SI');
const _HI = document.getElementById('HI');
let _searchTimer;
function scheduleRender() {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(render, 120);
}
_SI.addEventListener('input', () => { _HI.value = _SI.value; scheduleRender(); });
_HI.addEventListener('input', () => { _SI.value = _HI.value; scheduleRender(); });
// Scroll to library when hero search is submitted/typed
_HI.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    document.querySelector('.library-section')?.scrollIntoView({ behavior: 'smooth' });
  }
});

// Genre filter
document.querySelectorAll('#GF .chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#GF .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    curGenre = btn.dataset.genre;
    render();
  });
});

// Platform filter
document.querySelectorAll('#PF .chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#PF .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    curPlat = btn.dataset.plat;
    render();
  });
});

// Mode/flag filter
document.querySelectorAll('#FF .chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const flag = btn.dataset.flag;
    if (activeFlags.has(flag)) {
      activeFlags.delete(flag);
      btn.classList.remove('active');
    } else {
      activeFlags.add(flag);
      btn.classList.add('active');
    }
    render();
  });
});

// Sort
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    curSort = btn.dataset.sort;
    render();
  });
});

// View toggle
document.getElementById('GVB').addEventListener('click', () => {
  listView = false;
  document.getElementById('GRID').classList.remove('list-v');
  document.getElementById('GVB').classList.add('active');
  document.getElementById('LVB').classList.remove('active');
});
document.getElementById('LVB').addEventListener('click', () => {
  listView = true;
  document.getElementById('GRID').classList.add('list-v');
  document.getElementById('LVB').classList.add('active');
  document.getElementById('GVB').classList.remove('active');
});

// Modal close — button
document.getElementById('MCB').addEventListener('click', closeModal);

// Modal close — click outside
document.getElementById('MO').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

// Modal close — Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const inHero = window.scrollY < window.innerHeight * 0.5;
    (inHero ? document.getElementById('HI') : document.getElementById('SI')).focus();
  }
});

// Initial render
function showDataLoadError(reason) {
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
  refreshFavouritesStat();
  render();
  console.info('GAMEVAULT data source: ' + dataSource + ' (' + GAMES.length + ' games)');
}

bootstrap();
