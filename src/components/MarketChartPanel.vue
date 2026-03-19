<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart
} from 'lightweight-charts';
import type { IChartApi, UTCTimestamp } from 'lightweight-charts';
import type { CandlesResponse, IndicatorVisibility } from '@shared/market';
import { formatCompactNumber } from '@/utils/format';
import { useI18n } from '@/utils/i18n';

const props = defineProps<{
  response: CandlesResponse;
  visibility: IndicatorVisibility;
}>();
const { dateLocale, t } = useI18n();
type SubPanelKey = 'volume' | 'rsi' | 'macd' | 'atr';

const priceRef = ref<HTMLDivElement | null>(null);
const volumeRef = ref<HTMLDivElement | null>(null);
const rsiRef = ref<HTMLDivElement | null>(null);
const macdRef = ref<HTMLDivElement | null>(null);
const atrRef = ref<HTMLDivElement | null>(null);

let charts: Array<{ chart: IChartApi; container: HTMLDivElement }> = [];
let resizeObserver: ResizeObserver | null = null;

const latestCandle = computed(() => props.response.candles.at(-1));

const legendItems = computed(() => {
  const items: Array<{ label: string; value: string; color: string }> = [];
  const latest = latestCandle.value;

  if (!latest) {
    return items;
  }

  function lastPoint<T extends { time: number; value: number | null }>(series: T[]) {
    return [...series].reverse().find((entry) => entry.value !== null);
  }

  if (props.visibility.ema20) {
    const point = lastPoint(props.response.indicators.ema20);
    if (point?.value !== null && point?.value !== undefined) {
      items.push({ label: 'EMA 20', value: point.value.toFixed(2), color: '#c0c1ff' });
    }
  }

  if (props.visibility.ema50) {
    const point = lastPoint(props.response.indicators.ema50);
    if (point?.value !== null && point?.value !== undefined) {
      items.push({ label: 'EMA 50', value: point.value.toFixed(2), color: '#4edea3' });
    }
  }

  if (props.visibility.ema200) {
    const point = lastPoint(props.response.indicators.ema200);
    if (point?.value !== null && point?.value !== undefined) {
      items.push({ label: 'EMA 200', value: point.value.toFixed(2), color: '#8083ff' });
    }
  }

  if (props.visibility.bollinger) {
    const point = [...props.response.indicators.bollinger]
      .reverse()
      .find((entry) => entry.middle !== null);

    if (point?.middle !== null && point?.middle !== undefined) {
      items.push({ label: t('chart.legend.bbMid'), value: point.middle.toFixed(2), color: '#908fa0' });
    }
  }

  items.push({
    label: t('chart.legend.close'),
    value: latest.close.toFixed(2),
    color: latest.close >= latest.open ? '#4edea3' : '#ff516a'
  });

  return items;
});

const activeSubPanels = computed(() => [
  {
    key: 'volume',
    label: t('chart.panel.volume'),
    value: latestCandle.value ? formatCompactNumber(latestCandle.value.volume, dateLocale.value) : '--',
    active: props.visibility.volume
  },
  {
    key: 'rsi',
    label: t('chart.panel.rsi'),
    value:
      [...props.response.indicators.rsi14].reverse().find((entry) => entry.value !== null)?.value?.toFixed(2) ??
      '--',
    active: props.visibility.rsi
  },
  {
    key: 'macd',
    label: t('chart.panel.macd'),
    value:
      [...props.response.indicators.macd].reverse().find((entry) => entry.histogram !== null)?.histogram?.toFixed(2) ??
      '--',
    active: props.visibility.macd
  },
  {
    key: 'atr',
    label: t('chart.panel.atr'),
    value:
      [...props.response.indicators.atr14].reverse().find((entry) => entry.value !== null)?.value?.toFixed(2) ??
      '--',
    active: props.visibility.atr
  }
].filter((panel) => panel.active));

const subPanelMeta = computed(() => {
  const values = new Map(activeSubPanels.value.map((panel) => [panel.key as SubPanelKey, panel.value]));

  function createPanelMeta(key: SubPanelKey) {
    const label = t(`chart.panel.${key}`);

    return {
      label,
      value: values.get(key) ?? '--',
      description: t(`chart.panel.info.${key}`),
      infoLabel: t('chart.panel.infoLabel', { label })
    };
  }

  return {
    volume: createPanelMeta('volume'),
    rsi: createPanelMeta('rsi'),
    macd: createPanelMeta('macd'),
    atr: createPanelMeta('atr')
  };
});

function toChartTime(timestamp: number) {
  return timestamp as UTCTimestamp;
}

function mapLineSeries(points: Array<{ time: number; value: number | null }>) {
  return points
    .filter((point) => point.value !== null)
    .map((point) => ({ time: toChartTime(point.time), value: point.value as number }));
}

function createBaseChart(container: HTMLDivElement, height: number) {
  return createChart(container, {
    width: container.clientWidth,
    height,
    layout: {
      background: {
        type: ColorType.Solid,
        color: '#0b1326'
      },
      textColor: '#c7c4d7',
      fontFamily: 'Inter'
    },
    grid: {
      vertLines: {
        color: 'rgba(70, 69, 84, 0.10)'
      },
      horzLines: {
        color: 'rgba(70, 69, 84, 0.10)'
      }
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: 'rgba(192, 193, 255, 0.18)',
        labelBackgroundColor: '#2d3449'
      },
      horzLine: {
        color: 'rgba(192, 193, 255, 0.18)',
        labelBackgroundColor: '#2d3449'
      }
    },
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.08, bottom: 0.14 }
    },
    timeScale: {
      borderVisible: false,
      timeVisible: props.response.interval !== '1day',
      secondsVisible: false
    },
    localization: {
      locale: dateLocale.value
    }
  });
}

function syncCharts(instances: IChartApi[]) {
  let isSyncing = false;

  instances.forEach((source) => {
    source.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (isSyncing || !range) {
        return;
      }

      isSyncing = true;
      instances.forEach((target) => {
        if (target !== source) {
          target.timeScale().setVisibleLogicalRange(range);
        }
      });
      isSyncing = false;
    });
  });
}

function destroyCharts() {
  resizeObserver?.disconnect();
  resizeObserver = null;
  charts.forEach(({ chart }) => chart.remove());
  charts = [];
}

function registerChart(chart: IChartApi, container: HTMLDivElement) {
  charts.push({ chart, container });
}

function setupPriceChart() {
  if (!priceRef.value) {
    return;
  }

  const chart = createBaseChart(priceRef.value, 460);
  registerChart(chart, priceRef.value);

  const candlesSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#4edea3',
    downColor: '#ff516a',
    wickUpColor: '#4edea3',
    wickDownColor: '#ff516a',
    borderVisible: false
  });

  candlesSeries.setData(
    props.response.candles.map((candle) => ({
      time: toChartTime(candle.time),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    }))
  );

  if (props.visibility.ema20) {
    const series = chart.addSeries(LineSeries, {
      color: '#c0c1ff',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });
    series.setData(mapLineSeries(props.response.indicators.ema20));
  }

  if (props.visibility.ema50) {
    const series = chart.addSeries(LineSeries, {
      color: '#4edea3',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });
    series.setData(mapLineSeries(props.response.indicators.ema50));
  }

  if (props.visibility.ema200) {
    const series = chart.addSeries(LineSeries, {
      color: '#8083ff',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });
    series.setData(mapLineSeries(props.response.indicators.ema200));
  }

  if (props.visibility.bollinger) {
    const upper = chart.addSeries(LineSeries, {
      color: 'rgba(144, 143, 160, 0.88)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const middle = chart.addSeries(LineSeries, {
      color: 'rgba(144, 143, 160, 0.44)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const lower = chart.addSeries(LineSeries, {
      color: 'rgba(144, 143, 160, 0.88)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false
    });

    upper.setData(
      props.response.indicators.bollinger
        .filter((point) => point.upper !== null)
        .map((point) => ({ time: toChartTime(point.time), value: point.upper as number }))
    );
    middle.setData(
      props.response.indicators.bollinger
        .filter((point) => point.middle !== null)
        .map((point) => ({ time: toChartTime(point.time), value: point.middle as number }))
    );
    lower.setData(
      props.response.indicators.bollinger
        .filter((point) => point.lower !== null)
        .map((point) => ({ time: toChartTime(point.time), value: point.lower as number }))
    );
  }

  chart.timeScale().fitContent();
}

function setupVolumeChart() {
  if (!volumeRef.value || !props.visibility.volume) {
    return;
  }

  const chart = createBaseChart(volumeRef.value, 168);
  registerChart(chart, volumeRef.value);
  chart.priceScale('right').applyOptions({
    scaleMargins: { top: 0.18, bottom: 0 }
  });

  const series = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceLineVisible: false,
    lastValueVisible: false
  });

  series.setData(
    props.response.candles.map((candle) => ({
      time: toChartTime(candle.time),
      value: candle.volume,
      color: candle.close >= candle.open ? 'rgba(78, 222, 163, 0.45)' : 'rgba(255, 81, 106, 0.45)'
    }))
  );
}

function setupRsiChart() {
  if (!rsiRef.value || !props.visibility.rsi) {
    return;
  }

  const chart = createBaseChart(rsiRef.value, 168);
  registerChart(chart, rsiRef.value);
  chart.priceScale('right').applyOptions({
    autoScale: false,
    scaleMargins: { top: 0.1, bottom: 0.1 }
  });

  const series = chart.addSeries(LineSeries, {
    color: '#c0c1ff',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false
  });

  series.setData(mapLineSeries(props.response.indicators.rsi14));
  series.createPriceLine({
    price: 70,
    color: 'rgba(255, 81, 106, 0.42)',
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: false,
    title: '70'
  });
  series.createPriceLine({
    price: 30,
    color: 'rgba(78, 222, 163, 0.42)',
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: false,
    title: '30'
  });
}

function setupMacdChart() {
  if (!macdRef.value || !props.visibility.macd) {
    return;
  }

  const chart = createBaseChart(macdRef.value, 168);
  registerChart(chart, macdRef.value);
  chart.priceScale('right').applyOptions({
    scaleMargins: { top: 0.2, bottom: 0.18 }
  });

  const histogram = chart.addSeries(HistogramSeries, {
    priceLineVisible: false,
    lastValueVisible: false
  });
  const macdLine = chart.addSeries(LineSeries, {
    color: '#c0c1ff',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false
  });
  const signalLine = chart.addSeries(LineSeries, {
    color: '#ff516a',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false
  });

  histogram.setData(
    props.response.indicators.macd
      .filter((point) => point.histogram !== null)
      .map((point) => ({
        time: toChartTime(point.time),
        value: point.histogram as number,
        color:
          (point.histogram ?? 0) >= 0 ? 'rgba(78, 222, 163, 0.42)' : 'rgba(255, 81, 106, 0.42)'
      }))
  );

  macdLine.setData(
    props.response.indicators.macd
      .filter((point) => point.macd !== null)
      .map((point) => ({ time: toChartTime(point.time), value: point.macd as number }))
  );
  signalLine.setData(
    props.response.indicators.macd
      .filter((point) => point.signal !== null)
      .map((point) => ({ time: toChartTime(point.time), value: point.signal as number }))
  );
}

function setupAtrChart() {
  if (!atrRef.value || !props.visibility.atr) {
    return;
  }

  const chart = createBaseChart(atrRef.value, 168);
  registerChart(chart, atrRef.value);

  const series = chart.addSeries(LineSeries, {
    color: '#ffb2b7',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false
  });

  series.setData(mapLineSeries(props.response.indicators.atr14));
}

function buildCharts() {
  destroyCharts();
  setupPriceChart();
  setupVolumeChart();
  setupRsiChart();
  setupMacdChart();
  setupAtrChart();

  syncCharts(charts.map(({ chart }) => chart));

  resizeObserver = new ResizeObserver(() => {
    charts.forEach(({ chart, container }) => {
      chart.applyOptions({ width: container.clientWidth });
    });
  });

  charts.forEach(({ container }) => resizeObserver?.observe(container));
}

watch(
  () => [
    props.response,
    props.visibility.ema20,
    props.visibility.ema50,
    props.visibility.ema200,
    props.visibility.bollinger,
    props.visibility.volume,
    props.visibility.rsi,
    props.visibility.macd,
    props.visibility.atr
  ],
  async () => {
    await nextTick();
    buildCharts();
  },
  { immediate: true, deep: true }
);

onBeforeUnmount(() => {
  destroyCharts();
});
</script>

<template>
  <v-card class="chart-panel surface-panel" rounded="xl">
    <div class="chart-panel__frame">
      <div class="chart-legend">
        <span v-for="item in legendItems" :key="item.label" class="legend-chip">
          <span class="legend-chip__swatch" :style="{ backgroundColor: item.color }" />
          <span>{{ item.label }}: {{ item.value }}</span>
        </span>
      </div>
      <div ref="priceRef" class="chart-surface" />
    </div>

    <div v-if="activeSubPanels.length" class="indicator-grid indicator-grid--chart mt-4">
      <v-card
        v-if="visibility.volume"
        class="surface-panel surface-panel--high pa-4"
        rounded="xl"
      >
        <div class="metric-row indicator-panel__header mb-3">
          <div class="indicator-panel__title">
            <span class="muted-label">{{ subPanelMeta.volume.label }}</span>
            <v-tooltip content-class="indicator-tooltip" location="top" open-delay="120">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  :aria-label="subPanelMeta.volume.infoLabel"
                  class="indicator-panel__info"
                  density="comfortable"
                  icon="mdi-information-outline"
                  size="x-small"
                  variant="text"
                />
              </template>
              <span>{{ subPanelMeta.volume.description }}</span>
            </v-tooltip>
          </div>
          <span>{{ subPanelMeta.volume.value }}</span>
        </div>
        <div ref="volumeRef" class="chart-surface" style="height: 168px;" />
      </v-card>

      <v-card v-if="visibility.rsi" class="surface-panel surface-panel--high pa-4" rounded="xl">
        <div class="metric-row indicator-panel__header mb-3">
          <div class="indicator-panel__title">
            <span class="muted-label">{{ subPanelMeta.rsi.label }}</span>
            <v-tooltip content-class="indicator-tooltip" location="top" open-delay="120">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  :aria-label="subPanelMeta.rsi.infoLabel"
                  class="indicator-panel__info"
                  density="comfortable"
                  icon="mdi-information-outline"
                  size="x-small"
                  variant="text"
                />
              </template>
              <span>{{ subPanelMeta.rsi.description }}</span>
            </v-tooltip>
          </div>
          <span>{{ subPanelMeta.rsi.value }}</span>
        </div>
        <div ref="rsiRef" class="chart-surface" style="height: 168px;" />
      </v-card>

      <v-card v-if="visibility.macd" class="surface-panel surface-panel--high pa-4" rounded="xl">
        <div class="metric-row indicator-panel__header mb-3">
          <div class="indicator-panel__title">
            <span class="muted-label">{{ subPanelMeta.macd.label }}</span>
            <v-tooltip content-class="indicator-tooltip" location="top" open-delay="120">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  :aria-label="subPanelMeta.macd.infoLabel"
                  class="indicator-panel__info"
                  density="comfortable"
                  icon="mdi-information-outline"
                  size="x-small"
                  variant="text"
                />
              </template>
              <span>{{ subPanelMeta.macd.description }}</span>
            </v-tooltip>
          </div>
          <span>{{ subPanelMeta.macd.value }}</span>
        </div>
        <div ref="macdRef" class="chart-surface" style="height: 168px;" />
      </v-card>

      <v-card v-if="visibility.atr" class="surface-panel surface-panel--high pa-4" rounded="xl">
        <div class="metric-row indicator-panel__header mb-3">
          <div class="indicator-panel__title">
            <span class="muted-label">{{ subPanelMeta.atr.label }}</span>
            <v-tooltip content-class="indicator-tooltip" location="top" open-delay="120">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  :aria-label="subPanelMeta.atr.infoLabel"
                  class="indicator-panel__info"
                  density="comfortable"
                  icon="mdi-information-outline"
                  size="x-small"
                  variant="text"
                />
              </template>
              <span>{{ subPanelMeta.atr.description }}</span>
            </v-tooltip>
          </div>
          <span>{{ subPanelMeta.atr.value }}</span>
        </div>
        <div ref="atrRef" class="chart-surface" style="height: 168px;" />
      </v-card>
    </div>
  </v-card>
</template>
