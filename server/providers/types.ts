import type {
  Candle,
  InstrumentMeta,
  ProviderId,
  Quote,
  SearchResult,
  SessionType,
  SupportedInterval,
  SupportedRange
} from '@shared/market';

export interface CandleRequest {
  symbol: string;
  interval: SupportedInterval;
  range: SupportedRange;
  warmupBars?: number;
  sessionType?: SessionType;
}

export interface MarketDataProvider {
  readonly id: ProviderId;
  search(query: string): Promise<SearchResult[]>;
  getInstrument(symbol: string): Promise<InstrumentMeta>;
  getQuote(symbol: string): Promise<Quote>;
  getCandles(request: CandleRequest): Promise<Candle[]>;
}
