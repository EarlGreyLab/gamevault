// GAMEVAULT shared core — loaded by BOTH index.html (desktop) and
// mobile.html before their page scripts. Keep everything here page-agnostic:
// constants, cover resolution, fallback art, data fetching. Page-specific
// state, rendering and event wiring stay in src/app.js / mobile.html.
//
// This is a classic (non-module) script on purpose: its top-level
// declarations land in the global scope, which both the module script on
// desktop and the inline script on mobile can see.

// Platform colors resolve from the CSS design tokens (tokens.css) on pages
// that load them (mobile), and fall back to fixed hex where they don't
// (desktop — today's colors, unchanged). Cached: tokens don't change at
// runtime, and the getters run twice per card per render.
const _platCache = {};
const _platC = (v, fallback) => {
  if (!(v in _platCache)) {
    const val = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    _platCache[v] = val || null;
  }
  return _platCache[v] || fallback;
};
const PC_PLAT = {
  "PS1":  {get c(){return _platC('--plat-ps','#4a7dff');},    l:"PS1"},
  "PS2":  {get c(){return _platC('--plat-ps','#4a7dff');},    l:"PS2"},
  "PS3":  {get c(){return _platC('--plat-ps','#4a7dff');},    l:"PS3"},
  "PSP":  {get c(){return _platC('--plat-ps','#4a7dff');},    l:"PSP"},
  "VITA": {get c(){return _platC('--plat-vita','#6aa2ff');},  l:"Vita"},
  "NDS":  {get c(){return _platC('--plat-ds','#f87171');},    l:"DS"},
  "N3DS": {get c(){return _platC('--plat-ds','#f87171');},    l:"3DS"},
  "WII":  {get c(){return _platC('--plat-wii','#5ac8fa');},   l:"Wii"},
  "WIIU": {get c(){return _platC('--plat-wii','#5ac8fa');},   l:"Wii U"},
  "NSW":  {get c(){return _platC('--plat-switch','#ff4554');},l:"Switch"},
  "PC":   {get c(){return _platC('--plat-pc','#a8b6cc');},    l:"PC"},
};
const COVER_CONSOLE_PLATFORMS = new Set(["PS1","PS2","PS3","PSP","VITA","NDS","N3DS","WII","WIIU","NSW"]);
const LOCAL_COVER_ROOT = 'covers';
const GE = {"open-world":"&#127757;","action":"&#9876;","shooter":"&#128299;","rpg":"&#129497;","coop":"&#129309;","racing":"&#127950;","strategy":"&#127959;","platformer":"&#128377;","fighting":"&#129354;","sports":"&#9917;"};
const GL = { 'open-world':'Open World', action:'Action', shooter:'Shooter', rpg:'RPG',
             coop:'Co-op', racing:'Racing', strategy:'Strategy',
             platformer:'Platformer', fighting:'Fighting', sports:'Sports' };
const PL = { PC:'PC', PS1:'PS1', PS2:'PS2', PS3:'PS3', PSP:'PSP', VITA:'Vita',
             NDS:'DS', N3DS:'3DS', WII:'Wii', WIIU:'Wii U', NSW:'Switch' };

function slugifyTitle(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’'"?!.:,\/&]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeLocalCoverUrl(g) {
  const plat = (g.p || 'PC').toUpperCase();
  return `${LOCAL_COVER_ROOT}/${plat.toLowerCase()}/${slugifyTitle(g.t || 'unknown')}.jpg`;
}

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
      <stop offset="0" stop-color="#0a0a0c"/>
      <stop offset="0.6" stop-color="#050506"/>
      <stop offset="1" stop-color="${pi.c}" stop-opacity="0.55"/>
    </linearGradient>
    <radialGradient id="r" cx="18%" cy="18%" r="70%">
      <stop offset="0" stop-color="${pi.c}" stop-opacity="0.22"/>
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
      <stop offset="0" stop-color="#0a0a0c"/>
      <stop offset="0.6" stop-color="#050506"/>
      <stop offset="1" stop-color="${pi.c}" stop-opacity="0.55"/>
    </linearGradient>
    <radialGradient id="r" cx="22%" cy="18%" r="70%">
      <stop offset="0" stop-color="${pi.c}" stop-opacity="0.22"/>
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

// Cover resolution priority: explicit cover → consoleCover → IMG map →
// local covers/ file (console platforms) → generated SVG.
function gvGetImg(g, imgMap) {
  const explicit = typeof g.cover === 'string' && g.cover.trim() ? g.cover.trim() : null;
  if (explicit) return explicit;

  const consoleCover = typeof g.consoleCover === 'string' && g.consoleCover.trim() ? g.consoleCover.trim() : null;
  if (consoleCover) return consoleCover;

  const u = imgMap[g.t];
  if (u && u.length > 0) return u;

  if (COVER_CONSOLE_PLATFORMS.has((g.p || 'PC').toUpperCase())) {
    return makeLocalCoverUrl(g);
  }

  return makeFallbackCover(g);
}

// Precomputed lowercase haystack so search does one includes() per game
// instead of a toLowerCase() per field per keystroke.
function gvSearchKey(g) {
  return [g.t, g.d, g.p || 'PC', g.g, GL[g.g] || ''].join('\n').toLowerCase();
}

// Fetches the first URL that returns valid {IMG, GAMES} JSON, else null.
async function gvFetchGameData(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data.IMG && Array.isArray(data.GAMES)) return data;
    } catch {}
  }
  return null;
}
