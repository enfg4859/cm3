import { expect, test } from '@playwright/test';

const shouldRunLiveE2E = process.env.ENABLE_LIVE_E2E === '1' && Boolean(process.env.TWELVEDATA_API_KEY?.trim());

test.describe('@live twelvedata provider', () => {
  test.skip(!shouldRunLiveE2E, 'Live provider smoke tests run only when ENABLE_LIVE_E2E=1 is set.');

  test('boots the dashboard with a single live quote and candle fetch', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('QUANT_ATELIER')).toBeVisible();
    await expect(page.getByRole('banner').getByText(/Twelve Data/)).toBeVisible();
    await expect(page.getByText('시그널 요약')).toBeVisible();
    await expect(page.locator('.chart-panel canvas').first()).toBeVisible();
    await expect(page.locator('.price-hero')).toContainText(/AAPL|Apple/i, { timeout: 30000 });
  });
});
