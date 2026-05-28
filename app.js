const IMG = {};

const PC_PLAT={
  "PS1":  {c:"#1d4ed8",l:"PS1"},
  "PS2":  {c:"#1d4ed8",l:"PS2"},
  "PS3":  {c:"#1d4ed8",l:"PS3"},
  "PSP":  {c:"#1d4ed8",l:"PSP"},
  "VITA": {c:"#3b82f6",l:"Vita"},
  "NDS":  {c:"#dc2626",l:"DS"},
  "N3DS": {c:"#dc2626",l:"3DS"},
  "WII":  {c:"#0284c7",l:"Wii"},
  "WIIU": {c:"#0284c7",l:"Wii U"},
  "NSW":  {c:"#ef4444",l:"Switch"},
  "PC":   {c:"#3b82f6",l:"PC"},
};
const GE={"open-world":"&#127757;","action":"&#9876;","shooter":"&#128299;","rpg":"&#129497;","coop":"&#129309;","racing":"&#127950;","strategy":"&#127959;","platformer":"&#128377;","fighting":"&#129354;","sports":"&#9917;"};
const GAMES = [];

const DATA_URL = 'games.json';
let dataSource = 'loading';
let dataReady = false;

function refreshHeaderStats() {
  document.getElementById('sTotal').textContent = GAMES.length;
  document.getElementById('sMust').textContent = GAMES.filter(g => g.f.includes('must')).length;
  const sOwned = document.getElementById('sOwned');
  if (sOwned) {
    sOwned.textContent = GAMES.filter(g => g.f.includes('owned')).length;
  }
  document.getElementById('sVita').textContent = GAMES.filter(g => g.vita === 'yes').length;
}

function applyExternalData(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!payload.IMG || !payload.GAMES) return false;
  if (typeof payload.IMG !== 'object' || !Array.isArray(payload.GAMES)) return false;

  for (const key of Object.keys(IMG)) delete IMG[key];
  Object.assign(IMG, payload.IMG);

  GAMES.splice(0, GAMES.length, ...payload.GAMES.filter(Boolean));
  dataSource = 'external-json';
  return true;
}

async function tryLoadExternalData() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) return false;
    const payload = await res.json();
    return applyExternalData(payload);
  } catch {
    return false;
  }
}


// ── STATE ─────────────────────────────────────────────────────────────────
let curGenre = 'all', curPlat = 'all', activeFlags = new Set();
let curSort = 'default', listView = false;

// ── HELPERS ───────────────────────────────────────────────────────────────
function makeFallbackCover(g) {
  const plat = g.p || 'PC';
  const pi = PC_PLAT[plat] || PC_PLAT.PC;
  const ge = GE[g.g] || '🎮';
  const title = (g.t || 'Unknown').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const meta = `${g.y || ''} · ${pi.l}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="920" height="430" viewBox="0 0 920 430">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="0.55" stop-color="#0b0b0f"/>
      <stop offset="1" stop-color="${pi.c}"/>
    </linearGradient>
    <radialGradient id="r" cx="18%" cy="18%" r="70%">
      <stop offset="0" stop-color="${pi.c}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="920" height="430" fill="url(#g)"/>
  <rect width="920" height="430" fill="url(#r)"/>
  <rect x="22" y="22" width="876" height="386" rx="18" fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.12)"/>
  <text x="56" y="108" fill="rgba(255,255,255,0.9)" font-size="54" font-family="DM Sans, system-ui, sans-serif" font-weight="800">${ge}</text>
  <text x="56" y="178" fill="rgba(255,255,255,0.92)" font-size="44" font-family="DM Sans, system-ui, sans-serif" font-weight="800">${title}</text>
  <text x="56" y="232" fill="rgba(255,255,255,0.62)" font-size="22" font-family="DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">${meta}</text>
  <text x="56" y="328" fill="rgba(255,255,255,0.52)" font-size="18" font-family="DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">No official cover set — generated locally</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeFallbackPortrait(g) {
  const plat = g.p || 'PC';
  const pi = PC_PLAT[plat] || PC_PLAT.PC;
  const ge = GE[g.g] || '🎮';
  const title = (g.t || 'Unknown').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const meta = `${g.y || ''} · ${pi.l}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b0b0f"/>
      <stop offset="0.55" stop-color="#0a0a10"/>
      <stop offset="1" stop-color="${pi.c}"/>
    </linearGradient>
    <radialGradient id="r" cx="22%" cy="18%" r="70%">
      <stop offset="0" stop-color="${pi.c}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="900" fill="url(#g)"/>
  <rect width="600" height="900" fill="url(#r)"/>
  <rect x="22" y="22" width="556" height="856" rx="22" fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.12)"/>
  <text x="56" y="140" fill="rgba(255,255,255,0.9)" font-size="58" font-family="DM Sans, system-ui, sans-serif" font-weight="800">${ge}</text>
  <text x="56" y="230" fill="rgba(255,255,255,0.92)" font-size="44" font-family="DM Sans, system-ui, sans-serif" font-weight="800">${title}</text>
  <text x="56" y="288" fill="rgba(255,255,255,0.62)" font-size="22" font-family="DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">${meta}</text>
  <text x="56" y="820" fill="rgba(255,255,255,0.52)" font-size="18" font-family="DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">Generated cover</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getImg(g) {
  const u = IMG[g.t];
  return (u && u.length > 0) ? u : makeFallbackCover(g);
}

function getSteamAppId(g) {
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

  const card = document.createElement('div');
  card.className = 'card' + (isMust ? ' must' : '');
  card.style.animationDelay = Math.min(idx * 0.025, 0.5) + 's';
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
  card.addEventListener('click', () => openDetail(g));
  return card;
}

// ── FILTER + SORT ─────────────────────────────────────────────────────────
function getSorted() {
  const q = (document.getElementById('SI').value || '').toLowerCase();
  let list = GAMES.filter(g => {
    if (curGenre !== 'all' && g.g !== curGenre) return false;
    if (curPlat !== 'all' && (g.p || 'PC') !== curPlat) return false;
    if (q) {
      const match = g.t.toLowerCase().includes(q) ||
                    g.d.toLowerCase().includes(q) ||
                    (g.p || 'PC').toLowerCase().includes(q) ||
                    g.g.toLowerCase().includes(q);
      if (!match) return false;
    }
    for (const fl of activeFlags) {
      if (fl === 'vita') { if (g.vita !== 'yes') return false; }
      else if (fl === 'vita_warn') { if (g.vita !== 'warn' && g.vita !== 'yes') return false; }
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
             vita:'Vita ok', vita_warn:'Vita±' };
const GL = { 'open-world':'Open World', action:'Action', shooter:'Shooter', rpg:'RPG',
             coop:'Co-op', racing:'Racing', strategy:'Strategy',
             platformer:'Platformer', fighting:'Fighting', sports:'Sports' };
const PL = { PC:'PC', PS1:'PS1', PS2:'PS2', PS3:'PS3', PSP:'PSP', VITA:'Vita',
             NDS:'DS', N3DS:'3DS', WII:'Wii', WIIU:'Wii U', NSW:'Switch' };

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
function render() {
  if (!dataReady) return;
  const grid = document.getElementById('GRID');
  const list = getSorted();
  grid.innerHTML = '';
  if (!list.length) {
    grid.innerHTML = '<div class="empty"><span>🔍</span>No games match.</div>';
  } else {
    list.forEach((g, i) => grid.appendChild(buildCard(g, i)));
  }
  document.getElementById('sCount').textContent = list.length;
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

  // Open overlay
  document.getElementById('MO').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('MO').classList.remove('open');
  document.body.style.overflow = '';
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────
// Search
document.getElementById('SI').addEventListener('input', render);

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
    document.getElementById('SI').focus();
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
      : 'Check that <code>games.json</code> exists and is valid JSON.';
    showDataLoadError(fileHint);
    console.error('GAMEVAULT: failed to load games.json');
    return;
  }
  dataReady = true;
  refreshHeaderStats();
  render();
  console.info('GAMEVAULT data source: ' + dataSource + ' (' + GAMES.length + ' games)');
}

bootstrap();
