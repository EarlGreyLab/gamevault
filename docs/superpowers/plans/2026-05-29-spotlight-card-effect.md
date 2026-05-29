# Spotlight Card Effect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mouse-tracking radial gradient glow to each game card, colored by platform brand color.

**Architecture:** Two changes only — a `::after` CSS pseudo-element on `.card` driven by CSS custom properties, and two lines added to `buildCard()` in `src/app.js` that set `--glow-color` per card and update `--mx`/`--my` on `mousemove`.

**Tech Stack:** Vanilla JS, CSS custom properties, `color-mix()`, Playwright (tests only)

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `index.html` | Add `.card::after` and `.card:hover::after` CSS rules after line 247 |
| Modify | `src/app.js` | Add 5 lines inside `buildCard()` after `card.style.animationDelay` (line 247) |
| Create | `playwright.config.js` | Minimal Playwright config pointing at `http://localhost:3000` |
| Create | `tests/spotlight.spec.js` | Two tests: glow color set, coordinates update on hover |

---

## Task 1: Playwright config + failing tests

**Files:**
- Create: `playwright.config.js`
- Create: `tests/spotlight.spec.js`

- [ ] **Step 1: Create `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 2: Create `tests/spotlight.spec.js`**

```js
import { test, expect } from '@playwright/test';

test('each card has --glow-color set to a hex color', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.card');
  const color = await page.$eval('.card', el =>
    el.style.getPropertyValue('--glow-color').trim()
  );
  expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
});

test('--mx and --my are set after hovering a card', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.card');
  await page.locator('.card').first().hover();
  const mx = await page.locator('.card').first().evaluate(el =>
    el.style.getPropertyValue('--mx')
  );
  const my = await page.locator('.card').first().evaluate(el =>
    el.style.getPropertyValue('--my')
  );
  expect(mx).toMatch(/^\d+(\.\d+)?px$/);
  expect(my).toMatch(/^\d+(\.\d+)?px$/);
});
```

- [ ] **Step 3: Run tests — verify they FAIL**

Start the server first in a separate terminal: `npm start`

Then run:
```
npx playwright test --reporter=line
```

Expected: both tests **FAIL** — `--glow-color` is `""` and `--mx`/`--my` are `""`.

- [ ] **Step 4: Commit test scaffold**

```bash
git add playwright.config.js tests/spotlight.spec.js
git commit -m "test: add failing spotlight effect tests"
```

---

## Task 2: Add spotlight CSS to `index.html`

**Files:**
- Modify: `index.html` (after line 247 — the `.card.must:hover` rule)

- [ ] **Step 1: Insert `.card::after` rules**

Open `index.html`. Find this line (around line 247):
```css
.card.must:hover{border-color:rgba(252,129,129,.5)}
```

Insert immediately after it:
```css
.card::after{content:'';position:absolute;inset:0;border-radius:var(--r);
  background:radial-gradient(350px circle at var(--mx,50%) var(--my,50%),
    color-mix(in srgb,var(--glow-color,#63b3ed) 18%,transparent),transparent 70%);
  opacity:0;transition:opacity .3s ease;pointer-events:none;z-index:1}
.card:hover::after{opacity:1}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add spotlight card CSS pseudo-element"
```

---

## Task 3: Add spotlight JS to `buildCard()`

**Files:**
- Modify: `src/app.js` (inside `buildCard()`, after `card.style.animationDelay` line)

- [ ] **Step 1: Locate the insertion point**

In `src/app.js`, find this block inside `buildCard()` (around line 246–247):
```js
card.className = 'card' + (isMust ? ' must' : '');
card.style.animationDelay = Math.min(idx * 0.025, 0.5) + 's';
```

- [ ] **Step 2: Insert glow color + mousemove listener**

Add these lines immediately after `card.style.animationDelay`:
```js
card.style.setProperty('--glow-color', pi.c);
card.addEventListener('mousemove', e => {
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  card.style.setProperty('--my', (e.clientY - r.top) + 'px');
});
```

- [ ] **Step 3: Commit**

```bash
git add src/app.js
git commit -m "feat: add spotlight glow tracking to buildCard"
```

---

## Task 4: Run tests and verify

- [ ] **Step 1: Run Playwright tests**

```
npx playwright test --reporter=line
```

Expected output:
```
  2 passed (Xs)
```

- [ ] **Step 2: Manual smoke check**

Open `http://localhost:3000` in a browser. Hover slowly over a few cards. You should see:
- A soft radial glow following your cursor across each card
- The glow color matches the platform badge color (red for Switch, blue for PlayStation, etc.)
- Must-play cards still show their red top bar — the glow does not interfere
- Clicking a card still opens the detail modal correctly
- List view (toggle the list icon in the header) — glow still works on the narrower card layout

- [ ] **Step 3: Final commit if anything was adjusted**

```bash
git add -p
git commit -m "fix: spotlight effect adjustments after smoke test"
```
