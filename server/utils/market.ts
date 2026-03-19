import type { Candle, SupportedInterval, SupportedRange } from '@shared/market';

const VISIBLE_BARS: Record<SupportedRange, Record<SupportedInterval, number>> = {
  '1D': {
    '1min': 390,
    '5min': 96,
    '15min': 40,
    '1h': 24,
    '1day': 30
  },
  '5D': {
    '1min': 390,
    '5min': 120,
    '15min': 60,
    '1h': 48,
    '1day': 60
  },
  '1M': {
    '1min': 390,
    '5min': 180,
    '15min': 120,
    '1h': 120,
    '1day': 30
  },
  '3M': {
    '1min': 390,
    '5min': 240,
    '15min': 180,
    '1h': 180,
    '1day': 90
  },
  '6M': {
    '1min': 390,
    '5min': 320,
    '15min': 220,
    '1h': 220,
    '1day': 180
  },
  '1Y': {
    '1min': 390,
    '5min': 320,
    '15min': 240,
    '1h': 240,
    '1day': 252
  }
};

const INTERVAL_SECONDS: Record<SupportedInterval, number> = {
  '1min': 60,
  '5min': 300,
  '15min': 900,
  '1h': 3600,
  '1day': 86400
};

export function getVisibleBarCount(range: SupportedRange, interval: SupportedInterval) {
  return VISIBLE_BARS[range][interval];
}

export function getIntervalSeconds(interval: SupportedInterval) {
  return INTERVAL_SECONDS[interval];
}

export function ensureAscendingCandles(candles: Candle[]) {
  return [...candles].sort((left, right) => left.time - right.time);
}
