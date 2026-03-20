import { describe, expect, it } from 'vitest';
import { MockMarketDataProvider } from '../server/providers/mock';
import { buildAnalysis } from '../server/utils/indicators';
import { getVisibleBarCount } from '../server/utils/market';
import { getLatestSessionWindow } from '../server/utils/session';

describe('session logic', () => {
  it('marks US equities day-after-thanksgiving session as early close', async () => {
    const provider = new MockMarketDataProvider();
    const instrument = await provider.getInstrument('AAPL');
    const timestamp = Math.floor(Date.parse('2026-11-27T18:00:00Z') / 1000);

    const session = getLatestSessionWindow(instrument, timestamp, 'regular');

    expect(session.isEarlyClose).toBe(true);
    expect(session.sessionEnd).toBe(timestamp);
  });

  it('restricts OR 5m on a 15m chart even when 1m support exists', async () => {
    const provider = new MockMarketDataProvider();
    const instrument = await provider.getInstrument('AAPL');
    const rawCandles = await provider.getCandles({
      symbol: 'AAPL',
      range: '1D',
      interval: '15min',
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
      visibleBars: getVisibleBarCount('1D', '15min'),
      instrument,
      range: '1D',
      interval: '15min',
      mode: 'intraday',
      sessionType: 'regular',
      benchmark: 'SPY',
      orMinutes: 5,
      anchorType: 'gap',
      anchorTime: null,
      openingRangeCandles
    });

    expect(result.analysisContext.openingRange.status).toBe('restricted');
    expect(result.analysisContext.openingRange.allowedMinutes).toEqual([15, 30]);
  });
});
