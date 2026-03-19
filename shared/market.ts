export const RANGE_OPTIONS = ['1D', '5D', '1M', '3M', '6M', '1Y'] as const;
export const INTERVAL_OPTIONS = ['1min', '5min', '15min', '1h', '1day'] as const;
export const INDICATOR_KEYS = [
  'ema20',
  'ema50',
  'ema200',
  'bollinger',
  'volume',
  'rsi',
  'macd',
  'atr'
] as const;

export type SupportedRange = (typeof RANGE_OPTIONS)[number];
export type SupportedInterval = (typeof INTERVAL_OPTIONS)[number];
export type IndicatorToggleKey = (typeof INDICATOR_KEYS)[number];
export type ProviderId = 'mock' | 'twelvedata';

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface Quote {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketStatus: 'open' | 'closed' | 'extended';
  updatedAt: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorPoint {
  time: number;
  value: number | null;
}

export interface MacdPoint {
  time: number;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export interface BollingerPoint {
  time: number;
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export interface CandleIndicators {
  ema20: IndicatorPoint[];
  ema50: IndicatorPoint[];
  ema200: IndicatorPoint[];
  rsi14: IndicatorPoint[];
  macd: MacdPoint[];
  bollinger: BollingerPoint[];
  atr14: IndicatorPoint[];
}

export type SignalBias =
  | 'strong_bullish'
  | 'bullish'
  | 'neutral'
  | 'bearish'
  | 'strong_bearish';

export interface SignalSummary {
  bias: SignalBias;
  label: string;
  confidence: 'low' | 'medium' | 'high';
  bullets: string[];
  metrics: {
    emaTrend: 'bullish' | 'bearish' | 'mixed';
    rsiState: 'oversold' | 'neutral' | 'bullish' | 'overbought';
    macdState: 'bullish' | 'bearish' | 'flat';
    volatilityState: 'calm' | 'normal' | 'elevated';
  };
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  provider: ProviderId;
  cached: boolean;
}

export interface QuoteResponse {
  quote: Quote;
  provider: ProviderId;
  cached: boolean;
}

export interface CandlesResponse {
  symbol: string;
  range: SupportedRange;
  interval: SupportedInterval;
  candles: Candle[];
  indicators: CandleIndicators;
  signalSummary: SignalSummary;
  provider: ProviderId;
  cached: boolean;
}

export type IndicatorVisibility = Record<IndicatorToggleKey, boolean>;
