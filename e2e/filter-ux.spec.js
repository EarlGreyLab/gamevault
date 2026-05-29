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

// Note: Searching "open world" also matches non-open-world games via their descriptions,
// so we cannot assert that ALL results are open-world. Instead we verify that
// open-world games whose title and description contain no "open world" text
// (e.g. "Cyberpunk 2077") appear in results — they can only match via the genre label.
test('searching "open world" (space) surfaces open-world games that lack the phrase in title/desc', async ({ page }) => {
  await page.locator('#SI').fill('open world');
  const cards = page.locator('#GRID .card');
  await expect(cards).not.toHaveCount(0);

  // "Cyberpunk 2077" is genre open-world but has NO "open world" text in its title or
  // description — it can only appear in results if the search matches the genre label.
  const titles = await page.locator('#GRID .card .ctitle').allTextContents();
  expect(titles).toContain('Cyberpunk 2077');
});

test('sidebar chips have position:relative for underline animation', async ({ page }) => {
  const position = await page.evaluate(() => {
    const chip = document.querySelector('.chip');
    return getComputedStyle(chip).position;
  });
  expect(position).toBe('relative');
});

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
