export const RANGE_OPTIONS = ['1D', '5D', '1M', '3M', '6M', '1Y'] as const;
export const INTERVAL_OPTIONS = ['1min', '5min', '15min', '1h', '1day'] as const;
export const ANALYSIS_MODE_OPTIONS = ['intraday', 'swing'] as const;
export const SESSION_OPTIONS = ['regular', 'extended'] as const;
export const BENCHMARK_OPTIONS = ['SPY', 'QQQ'] as const;
export const OPENING_RANGE_OPTIONS = [5, 15, 30] as const;
export const ANCHOR_TYPE_OPTIONS = ['manual', 'gap', 'breakout', 'swing_high', 'swing_low'] as const;
export const INDICATOR_KEYS = [
  'ema20',
  'ema50',
  'ema200',
  'bollinger',
  'volume',
  'rsi',
  'macd',
  'atr',
  'vwap',
  'anchoredVwap',
  'adxDmi',
  'rvol',
  'relativeStrength',
  'pdhPdl',
  'openingRange'
] as const;

export type SupportedRange = (typeof RANGE_OPTIONS)[number];
export type SupportedInterval = (typeof INTERVAL_OPTIONS)[number];
export type AnalysisMode = (typeof ANALYSIS_MODE_OPTIONS)[number];
export type SessionType = (typeof SESSION_OPTIONS)[number];
export type BenchmarkSymbol = (typeof BENCHMARK_OPTIONS)[number];
export type OpeningRangeMinutes = (typeof OPENING_RANGE_OPTIONS)[number];
export type AnchorType = (typeof ANCHOR_TYPE_OPTIONS)[number];
export type IndicatorToggleKey = (typeof INDICATOR_KEYS)[number];
export type ProviderId = 'mock' | 'twelvedata';
export type AssetType = 'equity' | 'etf' | 'crypto' | 'fx' | 'index' | 'other';
export type CalendarId = 'US_EQUITIES' | 'ALWAYS_OPEN';
export type DataAvailabilityStatus = 'ready' | 'unavailable' | 'not_applicable' | 'restricted';

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface InstrumentMeta {
  symbol: string;
  name: string;
  exchange: string;
  assetType: AssetType;
  exchangeTimezone: string;
  calendarId: CalendarId;
  supportsExtendedHours: boolean;
  supportsRelativeStrength: boolean;
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
  assetType: AssetType;
  exchangeTimezone: string;
  calendarId: CalendarId;
  supportsExtendedHours: boolean;
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
  width: number | null;
}

export interface AdxDmiPoint {
  time: number;
  adx: number | null;
  plusDi: number | null;
  minusDi: number | null;
}

export interface CandleIndicators {
  ema20: IndicatorPoint[];
  ema50: IndicatorPoint[];
  ema200: IndicatorPoint[];
  rsi14: IndicatorPoint[];
  macd: MacdPoint[];
  bollinger: BollingerPoint[];
  atr14: IndicatorPoint[];
  vwap: IndicatorPoint[];
  anchoredVwap: IndicatorPoint[];
  adxDmi14: AdxDmiPoint[];
  rvol20: IndicatorPoint[];
  relativeStrength: IndicatorPoint[];
}

export type SignalBias =
  | 'strong_bullish'
  | 'bullish'
  | 'neutral'
  | 'bearish'
  | 'strong_bearish';

export type SignalCategoryKey =
  | 'trend'
  | 'trendStrength'
  | 'momentum'
  | 'volatility'
  | 'participation'
  | 'relative'
  | 'structure'
  | 'session';

export type SignalCategoryState =
  | 'bullish'
  | 'bearish'
  | 'neutral'
  | 'not_applicable'
  | 'unavailable';

export interface SignalScoreVector {
  bullish: number;
  bearish: number;
  neutral: number;
}

export interface SignalCategorySummary {
  status: SignalCategoryState;
  weight: number;
  contribution: SignalScoreVector;
  headline: string;
}

export interface SessionDefinition {
  exchangeTimezone: string;
  calendarId: CalendarId;
  sessionType: SessionType;
  sessionStart: number | null;
  sessionEnd: number | null;
  isEarlyClose: boolean;
}

export interface AnchorContext {
  anchorType: AnchorType;
  anchorTime: number | null;
  anchorSourceRange: SupportedRange;
  isSticky: boolean;
  label: string;
}

export interface PreviousDayContext {
  high: number | null;
  low: number | null;
  sessionStart: number | null;
  sessionEnd: number | null;
}

export interface GapContext {
  direction: 'up' | 'down' | 'flat' | 'not_applicable';
  percent: number | null;
  filled: boolean | null;
  thresholdPercent: number;
}

export interface OpeningRangeContext {
  status: DataAvailabilityStatus;
  minutes: OpeningRangeMinutes | null;
  high: number | null;
  low: number | null;
  breakState: 'inside' | 'breakout_up' | 'breakout_down' | 'not_applicable';
  sourceInterval: SupportedInterval | 'none';
  allowedMinutes: OpeningRangeMinutes[];
}

export interface RelativeContext {
  benchmark: BenchmarkSymbol | null;
  benchmarkUnavailable: boolean;
  relativeNotApplicable: boolean;
}

export interface AnalysisContext {
  mode: AnalysisMode;
  sessionDefinition: SessionDefinition;
  anchor: AnchorContext;
  previousDay: PreviousDayContext;
  gap: GapContext;
  openingRange: OpeningRangeContext;
  relative: RelativeContext;
  participationMode: 'rvol_tod' | 'rvol_classic' | 'unavailable';
  gapThresholdPercent: number;
  adxHeuristicThreshold: number;
}

export interface SignalSummary {
  bias: SignalBias;
  label: string;
  confidence: 'low' | 'medium' | 'high';
  confidenceValue: number;
  coverageFactor: number;
  scores: SignalScoreVector;
  categories: Record<SignalCategoryKey, SignalCategorySummary>;
  bullets: string[];
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
  mode: AnalysisMode;
  session: SessionType;
  benchmark: BenchmarkSymbol | null;
  orMinutes: OpeningRangeMinutes | null;
  anchorType: AnchorType;
  anchorTime: number | null;
  instrument: InstrumentMeta;
  candles: Candle[];
  indicators: CandleIndicators;
  analysisContext: AnalysisContext;
  signalSummary: SignalSummary;
  provider: ProviderId;
  cached: boolean;
}

export type IndicatorVisibility = Record<IndicatorToggleKey, boolean>;
