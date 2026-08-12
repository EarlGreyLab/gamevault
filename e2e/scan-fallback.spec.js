// @ts-check
import { test, expect } from '@playwright/test';

// Covers the four states the scan sheet can land in. gvLookupBarcode is stubbed
// so these run without a camera and without hitting the lookup APIs — the free
// fallback is rate limited, so real calls here would be flaky by construction.

const GAME_PRICED = {
  title: 'Metroid Dread', console: 'Nintendo Switch',
  loosePrice: 34.5, cibPrice: 41.99, newPrice: 59.0,
  productUrl: 'https://www.pricecharting.com/game/x',
  source: 'pricecharting', isGame: true,
};

const GAME_UNPRICED = {
  title: 'Chibi-Robo! Zip Lash', console: 'Nintendo 3DS',
  loosePrice: null, cibPrice: null, newPrice: null, productUrl: null,
  source: 'upcitemdb', isGame: true,
};

const NOT_A_GAME = {
  title: 'ORGANIC BLUE CORN TORTILLA CHIPS', console: null,
  loosePrice: null, cibPrice: null, newPrice: null, productUrl: null,
  source: 'upcitemdb', isGame: false,
};

async function scan(page, stub) {
  await page.evaluate((s) => { window.gvLookupBarcode = async () => s; }, stub);
  await page.evaluate(() => window.onBarcodeDetected('045496590420'));
  await expect(page.locator('#DSC')).not.toContainText('Looking up');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/mobile.html');
  await expect(page.locator('#CARDS .card').first()).toBeVisible({ timeout: 10000 });
});

test('a PriceCharting hit shows the price grid and the buy link', async ({ page }) => {
  await scan(page, GAME_PRICED);
  await expect(page.locator('.ds-price-grid')).toBeVisible();
  await expect(page.locator('#DSC')).toContainText('$34.50');
  await expect(page.locator('#DSC')).toContainText('View / Buy on PriceCharting');
});

test('the free fallback explains the missing pricing instead of showing empty dashes', async ({ page }) => {
  await scan(page, GAME_UNPRICED);
  await expect(page.locator('.ds-price-grid')).toHaveCount(0);
  await expect(page.locator('#DSC')).toContainText('No pricing');
  // A dash grid would read as a failed lookup rather than an absent provider.
  await expect(page.locator('#DSC')).not.toContainText('CIB');
});

test('a non-game barcode is refused and offers no way to add it', async ({ page }) => {
  await scan(page, NOT_A_GAME);
  await expect(page.locator('#DSC')).toContainText('Not a game');
  await expect(page.locator('#SCADD')).toHaveCount(0);
});

test('a failed lookup reports not-found', async ({ page }) => {
  await scan(page, null);
  await expect(page.locator('#DSC')).toContainText('Not found');
  await expect(page.locator('#SCADD')).toHaveCount(0);
});

test('adding an unpriced game persists it locally with a mapped platform', async ({ page }) => {
  const before = await page.evaluate(() => G.length);
  await scan(page, GAME_UNPRICED);
  await expect(page.locator('#DSC')).toContainText('Not yet in your library');
  await page.locator('#SCADD').click();

  await expect.poll(() => page.evaluate(() => G.length)).toBe(before + 1);
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gv_local_additions') || '[]')
  );
  expect(stored).toHaveLength(1);
  expect(stored[0].t).toBe('Chibi-Robo! Zip Lash');
  expect(stored[0].p).toBe('N3DS');   // mapped from the free lookup's "Nintendo 3DS"
  expect(stored[0].local).toBe(true);
});
