import { createError } from 'h3';
import type { AssetType, Candle, InstrumentMeta, Quote, SearchResult } from '@shared/market';
import type { CandleRequest, MarketDataProvider } from './types';
import { ensureAscendingCandles, getVisibleBarCount } from '../utils/market';

const API_BASE_URL = 'https://api.twelvedata.com';

interface TwelveDataSearchResponse {
  data?: Array<{
    symbol: string;
    instrument_name: string;
    exchange: string;
    instrument_type: string;
  }>;
  code?: number;
  message?: string;
  status?: string;
}

interface TwelveDataQuoteResponse {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  close: string;
  change: string;
  percent_change: string;
  previous_close: string;
  open: string;
  high: string;
  low: string;
  volume: string;
  is_market_open?: boolean;
  code?: number;
  message?: string;
  status?: string;
}

interface TwelveDataTimeSeriesResponse {
  values?: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
  code?: number;
  message?: string;
  status?: string;
}

function toNumber(value: string | number | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTimestamp(datetime: string) {
  const normalized = datetime.includes('T') ? datetime : datetime.replace(' ', 'T');
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized);
  const isoLike =
    /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? `${normalized}T00:00:00Z`
      : hasTimezone
        ? normalized
        : `${normalized}Z`;
  const parsed = Date.parse(isoLike);

  if (Number.isFinite(parsed)) {
    return Math.floor(parsed / 1000);
  }

  throw createError({
    statusCode: 502,
    statusMessage: `Unable to parse candle timestamp ${datetime}.`
  });
}

function toAssetType(instrumentType?: string, exchange?: string): AssetType {
  const normalizedType = instrumentType?.toLowerCase() ?? '';
  const normalizedExchange = exchange?.toLowerCase() ?? '';

  if (normalizedType.includes('etf')) {
    return 'etf';
  }

  if (normalizedType.includes('crypto') || normalizedExchange.includes('crypto')) {
    return 'crypto';
  }

  if (normalizedType.includes('forex') || normalizedType.includes('fx')) {
    return 'fx';
  }

  if (normalizedType.includes('index')) {
    return 'index';
  }

  if (normalizedType.includes('stock') || normalizedType.includes('equity')) {
    return 'equity';
  }

  return 'other';
}

function toInstrumentMeta(symbol: string, name: string, exchange: string, instrumentType?: string): InstrumentMeta {
  const assetType = toAssetType(instrumentType, exchange);
  const isUsEquityLike = assetType === 'equity' || assetType === 'etf';
  const isAlwaysOpen = assetType === 'crypto' || assetType === 'fx';

  return {
    symbol,
    name,
    exchange,
    assetType,
    exchangeTimezone: isUsEquityLike ? 'America/New_York' : 'UTC',
    calendarId: isAlwaysOpen ? 'ALWAYS_OPEN' : 'US_EQUITIES',
    supportsExtendedHours: isUsEquityLike,
    supportsRelativeStrength: isUsEquityLike
  };
}

export class TwelveDataProvider implements MarketDataProvider {
  readonly id = 'twelvedata' as const;

  constructor(private readonly apiKey: string) {}

  private async request<T>(path: string, params: Record<string, string | number | boolean>) {
    const url = new URL(`${API_BASE_URL}/${path}`);
    url.searchParams.set('apikey', this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    const response = await fetch(url);
    const body = await response.text();
    let payload: T & {
      code?: number;
      message?: string;
      status?: string;
    };

    try {
      payload = (body ? JSON.parse(body) : {}) as T & {
        code?: number;
        message?: string;
        status?: string;
      };
    } catch {
      throw createError({
        statusCode: 502,
        statusMessage: `Twelve Data returned a non-JSON response for ${path} (${response.status}).`
      });
    }

    if (!response.ok || payload.code || payload.status === 'error') {
      throw createError({
        statusCode: payload.code === 400 || payload.code === 404 ? 404 : 502,
        statusMessage: payload.message ?? `Twelve Data request failed for ${path}.`
      });
    }

    return payload;
  }

  async search(query: string): Promise<SearchResult[]> {
    const payload = await this.request<TwelveDataSearchResponse>('symbol_search', {
      symbol: query.trim(),
      outputsize: 8
    });

    return (payload.data ?? []).map((item) => ({
      symbol: item.symbol,
      name: item.instrument_name,
      exchange: item.exchange,
      type: item.instrument_type
    }));
  }

  async getInstrument(symbol: string): Promise<InstrumentMeta> {
    const payload = await this.request<TwelveDataSearchResponse>('symbol_search', {
      symbol: symbol.toUpperCase(),
      outputsize: 1
    });
    const match = payload.data?.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase()) ?? payload.data?.[0];

    if (!match) {
      throw createError({
        statusCode: 404,
        statusMessage: `Unable to resolve instrument metadata for ${symbol.toUpperCase()}.`
      });
    }

    return toInstrumentMeta(match.symbol, match.instrument_name, match.exchange, match.instrument_type);
  }

  async getQuote(symbol: string): Promise<Quote> {
    const [payload, instrument] = await Promise.all([
      this.request<TwelveDataQuoteResponse>('quote', {
        symbol: symbol.toUpperCase()
      }),
      this.getInstrument(symbol)
    ]);

    return {
      symbol: payload.symbol,
      name: payload.name,
      exchange: payload.exchange,
      currency: payload.currency,
      price: toNumber(payload.close),
      change: toNumber(payload.change),
      changePercent: toNumber(payload.percent_change),
      previousClose: toNumber(payload.previous_close),
      open: toNumber(payload.open),
      high: toNumber(payload.high),
      low: toNumber(payload.low),
      volume: toNumber(payload.volume),
      marketStatus: payload.is_market_open ? 'open' : 'closed',
      updatedAt: Math.floor(Date.now() / 1000),
      assetType: instrument.assetType,
      exchangeTimezone: instrument.exchangeTimezone,
      calendarId: instrument.calendarId,
      supportsExtendedHours: instrument.supportsExtendedHours
    };
  }

  async getCandles(request: CandleRequest): Promise<Candle[]> {
    const outputsize = getVisibleBarCount(request.range, request.interval) + (request.warmupBars ?? 0);
    const payload = await this.request<TwelveDataTimeSeriesResponse>('time_series', {
      symbol: request.symbol.toUpperCase(),
      interval: request.interval,
      outputsize,
      format: 'JSON',
      order: 'DESC',
      timezone: 'UTC',
      prepost: request.sessionType === 'extended'
    });

    if (!payload.values?.length) {
      throw createError({
        statusCode: 404,
        statusMessage: `No candle data returned for ${request.symbol.toUpperCase()}.`
      });
    }

    return ensureAscendingCandles(
      payload.values.map((value) => ({
        time: toTimestamp(value.datetime),
        open: toNumber(value.open),
        high: toNumber(value.high),
        low: toNumber(value.low),
        close: toNumber(value.close),
        volume: toNumber(value.volume)
      }))
    );
  }
}
