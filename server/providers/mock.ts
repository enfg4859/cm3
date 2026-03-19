import { createError } from 'h3';
import type { Candle, Quote, SearchResult } from '@shared/market';
import type { CandleRequest, MarketDataProvider } from './types';
import { getIntervalSeconds, getVisibleBarCount } from '../utils/market';

interface InstrumentProfile {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  currency: string;
  basePrice: number;
  volatility: number;
  drift: number;
  baseVolume: number;
}

const INSTRUMENTS: InstrumentProfile[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    type: 'Equity',
    currency: 'USD',
    basePrice: 196,
    volatility: 0.013,
    drift: 0.0004,
    baseVolume: 64000000
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    type: 'Equity',
    currency: 'USD',
    basePrice: 884,
    volatility: 0.022,
    drift: 0.0008,
    baseVolume: 51000000
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    exchange: 'NASDAQ',
    type: 'Equity',
    currency: 'USD',
    basePrice: 237,
    volatility: 0.026,
    drift: -0.0001,
    baseVolume: 82000000
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    type: 'Equity',
    currency: 'USD',
    basePrice: 421,
    volatility: 0.011,
    drift: 0.0005,
    baseVolume: 29000000
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    exchange: 'NYSE Arca',
    type: 'ETF',
    currency: 'USD',
    basePrice: 518,
    volatility: 0.007,
    drift: 0.0003,
    baseVolume: 75000000
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    exchange: 'NASDAQ',
    type: 'ETF',
    currency: 'USD',
    basePrice: 441,
    volatility: 0.008,
    drift: 0.0004,
    baseVolume: 39000000
  },
  {
    symbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    exchange: 'CRYPTO',
    type: 'Crypto',
    currency: 'USD',
    basePrice: 68200,
    volatility: 0.032,
    drift: 0.0007,
    baseVolume: 1800000000
  },
  {
    symbol: 'ETHUSD',
    name: 'Ethereum / US Dollar',
    exchange: 'CRYPTO',
    type: 'Crypto',
    currency: 'USD',
    basePrice: 3650,
    volatility: 0.028,
    drift: 0.0006,
    baseVolume: 840000000
  }
];

function hashText(input: string) {
  return [...input].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
}

function mulberry32(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function findInstrument(symbol: string) {
  const instrument = INSTRUMENTS.find((item) => item.symbol === symbol.toUpperCase());

  if (!instrument) {
    throw createError({
      statusCode: 404,
      statusMessage: `Symbol ${symbol.toUpperCase()} not found.`
    });
  }

  return instrument;
}

function generateCandles(profile: InstrumentProfile, request: CandleRequest): Candle[] {
  const visibleBars = getVisibleBarCount(request.range, request.interval);
  const totalBars = visibleBars + (request.warmupBars ?? 0);
  const intervalSeconds = getIntervalSeconds(request.interval);
  const now = Math.floor(Date.now() / 1000);
  const rng = mulberry32(hashText(`${profile.symbol}:${request.range}:${request.interval}`));

  let lastClose = profile.basePrice * (0.92 + rng() * 0.14);

  return Array.from({ length: totalBars }, (_, index) => {
    const seasonalBias = Math.sin(index / 11) * profile.volatility * 0.35;
    const move = profile.drift + seasonalBias + (rng() - 0.5) * profile.volatility;
    const open = lastClose;
    const close = Math.max(profile.basePrice * 0.35, open * (1 + move));
    const wickFactor = profile.volatility * (0.45 + rng() * 0.4);
    const high = Math.max(open, close) * (1 + wickFactor);
    const low = Math.min(open, close) * (1 - wickFactor);
    const volumeShift = 0.7 + rng() * 0.9 + Math.abs(move) * 14;
    const volume = Math.max(1000, Math.round(profile.baseVolume * volumeShift));
    const time = now - (totalBars - 1 - index) * intervalSeconds;

    lastClose = close;

    return {
      time,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume
    };
  });
}

export class MockMarketDataProvider implements MarketDataProvider {
  readonly id = 'mock' as const;

  async search(query: string): Promise<SearchResult[]> {
    const normalized = query.trim().toUpperCase();

    return INSTRUMENTS.filter(
      (instrument) =>
        instrument.symbol.includes(normalized) ||
        instrument.name.toUpperCase().includes(normalized) ||
        instrument.exchange.toUpperCase().includes(normalized)
    )
      .slice(0, 8)
      .map(({ symbol, name, exchange, type }) => ({ symbol, name, exchange, type }));
  }

  async getQuote(symbol: string): Promise<Quote> {
    const instrument = findInstrument(symbol);
    const candles = generateCandles(instrument, {
      symbol,
      interval: '1day',
      range: '6M',
      warmupBars: 8
    });
    const latest = candles.at(-1)!;
    const previous = candles.at(-2) ?? latest;
    const dayCandles = candles.slice(-30);
    const change = latest.close - previous.close;

    return {
      symbol: instrument.symbol,
      name: instrument.name,
      exchange: instrument.exchange,
      currency: instrument.currency,
      price: latest.close,
      change: round(change),
      changePercent: round((change / previous.close) * 100),
      previousClose: previous.close,
      open: latest.open,
      high: Math.max(...dayCandles.map((candle) => candle.high)),
      low: Math.min(...dayCandles.map((candle) => candle.low)),
      volume: latest.volume,
      marketStatus: instrument.exchange === 'CRYPTO' ? 'extended' : 'open',
      updatedAt: latest.time
    };
  }

  async getCandles(request: CandleRequest): Promise<Candle[]> {
    const instrument = findInstrument(request.symbol);
    return generateCandles(instrument, request);
  }
}
