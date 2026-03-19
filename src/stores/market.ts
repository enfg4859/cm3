import { defineStore } from 'pinia';
import type {
  CandlesResponse,
  IndicatorToggleKey,
  IndicatorVisibility,
  ProviderId,
  QuoteResponse,
  SearchResponse,
  SearchResult,
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
    atr: true
  };
}

export const useMarketStore = defineStore('market', {
  state: () => ({
    selectedSymbol: 'AAPL',
    searchQuery: 'AAPL',
    searchResults: [] as SearchResult[],
    quoteResponse: null as QuoteResponse | null,
    candlesResponse: null as CandlesResponse | null,
    health: null as HealthResponse | null,
    range: '3M' as SupportedRange,
    interval: '1day' as SupportedInterval,
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
    signalSummary: (state) => state.candlesResponse?.signalSummary ?? null
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
            `/api/candles?symbol=${encodeURIComponent(normalized)}&range=${this.range}&interval=${this.interval}`
          )
        ]);

        this.quoteResponse = quoteResponse;
        this.candlesResponse = candlesResponse;
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
      if (this.selectedSymbol) {
        await this.loadDashboard(this.selectedSymbol);
      }
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
