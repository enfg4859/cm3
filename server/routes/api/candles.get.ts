import { createError, defineEventHandler, getQuery } from 'h3';
import { candlesQuerySchema } from '@shared/schemas';
import type { BenchmarkSymbol, CandlesResponse, OpeningRangeMinutes } from '@shared/market';
import { withCache } from '../../utils/cache';
import { getVisibleBarCount } from '../../utils/market';
import { buildAnalysis } from '../../utils/indicators';
import { getMarketDataProvider } from '../../utils/provider';

const WARMUP_BARS = 220;
const ONE_MINUTE_SESSION_WARMUP = 390;

export default defineEventHandler(async (event): Promise<CandlesResponse> => {
  const parsed = candlesQuerySchema.safeParse(getQuery(event));

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid candles query.'
    });
  }

  const provider = getMarketDataProvider();
  const instrument = await provider.getInstrument(parsed.data.symbol);
  const benchmark =
    instrument.supportsRelativeStrength ? (parsed.data.benchmark ?? 'SPY') : (null as BenchmarkSymbol | null);
  const orMinutes =
    parsed.data.orMinutes ?? (parsed.data.mode === 'intraday' ? (15 as OpeningRangeMinutes) : null);
  const visibleBars = getVisibleBarCount(parsed.data.range, parsed.data.interval);
  const cacheKey = [
    'candles',
    provider.id,
    parsed.data.symbol,
    parsed.data.range,
    parsed.data.interval,
    parsed.data.mode,
    parsed.data.session,
    benchmark ?? 'none',
    orMinutes ?? 'none',
    parsed.data.anchorType,
    parsed.data.anchorTime ?? 'auto'
  ].join(':');

  const { value, cached } = await withCache(cacheKey, async () => {
    const [rawCandles, benchmarkCandles, openingRangeCandles] = await Promise.all([
      provider.getCandles({
        symbol: parsed.data.symbol,
        range: parsed.data.range,
        interval: parsed.data.interval,
        warmupBars: WARMUP_BARS,
        sessionType: parsed.data.session
      }),
      benchmark
        ? provider.getCandles({
            symbol: benchmark,
            range: parsed.data.range,
            interval: parsed.data.interval,
            warmupBars: WARMUP_BARS,
            sessionType: parsed.data.session
          }).catch(() => undefined)
        : Promise.resolve(undefined),
      parsed.data.mode === 'intraday' && orMinutes
        ? provider
            .getCandles({
              symbol: parsed.data.symbol,
              range: '1D',
              interval: '1min',
              warmupBars: ONE_MINUTE_SESSION_WARMUP,
              sessionType: parsed.data.session
            })
            .catch(() => undefined)
        : Promise.resolve(undefined)
    ]);

    return buildAnalysis({
      rawCandles,
      visibleBars,
      instrument,
      range: parsed.data.range,
      interval: parsed.data.interval,
      mode: parsed.data.mode,
      sessionType: parsed.data.session,
      benchmark,
      orMinutes,
      anchorType: parsed.data.anchorType,
      anchorTime: parsed.data.anchorTime ?? null,
      benchmarkCandles,
      openingRangeCandles
    });
  });

  return {
    symbol: parsed.data.symbol,
    range: parsed.data.range,
    interval: parsed.data.interval,
    mode: parsed.data.mode,
    session: parsed.data.session,
    benchmark,
    orMinutes,
    anchorType: value.analysisContext.anchor.anchorType,
    anchorTime: value.analysisContext.anchor.anchorTime,
    instrument,
    candles: value.candles,
    indicators: value.indicators,
    analysisContext: value.analysisContext,
    signalSummary: value.signalSummary,
    provider: provider.id,
    cached
  };
});
