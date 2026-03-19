import { expect, test } from '@playwright/test';

async function waitForDashboard(page: import('@playwright/test').Page) {
  await expect(page.getByText('QUANT_ATELIER')).toBeVisible();
  await expect(page.getByText('시그널 요약')).toBeVisible();
  await expect(page.locator('.chart-panel canvas').first()).toBeVisible();
}

test.describe('dashboard', () => {
  test('loads the default Korean dashboard with chart canvases', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    await expect(page.getByText('기술적 분석 작업공간')).toBeVisible();
    await expect(page.getByRole('banner').getByText('모의 데이터')).toBeVisible();
    await expect(page.getByText('표시 레이어')).toBeVisible();
    await expect(page.getByRole('button', { name: 'RSI 14 설명' })).toBeVisible();
    await expect.poll(() => page.locator('.chart-panel canvas').count()).toBeGreaterThan(0);
  });

  test('shows indicator help tooltip on hover', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    await page.getByRole('button', { name: 'RSI 14 설명' }).hover();
    await expect(page.getByText(/최근 14개 캔들의 상승 강도와 하락 강도/)).toBeVisible();
  });

  test('switches between Korean and English', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    await page.getByRole('button', { name: 'EN' }).click();
    await expect(page.getByText('Technical Analysis Workspace')).toBeVisible();
    await expect(page.getByText('Signal Summary')).toBeVisible();
    await expect(page.getByPlaceholder('Search symbols: AAPL, NVDA, BTCUSD')).toBeVisible();

    await page.getByRole('button', { name: 'KR' }).click();
    await expect(page.getByText('기술적 분석 작업공간')).toBeVisible();
    await expect(page.getByText('시그널 요약')).toBeVisible();
  });

  test('searches for another symbol and refreshes the dashboard', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    const searchBox = page.getByPlaceholder('심볼 검색: AAPL, NVDA, BTCUSD');
    await searchBox.fill('NVDA');
    await expect(page.getByRole('button', { name: /NVDA/i })).toBeVisible();

    const quoteResponse = page.waitForResponse((response) =>
      response.url().includes('/api/quote?symbol=NVDA')
    );
    await page.getByRole('button', { name: /NVDA/i }).click();
    await quoteResponse;

    await expect(page.getByText('NVIDIA Corporation • NASDAQ')).toBeVisible();
  });

  test('shows the localized error state for an invalid symbol and recovers', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    const searchBox = page.getByPlaceholder('심볼 검색: AAPL, NVDA, BTCUSD');
    await searchBox.fill('INVALID_SYM');
    await searchBox.press('Enter');

    await expect(page.getByText('심볼을 찾을 수 없습니다.')).toBeVisible();
    await page.getByRole('button', { name: 'AAPL' }).click();
    await expect(page.getByText('Apple Inc. • NASDAQ')).toBeVisible();
  });

  test('updates candle requests when range and interval change', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    const rangeResponse = page.waitForResponse((response) =>
      response.url().includes('/api/candles?symbol=AAPL') && response.url().includes('range=1D')
    );
    await page.getByRole('button', { name: '1D', exact: true }).click();
    await rangeResponse;

    const intervalResponse = page.waitForResponse((response) =>
      response.url().includes('/api/candles?symbol=AAPL') &&
      response.url().includes('range=1D') &&
      response.url().includes('interval=1h')
    );
    await page.getByRole('button', { name: '1h', exact: true }).click();
    await intervalResponse;

    await expect(page.getByText('1D / 1h')).toBeVisible();
  });
});
