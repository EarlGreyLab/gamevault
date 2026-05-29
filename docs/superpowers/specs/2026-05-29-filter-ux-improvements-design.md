# Filter UX Improvements — Design Spec

**Date:** 2026-05-29
**Status:** Approved

## Overview

Three focused improvements to the filter and search experience in GAMEVAULT:

1. Hero stats row becomes clickable filter shortcuts
2. Genre search matches human-readable label names
3. Sidebar filter chips get an animated underline hover effect

All changes are vanilla JS + CSS only. No new dependencies.

---

## Feature 1 — Clickable Hero Stats

### What changes
`refreshHeaderStats()` in `src/app.js` currently renders three `<span>` elements inside `#HS`. Replace them with `<button class="hero-stat-btn">` elements.

### Click behaviour
| Button | Action |
|---|---|
| "X games" | Reset all filters (genre → `all`, platform → `all`, clear `activeFlags`, clear search inputs), scroll to library section |
| "X must play" | Toggle the `must` flag in `activeFlags`, scroll to library section |
| "X vita ok" | Toggle the `vita` flag in `activeFlags`, scroll to library section |

After applying a filter, call `render()`. Sync the visual active state of the matching sidebar chip (`.chip[data-flag="must"]` / `.chip[data-flag="vita"]`) to match the toggled state.

### Styling
`.hero-stat-btn` inherits the existing `.hero-stats-row` font/color/gap. Add:
- `background: none; border: none; cursor: pointer; padding: 0`
- Underline animation via `::after` using the same pattern as Feature 3 (scaleX 0→1 on hover, `currentColor`, 0.18s ease)
- On hover: text brightens to `var(--t1)`

---

## Feature 2 — Genre Label Search

### What changes
One addition to the `getSorted()` search match block in `src/app.js`.

### Current match targets
```
g.t (title), g.d (description), g.p (platform key), g.g (genre key)
```

### New match target
```
(GL[g.g] || g.g).toLowerCase()
```

This uses the existing `GL` map to resolve human-readable labels:
- "open world" matches `GL['open-world']` → `"Open World"`
- "co-op" / "coop" both match (`GL['coop']` → `"Co-op"` covers the dash form; `g.g` already covers the raw key)
- All other genres already work via the existing `g.g` check

No changes to the `GL` map or any other part of search.

---

## Feature 3 — Chip Underline Animation

### What changes
CSS additions to `index.html`'s `<style>` block. No HTML structure changes, no JS changes.

### Rules
```css
.chip { position: relative; }

.chip::after {
  content: '';
  position: absolute;
  bottom: 3px;
  left: 10px;   /* matches horizontal padding */
  right: 10px;
  height: 1.5px;
  background: currentColor;
  border-radius: 1px;
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform 0.18s ease;
}

.chip:hover::after {
  transform: scaleX(1);
  transform-origin: left center;
}

.chip.active::after {
  transform: scaleX(1);
  opacity: 0.4;  /* background fill already signals active; underline is subtle */
}
```

### Constraints
- `.chip` has no existing `::after` — no conflict
- `border-radius: 999px` on `.chip` does not clip absolutely-positioned children (no `overflow: hidden`)
- `currentColor` tracks the chip's text colour through all active-state overrides automatically

---

## Files Changed

| File | Change |
|---|---|
| `src/app.js` | `refreshHeaderStats()` renders buttons + click handlers; `getSorted()` adds genre label match |
| `index.html` | CSS additions for `.hero-stat-btn` and `.chip::after` underline animation |

## Out of Scope

- Platform label search (not requested)
- Changing chip shape or layout
- Any React changes
