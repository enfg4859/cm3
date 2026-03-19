import { describe, expect, it } from 'vitest';
import { MockMarketDataProvider } from '../server/providers/mock';
import { buildSignalSummary, calculateIndicators, trimIndicators } from '../server/utils/indicators';
import { getVisibleBarCount } from '../server/utils/market';

describe('indicator pipeline', () => {
  it('returns indicator arrays aligned to candle length', async () => {
    const provider = new MockMarketDataProvider();
    const candles = await provider.getCandles({
      symbol: 'AAPL',
      range: '3M',
      interval: '1day',
      warmupBars: 220
    });

    const indicators = calculateIndicators(candles);

    expect(indicators.ema20).toHaveLength(candles.length);
    expect(indicators.ema50).toHaveLength(candles.length);
    expect(indicators.ema200).toHaveLength(candles.length);
    expect(indicators.rsi14).toHaveLength(candles.length);
    expect(indicators.macd).toHaveLength(candles.length);
    expect(indicators.bollinger).toHaveLength(candles.length);
    expect(indicators.atr14).toHaveLength(candles.length);
  });

  it('builds a signal summary from visible candles', async () => {
    const provider = new MockMarketDataProvider();
    const candles = await provider.getCandles({
      symbol: 'NVDA',
      range: '6M',
      interval: '1day',
      warmupBars: 220
    });
    const indicators = calculateIndicators(candles);
    const visibleSize = getVisibleBarCount('6M', '1day');
    const visibleCandles = candles.slice(-visibleSize);
    const visibleIndicators = trimIndicators(indicators, visibleSize);
    const summary = buildSignalSummary(visibleCandles, visibleIndicators);

    expect(summary.label).toMatch(/Bullish|Bearish|Neutral/);
    expect(summary.bullets.length).toBeGreaterThanOrEqual(3);
    expect(summary.metrics.emaTrend).toMatch(/bullish|bearish|mixed/);
  });
});
