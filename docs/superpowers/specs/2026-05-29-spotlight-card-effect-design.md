# Spotlight Card Effect — Design Spec

**Date:** 2026-05-29  
**Status:** Approved

## Overview

Add a mouse-tracking spotlight glow effect to game cards, replicating the visual behavior of the 21st.dev `GlowCard` component in vanilla JS/CSS. No new dependencies, no architectural changes.

## Motivation

The 21st.dev `easemize/spotlight-card` component was considered but requires React. Since game cards are rendered via vanilla JS (`buildCard()` in `src/app.js`), extracting the visual effect as plain CSS + JS is the correct approach — same result, zero integration overhead.

## Approach

Vanilla JS mouse tracking + CSS custom properties + `::after` pseudo-element. The existing `::before` pseudo-element is used by `.card.must` for the top accent bar — `::after` is free.

## Changes

### 1. CSS — `index.html` inline styles

Add a `::after` pseudo-element on `.card` that renders a radial gradient centered at the cursor position:

```css
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--r);
  background: radial-gradient(
    350px circle at var(--mx, 50%) var(--my, 50%),
    color-mix(in srgb, var(--glow-color, #63b3ed) 18%, transparent),
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 1;
}
.card:hover::after {
  opacity: 1;
}
```

- `--glow-color`: set per-card to the platform brand color from `PC_PLAT`
- `--mx` / `--my`: updated on `mousemove`, default to `50%` so there's no flash on first hover
- `opacity` transition: fades in/out smoothly rather than snapping
- `pointer-events: none`: glow layer does not intercept clicks
- `z-index: 1`: sits above card background and content visually — intentional, the glow overlays the card surface. `pointer-events: none` keeps all content clickable.

### 2. JS — `buildCard()` in `src/app.js`

After `card.className` is set, add:

```js
card.style.setProperty('--glow-color', pi.c);
card.addEventListener('mousemove', e => {
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  card.style.setProperty('--my', (e.clientY - r.top) + 'px');
});
```

No cleanup needed — cards are replaced wholesale on each `render()` call via `grid.innerHTML = ''`, which removes the DOM nodes and their listeners.

## Constraints

- `color-mix()` requires a modern browser (Chrome 111+, Firefox 113+, Safari 16.2+). Acceptable for a personal app.
- Glow intensity is 18% opacity of the platform color — subtle enough not to clash with must-play card styling.
- List view (`.grid.list-v`) is unaffected; the effect works at any card size.

## Out of Scope

- No React component installed or imported
- No changes to filter/sort/modal/favourites logic
- No changes to light-theme card styles (glow is additive and works in both themes)
