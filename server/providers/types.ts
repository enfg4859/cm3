import type {
  Candle,
  ProviderId,
  Quote,
  SearchResult,
  SupportedInterval,
  SupportedRange
} from '@shared/market';

export interface CandleRequest {
  symbol: string;
  interval: SupportedInterval;
  range: SupportedRange;
  warmupBars?: number;
}

export interface MarketDataProvider {
  readonly id: ProviderId;
  search(query: string): Promise<SearchResult[]>;
  getQuote(symbol: string): Promise<Quote>;
  getCandles(request: CandleRequest): Promise<Candle[]>;
}
