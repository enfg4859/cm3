<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import {
  ANALYSIS_MODE_OPTIONS,
  ANCHOR_TYPE_OPTIONS,
  BENCHMARK_OPTIONS,
  INTERVAL_OPTIONS,
  OPENING_RANGE_OPTIONS,
  RANGE_OPTIONS,
  SESSION_OPTIONS,
  type SearchResult
} from '@shared/market';
import { formatCurrency, formatPercent, formatSignedCurrency, formatTimestamp } from '@/utils/format';
import {
  localizeAnalysisStatus,
  localizeAnchorContext,
  localizeApiStatus,
  localizeSessionType,
  translateErrorMessage,
  useI18n
} from '@/utils/i18n';
import { useMarketStore } from '@/stores/market';
import DashboardState from '@/components/DashboardState.vue';
import IndicatorToggles from '@/components/IndicatorToggles.vue';
import MarketChartPanel from '@/components/MarketChartPanel.vue';
import QuoteSummaryCards from '@/components/QuoteSummaryCards.vue';
import SignalSummaryCard from '@/components/SignalSummaryCard.vue';
import SymbolSearch from '@/components/SymbolSearch.vue';

const store = useMarketStore();
const { locale, dateLocale, t } = useI18n();
const quickSuggestions = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'BTCUSD', 'SPY'];
const sideRailItems = computed(() => [
  { icon: 'mdi-chart-candlestick', label: t('side.chart'), active: true },
  { icon: 'mdi-chart-bell-curve', label: t('side.indicators') },
  { icon: 'mdi-bell-outline', label: t('side.alerts') },
  { icon: 'mdi-vector-polyline', label: t('side.objects') },
  { icon: 'mdi-layers-outline', label: t('side.layers') }
]);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const quote = computed(() => store.quote);
const signalSummary = computed(() => store.signalSummary);
const analysisContext = computed(() => store.analysisContext);
const isPositive = computed(() => (quote.value?.changePercent ?? 0) >= 0);
const providerMode = computed(() =>
  store.providerLabel === 'twelvedata' && store.health?.apiConfigured ? t('provider.live') : t('provider.mock')
);
const marketStatus = computed(() => {
  if (!quote.value) {
    return t('market.awaiting');
  }

  switch (quote.value.marketStatus) {
    case 'open':
      return t('market.open');
    case 'extended':
      return t('market.always');
    default:
      return t('market.closed');
  }
});
const localizedError = computed(() => translateErrorMessage(store.error));
const localizedContextSession = computed(() =>
  analysisContext.value ? localizeSessionType(analysisContext.value.sessionDefinition.sessionType) : '--'
);
const localizedAnchorLabel = computed(() =>
  analysisContext.value
    ? localizeAnchorContext(analysisContext.value.anchor, (time) => formatTimestamp(time, dateLocale.value))
    : '--'
);
const localizedRelativeLabel = computed(() => {
  if (!analysisContext.value) {
    return '--';
  }

  if (analysisContext.value.relative.relativeNotApplicable) {
    return t('context.relative.notApplicable');
  }

  if (analysisContext.value.relative.benchmarkUnavailable) {
    return t('context.relative.benchmarkUnavailable');
  }

  return analysisContext.value.relative.benchmark ?? '--';
});
const localizedOpeningRangeStatus = computed(() =>
  analysisContext.value ? localizeAnalysisStatus(analysisContext.value.openingRange.status) : '--'
);
const localizedApiStatus = computed(() => localizeApiStatus(store.health?.status ?? 'ok'));

function runSearch(symbol: string) {
  void store.loadDashboard(symbol);
}

function handleSelect(result: SearchResult) {
  void store.loadDashboard(result.symbol);
}

function handleRefresh() {
  void store.refresh();
}

function handleAnchorSelected(time: number) {
  void store.setAnchorTime(time);
}

onMounted(() => {
  void store.initialize();
});

watch(
  () => store.searchQuery,
  (value) => {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.toUpperCase() === store.selectedSymbol) {
      if (trimmed.length < 2) {
        store.searchResults = [];
        store.searchError = null;
      }
      return;
    }

    searchTimer = setTimeout(() => {
      void store.searchSymbols(trimmed);
    }, 400);
  }
);

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
});
</script>

<template>
  <v-app class="quant-app">
    <header class="top-bar">
      <div class="brand-lockup">
        <div class="brand-lockup__title">Chart Meister</div>
      </div>

      <SymbolSearch
        v-model="store.searchQuery"
        :results="store.searchResults"
        :loading="store.searchLoading"
        :error="store.searchError"
        @submit="runSearch"
        @select="handleSelect"
        @clear="store.clearSelection()"
      />

      <div class="d-flex align-center ga-3 justify-end">
        <div class="lang-toggle">
          <v-btn
            class="pill-button pill-button--lang"
            :class="{ 'pill-button--active': locale === 'ko' }"
            @click="locale = 'ko'"
          >
            {{ t('lang.ko') }}
          </v-btn>
          <v-btn
            class="pill-button pill-button--lang"
            :class="{ 'pill-button--active': locale === 'en' }"
            @click="locale = 'en'"
          >
            {{ t('lang.en') }}
          </v-btn>
        </div>
        <span class="helper-chip">{{ providerMode }}</span>
        <v-btn
          class="pill-button"
          icon="mdi-refresh"
          size="40"
          @click="handleRefresh"
        />
      </div>
    </header>

    <aside class="side-rail">
      <button
        v-for="item in sideRailItems"
        :key="item.label"
        type="button"
        class="side-rail__button"
        :class="{ 'side-rail__button--active': item.active }"
      >
        <v-icon :icon="item.icon" size="20" />
        <span class="side-rail__label">{{ item.label }}</span>
      </button>

      <div style="margin-top: auto;" class="d-flex flex-column ga-3">
        <button type="button" class="side-rail__button">
          <v-icon icon="mdi-help-circle-outline" size="20" />
          <span class="side-rail__label">{{ t('side.help') }}</span>
        </button>
        <button type="button" class="side-rail__button">
          <v-icon icon="mdi-console-line" size="20" />
          <span class="side-rail__label">{{ t('side.logs') }}</span>
        </button>
      </div>
    </aside>

    <v-main class="main-shell">
      <div class="canvas">
        <div v-if="store.dashboardLoading" class="state-shell">
          <DashboardState
            variant="loading"
            :title="t('dashboard.loading.title')"
            :description="t('dashboard.loading.description')"
          />
        </div>

        <div v-else-if="store.error" class="state-shell">
          <DashboardState
            variant="error"
            :title="t('dashboard.error.title')"
            :description="localizedError"
            :error-detail="localizedError"
            :suggestions="quickSuggestions"
            @select="runSearch"
            @retry="handleRefresh"
          />
        </div>

        <div v-else-if="!store.hasData" class="state-shell">
          <DashboardState
            variant="empty"
            :title="t('dashboard.empty.title')"
            :description="t('dashboard.empty.description')"
            :suggestions="quickSuggestions"
            @select="runSearch"
          />
        </div>

        <template v-else-if="quote && signalSummary && store.candlesResponse && analysisContext">
          <section class="headline-strip">
            <v-card class="price-hero surface-panel" rounded="xl">
              <div class="muted-label mb-4">{{ quote.name }} • {{ quote.exchange }}</div>
              <div class="d-flex align-end flex-wrap ga-4">
                <div class="price-hero__value">{{ formatCurrency(quote.price, quote.currency) }}</div>
                <div
                  class="helper-chip"
                  :style="{
                    background: isPositive ? 'rgba(78, 222, 163, 0.12)' : 'rgba(255, 81, 106, 0.12)',
                    color: isPositive ? '#4edea3' : '#ff516a'
                  }"
                >
                  <v-icon :icon="isPositive ? 'mdi-arrow-top-right' : 'mdi-arrow-bottom-right'" size="16" />
                  <span>{{ formatPercent(quote.changePercent) }}</span>
                </div>
              </div>
              <div class="text-medium-emphasis mt-4" style="font-size: 0.98rem;">
                {{ formatSignedCurrency(quote.change, quote.currency) }} {{ t('quote.versusPreviousClose') }}
              </div>
              <div class="d-flex flex-wrap ga-3 mt-6">
                <span class="helper-chip">
                  <span class="status-dot" />
                  {{ marketStatus }}
                </span>
                <span class="helper-chip">{{ formatTimestamp(quote.updatedAt, dateLocale) }}</span>
              </div>
            </v-card>

            <v-card class="control-cluster surface-panel surface-panel--high" rounded="xl">
              <div>
                <div class="muted-label mb-3">{{ t('controls.range') }}</div>
                <div class="pill-row">
                  <v-btn
                    v-for="range in RANGE_OPTIONS"
                    :key="range"
                    class="pill-button"
                    :class="{ 'pill-button--active': store.range === range }"
                    @click="store.setRange(range)"
                  >
                    {{ range }}
                  </v-btn>
                </div>
              </div>

              <div>
                <div class="muted-label mb-3">{{ t('controls.interval') }}</div>
                <div class="pill-row">
                  <v-btn
                    v-for="interval in INTERVAL_OPTIONS"
                    :key="interval"
                    class="pill-button"
                    :class="{ 'pill-button--active': store.interval === interval }"
                    @click="store.setInterval(interval)"
                  >
                    {{ interval }}
                  </v-btn>
                </div>
              </div>

              <div>
                <div class="muted-label mb-3">{{ t('controls.mode') }}</div>
                <div class="pill-row">
                  <v-btn
                    v-for="mode in ANALYSIS_MODE_OPTIONS"
                    :key="mode"
                    class="pill-button"
                    :class="{ 'pill-button--active': store.mode === mode }"
                    @click="store.setMode(mode)"
                  >
                    {{ t(`controls.modeValue.${mode}`) }}
                  </v-btn>
                </div>
              </div>

              <div class="indicator-grid">
                <div>
                  <div class="muted-label mb-3">{{ t('controls.session') }}</div>
                  <div class="pill-row">
                    <v-btn
                      v-for="session in SESSION_OPTIONS"
                      :key="session"
                      class="pill-button"
                      :class="{ 'pill-button--active': store.session === session }"
                      @click="store.setSession(session)"
                    >
                      {{ t(`controls.sessionValue.${session}`) }}
                    </v-btn>
                  </div>
                </div>

                <div>
                  <div class="muted-label mb-3">{{ t('controls.benchmark') }}</div>
                  <div class="pill-row">
                    <v-btn
                      v-for="benchmark in BENCHMARK_OPTIONS"
                      :key="benchmark"
                      class="pill-button"
                      :class="{ 'pill-button--active': store.benchmark === benchmark }"
                      @click="store.setBenchmark(benchmark)"
                    >
                      {{ benchmark }}
                    </v-btn>
                  </div>
                </div>
              </div>

              <div class="indicator-grid">
                <div>
                  <div class="muted-label mb-3">{{ t('controls.openingRange') }}</div>
                  <div class="pill-row">
                    <v-btn
                      class="pill-button"
                      :class="{ 'pill-button--active': store.orMinutes === null }"
                      @click="store.setOpeningRange(null)"
                    >
                      {{ t('controls.off') }}
                    </v-btn>
                    <v-btn
                      v-for="minutes in OPENING_RANGE_OPTIONS"
                      :key="minutes"
                      class="pill-button"
                      :class="{ 'pill-button--active': store.orMinutes === minutes }"
                      :disabled="!analysisContext.openingRange.allowedMinutes.includes(minutes)"
                      @click="store.setOpeningRange(minutes)"
                    >
                      {{ minutes }}m
                    </v-btn>
                  </div>
                </div>

                <div>
                  <div class="muted-label mb-3">{{ t('controls.anchor') }}</div>
                  <div class="pill-row">
                    <v-btn
                      v-for="anchorType in ANCHOR_TYPE_OPTIONS"
                      :key="anchorType"
                      class="pill-button"
                      :class="{ 'pill-button--active': store.anchorType === anchorType }"
                      @click="store.setAnchorType(anchorType)"
                    >
                      {{ t(`controls.anchorType.${anchorType}`) }}
                    </v-btn>
                  </div>
                  <div v-if="store.anchorType === 'manual'" class="text-medium-emphasis mt-2" style="font-size: 0.8rem;">
                    {{ store.manualAnchorArmed ? t('controls.anchorHint.pick') : t('controls.anchorHint.repick') }}
                  </div>
                </div>
              </div>
            </v-card>
          </section>

          <section class="dashboard-grid">
            <div class="workspace-column">
              <QuoteSummaryCards :quote="quote" />
              <MarketChartPanel
                :response="store.candlesResponse"
                :visibility="store.visibility"
                :manual-anchor-armed="store.manualAnchorArmed"
                @anchor-selected="handleAnchorSelected"
              />
            </div>

            <aside class="signal-column">
              <SignalSummaryCard :summary="signalSummary" />
              <IndicatorToggles
                :visibility="store.visibility"
                :response="store.candlesResponse"
                @toggle="store.toggleIndicator"
              />

              <v-card class="surface-panel pa-6" rounded="xl">
                <div class="muted-label mb-4">{{ t('context.title') }}</div>
                <div class="d-flex flex-column ga-4">
                  <div class="metric-row">
                    <span class="text-medium-emphasis">{{ t('context.session') }}</span>
                    <span>{{ localizedContextSession }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="text-medium-emphasis">{{ t('context.timezone') }}</span>
                    <span>{{ analysisContext.sessionDefinition.exchangeTimezone }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="text-medium-emphasis">{{ t('context.earlyClose') }}</span>
                    <span>{{ analysisContext.sessionDefinition.isEarlyClose ? t('common.yes') : t('common.no') }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="text-medium-emphasis">{{ t('context.anchor') }}</span>
                    <span>{{ localizedAnchorLabel }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="text-medium-emphasis">{{ t('context.relative') }}</span>
                    <span>{{ localizedRelativeLabel }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="text-medium-emphasis">{{ t('context.openingRange') }}</span>
                    <span>{{ localizedOpeningRangeStatus }}</span>
                  </div>
                </div>
              </v-card>

              <v-card class="surface-panel pa-6" rounded="xl">
                <div class="muted-label mb-4">{{ t('execution.title') }}</div>
                <div class="d-flex flex-column ga-4">
                  <div class="metric-row">
                    <span class="text-medium-emphasis">{{ t('execution.provider') }}</span>
                    <span>{{ providerMode }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="text-medium-emphasis">{{ t('execution.cache') }}</span>
                    <span>{{ store.candlesResponse.cached ? t('execution.cache.hit') : t('execution.cache.fresh') }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="text-medium-emphasis">{{ t('execution.apiStatus') }}</span>
                    <span>{{ localizedApiStatus }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="text-medium-emphasis">{{ t('execution.lastSync') }}</span>
                    <span>{{ store.lastLoadedAt ? formatTimestamp(Math.floor(store.lastLoadedAt / 1000), dateLocale) : '--' }}</span>
                  </div>
                </div>

                <div class="d-flex flex-wrap ga-2 mt-5">
                  <span class="helper-chip">{{ providerMode }}</span>
                  <span class="helper-chip">{{ store.range }} / {{ store.interval }} / {{ t(`controls.modeValue.${store.mode}`) }}</span>
                  <span class="helper-chip">{{ t('execution.validated') }}</span>
                  <span class="helper-chip">technicalindicators</span>
                </div>
              </v-card>
            </aside>
          </section>
        </template>
      </div>
    </v-main>

    <footer class="status-bar">
      <div class="status-inline">
        <span class="status-dot" />
        <span>{{ marketStatus }}</span>
      </div>
      <div class="status-inline">
        <span>{{ providerMode }}</span>
        <span v-if="quote">{{ quote.symbol }}</span>
      </div>
    </footer>
  </v-app>
</template>
