import { describe, expect, it } from 'vitest';
import { MockMarketDataProvider } from '../server/providers/mock';
import { buildAnalysis } from '../server/utils/indicators';
import { getVisibleBarCount } from '../server/utils/market';

describe('indicator pipeline', () => {
  it('returns extended indicator arrays aligned to visible candle length', async () => {
    const provider = new MockMarketDataProvider();
    const instrument = await provider.getInstrument('AAPL');
    const rawCandles = await provider.getCandles({
      symbol: 'AAPL',
      range: '1D',
      interval: '5min',
      warmupBars: 220,
      sessionType: 'regular'
    });
    const benchmarkCandles = await provider.getCandles({
      symbol: 'SPY',
      range: '1D',
      interval: '5min',
      warmupBars: 220,
      sessionType: 'regular'
    });
    const openingRangeCandles = await provider.getCandles({
      symbol: 'AAPL',
      range: '1D',
      interval: '1min',
      warmupBars: 390,
      sessionType: 'regular'
    });

    const result = buildAnalysis({
      rawCandles,
      visibleBars: getVisibleBarCount('1D', '5min'),
      instrument,
      range: '1D',
      interval: '5min',
      mode: 'intraday',
      sessionType: 'regular',
      benchmark: 'SPY',
      orMinutes: 15,
      anchorType: 'gap',
      anchorTime: null,
      benchmarkCandles,
      openingRangeCandles
    });

    expect(result.indicators.ema20).toHaveLength(result.candles.length);
    expect(result.indicators.vwap).toHaveLength(result.candles.length);
    expect(result.indicators.anchoredVwap).toHaveLength(result.candles.length);
    expect(result.indicators.adxDmi14).toHaveLength(result.candles.length);
    expect(result.indicators.rvol20).toHaveLength(result.candles.length);
    expect(result.indicators.relativeStrength).toHaveLength(result.candles.length);
  });

  it('marks relative strength as not_applicable for crypto instruments', async () => {
    const provider = new MockMarketDataProvider();
    const instrument = await provider.getInstrument('BTCUSD');
    const rawCandles = await provider.getCandles({
      symbol: 'BTCUSD',
      range: '6M',
      interval: '1day',
      warmupBars: 220,
      sessionType: 'regular'
    });

    const result = buildAnalysis({
      rawCandles,
      visibleBars: getVisibleBarCount('6M', '1day'),
      instrument,
      range: '6M',
      interval: '1day',
      mode: 'swing',
      sessionType: 'regular',
      benchmark: null,
      orMinutes: null,
      anchorType: 'swing_low',
      anchorTime: null
    });

    expect(result.analysisContext.relative.relativeNotApplicable).toBe(true);
    expect(result.signalSummary.categories.relative.status).toBe('not_applicable');
  });

  it('keeps preset anchor sticky once anchorTime is supplied', async () => {
    const provider = new MockMarketDataProvider();
    const instrument = await provider.getInstrument('NVDA');
    const rawCandles = await provider.getCandles({
      symbol: 'NVDA',
      range: '3M',
      interval: '1day',
      warmupBars: 220,
      sessionType: 'regular'
    });
    const stickyTime = rawCandles.at(-40)?.time ?? null;

    const result = buildAnalysis({
      rawCandles,
      visibleBars: getVisibleBarCount('3M', '1day'),
      instrument,
      range: '3M',
      interval: '1day',
      mode: 'swing',
      sessionType: 'regular',
      benchmark: 'SPY',
      orMinutes: null,
      anchorType: 'gap',
      anchorTime: stickyTime
    });

    expect(result.analysisContext.anchor.anchorTime).toBe(stickyTime);
    expect(result.analysisContext.anchor.isSticky).toBe(true);
  });

  it('marks benchmark as unavailable without failing the whole analysis', async () => {
    const provider = new MockMarketDataProvider();
    const instrument = await provider.getInstrument('AAPL');
    const rawCandles = await provider.getCandles({
      symbol: 'AAPL',
      range: '3M',
      interval: '1day',
      warmupBars: 220,
      sessionType: 'regular'
    });

    const result = buildAnalysis({
      rawCandles,
      visibleBars: getVisibleBarCount('3M', '1day'),
      instrument,
      range: '3M',
      interval: '1day',
      mode: 'swing',
      sessionType: 'regular',
      benchmark: 'SPY',
      orMinutes: null,
      anchorType: 'swing_low',
      anchorTime: null,
      benchmarkCandles: undefined
    });

    expect(result.analysisContext.relative.benchmarkUnavailable).toBe(true);
    expect(result.signalSummary.categories.relative.status).toBe('unavailable');
  });
});
