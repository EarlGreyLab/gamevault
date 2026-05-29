# Filter UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clickable hero stat shortcuts, genre label search, and animated underline to sidebar chips.

**Architecture:** All changes are in two files — `src/app.js` (JS logic) and `index.html` (CSS). E2E tests live in `e2e/filter-ux.spec.js`. No new dependencies.

**Tech Stack:** Vanilla JS, Playwright for E2E tests, static file server via `npm start`.

---

## Task 1: Configure Playwright for local app testing

**Files:**
- Modify: `playwright.config.js`
- Delete: `e2e/example.spec.js`

- [ ] **Step 1: Update playwright.config.js**

Replace the full contents of `playwright.config.js` with:

```js
// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Delete the example spec**

```bash
rm e2e/example.spec.js
```

- [ ] **Step 3: Verify config is valid**

```bash
npx playwright test --list --project=chromium
```

Expected: `No tests found` (no spec files yet) — no errors.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.js
git rm e2e/example.spec.js
git commit -m "test: configure playwright for local app testing"
```

---

## Task 2: Genre label search (TDD)

**Files:**
- Create: `e2e/filter-ux.spec.js`
- Modify: `src/app.js` — `getSorted()` function (lines 270–295)

### Context
`getSorted()` already checks `g.g.toLowerCase().includes(q)` (the raw genre key like `open-world`). The gap: searching `"open world"` (space, not hyphen) returns nothing because `"open-world".includes("open world")` is `false`. The `GL` map at line 301 already holds human-readable labels (`GL['open-world'] = 'Open World'`). We just need to also match against that.

- [ ] **Step 1: Create the failing test**

Create `e2e/filter-ux.spec.js`:

```js
// @ts-check
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Remove intro overlay so clicks aren't blocked by the fixed z-index:9999 overlay
  await page.evaluate(() => {
    document.getElementById('intro-overlay')?.remove();
    document.documentElement.classList.remove('intro-active');
  });
  // Wait for game data to load
  await expect(page.locator('#sTotal')).not.toHaveText('0', { timeout: 10000 });
});

test('searching "open world" (space) returns open-world genre games', async ({ page }) => {
  await page.locator('#SI').fill('open world');
  const cards = page.locator('#GRID .card');
  await expect(cards).not.toHaveCount(0);
  // Every result should be the open-world genre
  const genres = await page.locator('#GRID .card .ct-genre').allTextContents();
  expect(genres.every(g => g === 'open-world')).toBe(true);
});
```

> **Assumption:** `data/games.json` contains at least one game with `"g": "open-world"` whose title and description do not contain "open world" — so the only way the test passes is via the genre label match.

- [ ] **Step 2: Run the test — confirm it fails**

```bash
npx playwright test e2e/filter-ux.spec.js --project=chromium
```

Expected: FAIL — `expect(cards).not.toHaveCount(0)` fails because "open world" doesn't match the raw key `open-world`.

- [ ] **Step 3: Implement the fix in getSorted()**

In `src/app.js`, find the search match block inside `getSorted()` (around line 275–280):

```js
    if (q) {
      const match = g.t.toLowerCase().includes(q) ||
                    g.d.toLowerCase().includes(q) ||
                    (g.p || 'PC').toLowerCase().includes(q) ||
                    g.g.toLowerCase().includes(q);
      if (!match) return false;
    }
```

Replace with:

```js
    if (q) {
      const match = g.t.toLowerCase().includes(q) ||
                    g.d.toLowerCase().includes(q) ||
                    (g.p || 'PC').toLowerCase().includes(q) ||
                    g.g.toLowerCase().includes(q) ||
                    (GL[g.g] || g.g).toLowerCase().includes(q);
      if (!match) return false;
    }
```

- [ ] **Step 4: Run the test — confirm it passes**

```bash
npx playwright test e2e/filter-ux.spec.js --project=chromium
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add e2e/filter-ux.spec.js src/app.js
git commit -m "feat: match genre human-readable labels in search (open world, co-op)"
```

---

## Task 3: Chip underline animation (TDD)

**Files:**
- Modify: `e2e/filter-ux.spec.js` — add CSS test
- Modify: `index.html` — CSS additions after the existing `.chip` block

### Context
The "Solid" underline effect: a 1.5px line that `scaleX(0 → 1)` on hover, using `currentColor` so it tracks active-state colour automatically. Requires `position: relative` on `.chip` so the `::after` absolute position is relative to the chip. The existing `.chip` block is around line 181 in `index.html`.

- [ ] **Step 1: Add the failing CSS test**

Append to `e2e/filter-ux.spec.js`:

```js
test('sidebar chips have position:relative for underline animation', async ({ page }) => {
  const position = await page.evaluate(() => {
    const chip = document.querySelector('.chip');
    return getComputedStyle(chip).position;
  });
  expect(position).toBe('relative');
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx playwright test e2e/filter-ux.spec.js --project=chromium
```

Expected: FAIL — computed position is `'static'`.

- [ ] **Step 3: Add the CSS to index.html**

In `index.html`, locate the existing `.chip` rule (around line 181). Add these rules immediately after the `.chip[data-flag="favs"].active` block (around line 198):

```css
/* Solid underline animation (21st.dev "Solid" button pattern) */
.chip{position:relative}
.chip::after{content:'';position:absolute;bottom:3px;left:10px;right:10px;
  height:1.5px;background:currentColor;border-radius:1px;
  transform:scaleX(0);transform-origin:right center;transition:transform .18s ease}
.chip:hover::after{transform:scaleX(1);transform-origin:left center}
.chip.active::after{transform:scaleX(1);opacity:.4}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npx playwright test e2e/filter-ux.spec.js --project=chromium
```

Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add index.html e2e/filter-ux.spec.js
git commit -m "feat: add animated underline to sidebar filter chips"
```

---

## Task 4: Clickable hero stats (TDD)

**Files:**
- Modify: `e2e/filter-ux.spec.js` — add hero stats tests
- Modify: `src/app.js` — rewrite `refreshHeaderStats()` (lines 37–51)
- Modify: `index.html` — add `.hero-stat-btn` CSS

### Context
`refreshHeaderStats()` currently writes `<span>` tags to `#HS`. We replace them with `<button class="hero-stat-btn">` elements and wire click handlers inline. The three buttons:
- **games** → reset all filters (genre, platform, flags, search)
- **must play** → toggle the `must` flag (syncs with `#FF [data-flag="must"]` chip)
- **vita ok** → toggle the `vita` flag (syncs with `#FF [data-flag="vita"]` chip)

After any action, `render()` is called and `.library-section` is scrolled into view.

- [ ] **Step 1: Add the failing tests**

Append to `e2e/filter-ux.spec.js`:

```js
test('hero stats row contains button elements after data loads', async ({ page }) => {
  const buttons = page.locator('#HS button');
  await expect(buttons).toHaveCount(3);
});

test('clicking vita ok stat button activates the vita filter chip', async ({ page }) => {
  const vitaBtn = page.locator('#HS button').filter({ hasText: 'vita ok' });
  await vitaBtn.click();
  await expect(page.locator('#FF [data-flag="vita"]')).toHaveClass(/active/);
});

test('clicking must play stat button activates the must filter chip', async ({ page }) => {
  const mustBtn = page.locator('#HS button').filter({ hasText: 'must play' });
  await mustBtn.click();
  await expect(page.locator('#FF [data-flag="must"]')).toHaveClass(/active/);
});

test('clicking games stat button resets all active filters', async ({ page }) => {
  // Apply a filter first
  await page.locator('#FF [data-flag="must"]').click();
  await expect(page.locator('#FF [data-flag="must"]')).toHaveClass(/active/);

  // Reset via hero stat
  const gamesBtn = page.locator('#HS button').filter({ hasText: 'games' });
  await gamesBtn.click();
  await expect(page.locator('#FF [data-flag="must"]')).not.toHaveClass(/active/);
  await expect(page.locator('#GF [data-genre="all"]')).toHaveClass(/active/);
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx playwright test e2e/filter-ux.spec.js --project=chromium
```

Expected: FAIL — `#HS button` count is 0 (currently `<span>` elements only).

- [ ] **Step 3: Rewrite refreshHeaderStats() in src/app.js**

Find the `refreshHeaderStats` function (lines 37–51) and replace it entirely:

```js
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

  hs.appendChild(makeStatBtn(total, 'games', () => {
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
  }));

  hs.appendChild(makeStatBtn(must, 'must play', () => toggleFlag('must')));
  hs.appendChild(makeStatBtn(vita, 'vita ok',   () => toggleFlag('vita')));
}
```

- [ ] **Step 4: Add hero-stat-btn CSS to index.html**

Add this block immediately after the `.hero-stats-row` rule (around line 97 in `index.html`):

```css
.hero-stat-btn{background:none;border:none;cursor:pointer;padding:0;
  font-family:var(--fd);font-size:12px;font-weight:500;color:var(--t3);
  display:inline-flex;align-items:center;gap:4px;position:relative;
  transition:color .15s}
.hero-stat-btn:hover{color:var(--t1)}
.hero-stat-btn::after{content:'';position:absolute;bottom:-1px;left:0;right:0;
  height:1.5px;background:currentColor;border-radius:1px;
  transform:scaleX(0);transform-origin:right center;transition:transform .18s ease}
.hero-stat-btn:hover::after{transform:scaleX(1);transform-origin:left center}
```

- [ ] **Step 5: Run to confirm all tests pass**

```bash
npx playwright test e2e/filter-ux.spec.js --project=chromium
```

Expected: All 6 tests PASS.

- [ ] **Step 6: Run full suite**

```bash
npx playwright test --project=chromium
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app.js index.html e2e/filter-ux.spec.js
git commit -m "feat: clickable hero stats with filter shortcuts and underline animation"
```
