import { defineStore } from 'pinia';
import type {
  AnalysisMode,
  AnchorType,
  BenchmarkSymbol,
  CandlesResponse,
  IndicatorToggleKey,
  IndicatorVisibility,
  OpeningRangeMinutes,
  ProviderId,
  QuoteResponse,
  SearchResponse,
  SearchResult,
  SessionType,
  SupportedInterval,
  SupportedRange
} from '@shared/market';
import { fetchJson, toMessage } from '@/utils/http';

interface HealthResponse {
  status: string;
  provider: ProviderId;
  apiConfigured: boolean;
  cacheTtlMs: number;
}

function createDefaultVisibility(): IndicatorVisibility {
  return {
    ema20: true,
    ema50: true,
    ema200: true,
    bollinger: true,
    volume: true,
    rsi: true,
    macd: true,
    atr: true,
    vwap: false,
    anchoredVwap: true,
    adxDmi: true,
    rvol: false,
    relativeStrength: true,
    pdhPdl: false,
    openingRange: false
  };
}

function buildCandlesQuery(params: {
  symbol: string;
  range: SupportedRange;
  interval: SupportedInterval;
  mode: AnalysisMode;
  session: SessionType;
  benchmark: BenchmarkSymbol | null;
  orMinutes: OpeningRangeMinutes | null;
  anchorType: AnchorType;
  anchorTime: number | null;
}) {
  const query = new URLSearchParams({
    symbol: params.symbol,
    range: params.range,
    interval: params.interval,
    mode: params.mode,
    session: params.session,
    anchorType: params.anchorType
  });

  if (params.benchmark) {
    query.set('benchmark', params.benchmark);
  }

  if (params.orMinutes) {
    query.set('orMinutes', String(params.orMinutes));
  }

  if (params.anchorTime) {
    query.set('anchorTime', String(params.anchorTime));
  }

  return query.toString();
}

export const useMarketStore = defineStore('market', {
  state: () => ({
    selectedSymbol: 'AAPL',
    searchQuery: 'AAPL',
    searchResults: [] as SearchResult[],
    quoteResponse: null as QuoteResponse | null,
    candlesResponse: null as CandlesResponse | null,
    health: null as HealthResponse | null,
    range: '6M' as SupportedRange,
    interval: '1day' as SupportedInterval,
    mode: 'swing' as AnalysisMode,
    session: 'regular' as SessionType,
    benchmark: 'SPY' as BenchmarkSymbol | null,
    orMinutes: null as OpeningRangeMinutes | null,
    anchorType: 'swing_low' as AnchorType,
    anchorTime: null as number | null,
    manualAnchorArmed: false,
    visibility: createDefaultVisibility(),
    dashboardLoading: false,
    searchLoading: false,
    error: null as string | null,
    searchError: null as string | null,
    lastLoadedAt: null as number | null
  }),
  getters: {
    hasData: (state) => Boolean(state.quoteResponse && state.candlesResponse),
    providerLabel: (state) => state.health?.provider ?? state.quoteResponse?.provider ?? 'mock',
    quote: (state) => state.quoteResponse?.quote ?? null,
    signalSummary: (state) => state.candlesResponse?.signalSummary ?? null,
    analysisContext: (state) => state.candlesResponse?.analysisContext ?? null
  },
  actions: {
    async initialize() {
      await this.loadHealth();
      await this.loadDashboard(this.selectedSymbol);
    },
    async loadHealth() {
      try {
        this.health = await fetchJson<HealthResponse>('/api/health');
      } catch {
        this.health = {
          status: 'degraded',
          provider: 'mock',
          apiConfigured: false,
          cacheTtlMs: 60000
        };
      }
    },
    async searchSymbols(query: string) {
      const trimmed = query.trim();

      if (trimmed.length < 2) {
        this.searchResults = [];
        this.searchError = null;
        return;
      }

      this.searchLoading = true;
      this.searchError = null;

      try {
        const response = await fetchJson<SearchResponse>(`/api/search?q=${encodeURIComponent(trimmed)}`);
        this.searchResults = response.results;
        this.searchError = response.results.length ? null : 'No matching symbols.';
      } catch (error) {
        this.searchResults = [];
        this.searchError = toMessage(error);
      } finally {
        this.searchLoading = false;
      }
    },
    async loadDashboard(symbol = this.selectedSymbol) {
      const normalized = symbol.trim().toUpperCase();

      if (!normalized) {
        this.clearSelection();
        return;
      }

      this.selectedSymbol = normalized;
      this.searchQuery = normalized;
      this.dashboardLoading = true;
      this.error = null;

      try {
        const [quoteResponse, candlesResponse] = await Promise.all([
          fetchJson<QuoteResponse>(`/api/quote?symbol=${encodeURIComponent(normalized)}`),
          fetchJson<CandlesResponse>(
            `/api/candles?${buildCandlesQuery({
              symbol: normalized,
              range: this.range,
              interval: this.interval,
              mode: this.mode,
              session: this.session,
              benchmark: this.benchmark,
              orMinutes: this.orMinutes,
              anchorType: this.anchorType,
              anchorTime: this.anchorTime
            })}`
          )
        ]);

        this.quoteResponse = quoteResponse;
        this.candlesResponse = candlesResponse;
        this.benchmark = candlesResponse.analysisContext.relative.benchmark;
        this.anchorTime = candlesResponse.anchorTime;
        this.searchResults = [];
        this.lastLoadedAt = Date.now();
      } catch (error) {
        this.quoteResponse = null;
        this.candlesResponse = null;
        this.error = toMessage(error);
      } finally {
        this.dashboardLoading = false;
      }
    },
    async refresh() {
      if (!this.selectedSymbol) {
        return;
      }

      await this.loadDashboard(this.selectedSymbol);
    },
    async setRange(range: SupportedRange) {
      this.range = range;
      if (this.selectedSymbol) {
        await this.loadDashboard(this.selectedSymbol);
      }
    },
    async setInterval(interval: SupportedInterval) {
      this.interval = interval;
      if (interval === '1day' && this.mode === 'intraday') {
        this.mode = 'swing';
        this.orMinutes = null;
      }
      if (this.selectedSymbol) {
        await this.loadDashboard(this.selectedSymbol);
      }
    },
    async setMode(mode: AnalysisMode) {
      if (mode === 'intraday') {
        this.mode = 'intraday';
        this.range = '1D';
        this.interval = '5min';
        this.session = 'regular';
        this.benchmark = 'SPY';
        this.orMinutes = 15;
        this.anchorType = 'gap';
        this.anchorTime = null;
        this.manualAnchorArmed = false;
        this.visibility = {
          ...this.visibility,
          vwap: true,
          anchoredVwap: true,
          adxDmi: true,
          rvol: true,
          relativeStrength: true,
          pdhPdl: true,
          openingRange: true,
          atr: false,
          volume: true
        };
      } else {
        this.mode = 'swing';
        this.range = '6M';
        this.interval = '1day';
        this.session = 'regular';
        this.benchmark = 'SPY';
        this.orMinutes = null;
        this.anchorType = 'swing_low';
        this.anchorTime = null;
        this.manualAnchorArmed = false;
        this.visibility = {
          ...this.visibility,
          vwap: false,
          anchoredVwap: true,
          adxDmi: true,
          rvol: false,
          relativeStrength: true,
          pdhPdl: false,
          openingRange: false,
          atr: true,
          volume: false
        };
      }

      if (this.selectedSymbol) {
        await this.loadDashboard(this.selectedSymbol);
      }
    },
    async setSession(session: SessionType) {
      this.session = session;
      if (this.selectedSymbol) {
        await this.loadDashboard(this.selectedSymbol);
      }
    },
    async setBenchmark(benchmark: BenchmarkSymbol | null) {
      this.benchmark = benchmark;
      if (this.selectedSymbol) {
        await this.loadDashboard(this.selectedSymbol);
      }
    },
    async setOpeningRange(minutes: OpeningRangeMinutes | null) {
      this.orMinutes = minutes;
      if (this.selectedSymbol) {
        await this.loadDashboard(this.selectedSymbol);
      }
    },
    async setAnchorType(anchorType: AnchorType) {
      this.anchorType = anchorType;
      this.anchorTime = null;
      this.manualAnchorArmed = anchorType === 'manual';
      if (anchorType !== 'manual' && this.selectedSymbol) {
        await this.loadDashboard(this.selectedSymbol);
      }
    },
    async setAnchorTime(anchorTime: number | null) {
      this.anchorTime = anchorTime;
      this.manualAnchorArmed = false;
      if (this.selectedSymbol) {
        await this.loadDashboard(this.selectedSymbol);
      }
    },
    armManualAnchor() {
      this.manualAnchorArmed = true;
    },
    toggleIndicator(key: IndicatorToggleKey) {
      this.visibility[key] = !this.visibility[key];
    },
    clearSelection() {
      this.selectedSymbol = '';
      this.searchQuery = '';
      this.searchResults = [];
      this.quoteResponse = null;
      this.candlesResponse = null;
      this.error = null;
      this.searchError = null;
    }
  }
});
