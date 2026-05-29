import { test, expect } from 'playwright/test';

test('each card has --glow-color set to a hex color', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.card');
  const color = await page.$eval('.card', el =>
    el.style.getPropertyValue('--glow-color').trim()
  );
  expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
});
