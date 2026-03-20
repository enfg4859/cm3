import { expect, test } from '@playwright/test';

async function waitForDashboard(page: import('@playwright/test').Page) {
  await expect(page.getByRole('banner').getByText('Chart Meister')).toBeVisible();
  await expect(page.getByText('시그널 요약')).toBeVisible();
  await expect(page.locator('.chart-panel canvas').first()).toBeVisible();
}

test.describe('dashboard', () => {
  test('loads the default Korean dashboard with chart canvases', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    await expect(page.getByRole('banner').getByText('모의 데이터')).toBeVisible();
    await expect(page.getByText('표시 레이어')).toBeVisible();
    await expect(page.getByText('분석 컨텍스트')).toBeVisible();
    await expect(page.getByRole('button', { name: '인트라데이' })).toBeVisible();
    await expect.poll(() => page.locator('.chart-panel canvas').count()).toBeGreaterThan(0);
  });

  test('shows analysis controls and session context', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    await expect(page.locator('.control-cluster').getByText('모드')).toBeVisible();
    await expect(page.locator('.control-cluster').getByText('세션', { exact: true })).toBeVisible();
    await expect(page.locator('.control-cluster').getByText('앵커')).toBeVisible();
    await expect(page.getByText('시간대', { exact: true })).toBeVisible();
  });

  test('opens explanation popovers for signals and indicators', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    await page.getByRole('button', { name: '시그널 요약 설명 열기' }).click();
    await expect(
      page.getByText('시그널 요약은 각 카테고리의 상승, 하락, 중립 기여도를 가중치에 맞게 합산해 계산합니다.')
    ).toBeVisible();

    await page.getByRole('button', { name: 'RSI 14 설명 열기' }).first().click();
    await expect(
      page.getByText('RSI는 최근 상승과 하락 강도를 0에서 100 사이로 압축한 모멘텀 지표입니다.')
    ).toBeVisible();
  });

  test('switches between Korean and English', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('banner').getByText('Chart Meister')).toBeVisible();
    await expect(page.getByText('Signal Summary')).toBeVisible();
    await expect(page.getByPlaceholder('Search symbols: AAPL, NVDA, BTCUSD')).toBeVisible();

    await page.getByRole('button', { name: 'KR', exact: true }).click();
    await expect(page.getByRole('banner').getByText('Chart Meister')).toBeVisible();
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

    await expect(page.getByText(/1D \/ 1h/)).toBeVisible();
  });
});
