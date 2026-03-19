import { createError, defineEventHandler, getQuery } from 'h3';
import { candlesQuerySchema } from '@shared/schemas';
import type { CandlesResponse } from '@shared/market';
import { withCache } from '../../utils/cache';
import { getVisibleBarCount } from '../../utils/market';
import { buildSignalSummary, calculateIndicators, trimIndicators } from '../../utils/indicators';
import { getMarketDataProvider } from '../../utils/provider';

const WARMUP_BARS = 220;

export default defineEventHandler(async (event): Promise<CandlesResponse> => {
  const parsed = candlesQuerySchema.safeParse(getQuery(event));

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid candles query.'
    });
  }

  const provider = getMarketDataProvider();
  const { symbol, range, interval } = parsed.data;
  const cacheKey = `candles:${provider.id}:${symbol}:${range}:${interval}`;

  const { value, cached } = await withCache(cacheKey, async () => {
    const rawCandles = await provider.getCandles({
      symbol,
      range,
      interval,
      warmupBars: WARMUP_BARS
    });

    const indicators = calculateIndicators(rawCandles);
    const visibleBars = getVisibleBarCount(range, interval);
    const candles = rawCandles.slice(-visibleBars);
    const visibleIndicators = trimIndicators(indicators, candles.length);

    return {
      candles,
      indicators: visibleIndicators,
      signalSummary: buildSignalSummary(candles, visibleIndicators)
    };
  });

  return {
    symbol,
    range,
    interval,
    candles: value.candles,
    indicators: value.indicators,
    signalSummary: value.signalSummary,
    provider: provider.id,
    cached
  };
});
