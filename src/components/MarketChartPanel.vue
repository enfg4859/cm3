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
import InfoPopoverButton from '@/components/InfoPopoverButton.vue';
import { buildIndicatorExplanation } from '@/utils/explanations';
import { formatCompactNumber } from '@/utils/format';
import { useI18n } from '@/utils/i18n';

const props = defineProps<{
  response: CandlesResponse;
  visibility: IndicatorVisibility;
  manualAnchorArmed?: boolean;
}>();

const emit = defineEmits<{
  anchorSelected: [time: number];
}>();

const { dateLocale, t } = useI18n();

const priceRef = ref<HTMLDivElement | null>(null);
const volumeRef = ref<HTMLDivElement | null>(null);
const rsiRef = ref<HTMLDivElement | null>(null);
const macdRef = ref<HTMLDivElement | null>(null);
const atrRef = ref<HTMLDivElement | null>(null);
const adxRef = ref<HTMLDivElement | null>(null);
const rvolRef = ref<HTMLDivElement | null>(null);
const relativeRef = ref<HTMLDivElement | null>(null);

let charts: Array<{ chart: IChartApi; container: HTMLDivElement }> = [];
let resizeObserver: ResizeObserver | null = null;

const latestCandle = computed(() => props.response.candles.at(-1));

function lastPoint<T extends { time: number; value: number | null }>(series: T[]) {
  return [...series].reverse().find((entry) => entry.value !== null);
}

const legendItems = computed(() => {
  const items: Array<{ label: string; value: string; color: string }> = [];
  const latest = latestCandle.value;

  if (!latest) {
    return items;
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

  if (props.visibility.vwap) {
    const point = lastPoint(props.response.indicators.vwap);
    if (point?.value !== null && point?.value !== undefined) {
      items.push({ label: t('chart.legend.vwap'), value: point.value.toFixed(2), color: '#ffcb77' });
    }
  }

  if (props.visibility.anchoredVwap) {
    const point = lastPoint(props.response.indicators.anchoredVwap);
    if (point?.value !== null && point?.value !== undefined) {
      items.push({ label: t('chart.legend.avwap'), value: point.value.toFixed(2), color: '#ff8c42' });
    }
  }

  items.push({
    label: t('chart.legend.close'),
    value: latest.close.toFixed(2),
    color: latest.close >= latest.open ? '#4edea3' : '#ff516a'
  });

  return items;
});

const panelMeta = computed(() => ({
  volume: {
    key: 'volume' as const,
    label: t('chart.panel.volume'),
    value: latestCandle.value ? formatCompactNumber(latestCandle.value.volume, dateLocale.value) : '--',
    description: t('chart.panel.info.volume')
  },
  rsi: {
    key: 'rsi' as const,
    label: t('chart.panel.rsi'),
    value: lastPoint(props.response.indicators.rsi14)?.value?.toFixed(2) ?? '--',
    description: t('chart.panel.info.rsi')
  },
  macd: {
    key: 'macd' as const,
    label: t('chart.panel.macd'),
    value: [...props.response.indicators.macd].reverse().find((entry) => entry.histogram !== null)?.histogram?.toFixed(2) ?? '--',
    description: t('chart.panel.info.macd')
  },
  atr: {
    key: 'atr' as const,
    label: t('chart.panel.atr'),
    value: lastPoint(props.response.indicators.atr14)?.value?.toFixed(2) ?? '--',
    description: t('chart.panel.info.atr')
  },
  adx: {
    key: 'adxDmi' as const,
    label: t('chart.panel.adxDmi'),
    value: [...props.response.indicators.adxDmi14].reverse().find((entry) => entry.adx !== null)?.adx?.toFixed(2) ?? '--',
    description: t('chart.panel.info.adxDmi')
  },
  rvol: {
    key: 'rvol' as const,
    label:
      props.response.analysisContext.participationMode === 'rvol_tod'
        ? t('chart.panel.rvolTod')
        : props.response.analysisContext.participationMode === 'rvol_classic'
          ? t('chart.panel.rvol')
          : t('chart.panel.rvolUnavailable'),
    value: lastPoint(props.response.indicators.rvol20)?.value?.toFixed(2) ?? '--',
    description: t('chart.panel.info.rvol')
  },
  relative: {
    key: 'relativeStrength' as const,
    label: t('chart.panel.relativeStrength'),
    value: lastPoint(props.response.indicators.relativeStrength)?.value?.toFixed(4) ?? '--',
    description: t('chart.panel.info.relativeStrength')
  }
}));

const panelExplanations = computed(() => ({
  volume: buildIndicatorExplanation(props.response, 'volume', t, dateLocale.value),
  rsi: buildIndicatorExplanation(props.response, 'rsi', t, dateLocale.value),
  macd: buildIndicatorExplanation(props.response, 'macd', t, dateLocale.value),
  atr: buildIndicatorExplanation(props.response, 'atr', t, dateLocale.value),
  adx: buildIndicatorExplanation(props.response, 'adxDmi', t, dateLocale.value),
  rvol: buildIndicatorExplanation(props.response, 'rvol', t, dateLocale.value),
  relative: buildIndicatorExplanation(props.response, 'relativeStrength', t, dateLocale.value)
}));

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
      background: { type: ColorType.Solid, color: '#0b1326' },
      textColor: '#c7c4d7',
      fontFamily: 'Inter'
    },
    grid: {
      vertLines: { color: 'rgba(70, 69, 84, 0.10)' },
      horzLines: { color: 'rgba(70, 69, 84, 0.10)' }
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: 'rgba(192, 193, 255, 0.18)', labelBackgroundColor: '#2d3449' },
      horzLine: { color: 'rgba(192, 193, 255, 0.18)', labelBackgroundColor: '#2d3449' }
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
    localization: { locale: dateLocale.value }
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
    const series = chart.addSeries(LineSeries, { color: '#c0c1ff', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
    series.setData(mapLineSeries(props.response.indicators.ema20));
  }

  if (props.visibility.ema50) {
    const series = chart.addSeries(LineSeries, { color: '#4edea3', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
    series.setData(mapLineSeries(props.response.indicators.ema50));
  }

  if (props.visibility.ema200) {
    const series = chart.addSeries(LineSeries, { color: '#8083ff', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
    series.setData(mapLineSeries(props.response.indicators.ema200));
  }

  if (props.visibility.bollinger) {
    const upper = chart.addSeries(LineSeries, { color: 'rgba(144, 143, 160, 0.88)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
    const middle = chart.addSeries(LineSeries, { color: 'rgba(144, 143, 160, 0.44)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const lower = chart.addSeries(LineSeries, { color: 'rgba(144, 143, 160, 0.88)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });

    upper.setData(props.response.indicators.bollinger.filter((point) => point.upper !== null).map((point) => ({ time: toChartTime(point.time), value: point.upper as number })));
    middle.setData(props.response.indicators.bollinger.filter((point) => point.middle !== null).map((point) => ({ time: toChartTime(point.time), value: point.middle as number })));
    lower.setData(props.response.indicators.bollinger.filter((point) => point.lower !== null).map((point) => ({ time: toChartTime(point.time), value: point.lower as number })));
  }

  if (props.visibility.vwap) {
    const series = chart.addSeries(LineSeries, { color: '#ffcb77', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
    series.setData(mapLineSeries(props.response.indicators.vwap));
  }

  if (props.visibility.anchoredVwap) {
    const series = chart.addSeries(LineSeries, { color: '#ff8c42', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
    series.setData(mapLineSeries(props.response.indicators.anchoredVwap));
  }

  if (props.visibility.pdhPdl) {
    const { high, low } = props.response.analysisContext.previousDay;
    if (high !== null) {
      candlesSeries.createPriceLine({ price: high, color: 'rgba(106, 225, 255, 0.75)', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: 'PDH' });
    }
    if (low !== null) {
      candlesSeries.createPriceLine({ price: low, color: 'rgba(106, 225, 255, 0.45)', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: 'PDL' });
    }
  }

  if (props.visibility.openingRange && props.response.analysisContext.openingRange.status === 'ready') {
    const { high, low } = props.response.analysisContext.openingRange;
    if (high !== null) {
      candlesSeries.createPriceLine({ price: high, color: 'rgba(255, 209, 102, 0.85)', lineStyle: LineStyle.Dotted, lineWidth: 1, axisLabelVisible: false, title: 'ORH' });
    }
    if (low !== null) {
      candlesSeries.createPriceLine({ price: low, color: 'rgba(255, 209, 102, 0.55)', lineStyle: LineStyle.Dotted, lineWidth: 1, axisLabelVisible: false, title: 'ORL' });
    }
  }

  chart.subscribeClick((param) => {
    if (!props.manualAnchorArmed || !param.time) {
      return;
    }

    emit('anchorSelected', Number(param.time));
  });

  chart.timeScale().fitContent();
}

function setupVolumeChart() {
  if (!volumeRef.value || !props.visibility.volume) {
    return;
  }

  const chart = createBaseChart(volumeRef.value, 168);
  registerChart(chart, volumeRef.value);
  chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.18, bottom: 0 } });
  const series = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false });
  series.setData(
    props.response.candles.map((candle) => ({
      time: toChartTime(candle.time),
      value: candle.volume,
      color: candle.close >= candle.open ? 'rgba(78, 222, 163, 0.45)' : 'rgba(255, 81, 106, 0.45)'
    }))
  );
}

function setupLinePanel(refEl: HTMLDivElement | null, series: Array<{ time: number; value: number | null }>, color: string, height = 168) {
  if (!refEl) {
    return;
  }

  const chart = createBaseChart(refEl, height);
  registerChart(chart, refEl);
  const line = chart.addSeries(LineSeries, { color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  line.setData(mapLineSeries(series));
}

function setupRsiChart() {
  if (!rsiRef.value || !props.visibility.rsi) return;
  const chart = createBaseChart(rsiRef.value, 168);
  registerChart(chart, rsiRef.value);
  chart.priceScale('right').applyOptions({ autoScale: false, scaleMargins: { top: 0.1, bottom: 0.1 } });
  const series = chart.addSeries(LineSeries, { color: '#c0c1ff', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  series.setData(mapLineSeries(props.response.indicators.rsi14));
  series.createPriceLine({ price: 70, color: 'rgba(255,81,106,0.42)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '70' });
  series.createPriceLine({ price: 30, color: 'rgba(78,222,163,0.42)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '30' });
}

function setupMacdChart() {
  if (!macdRef.value || !props.visibility.macd) return;
  const chart = createBaseChart(macdRef.value, 168);
  registerChart(chart, macdRef.value);
  chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.2, bottom: 0.18 } });
  const histogram = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false });
  const macdLine = chart.addSeries(LineSeries, { color: '#c0c1ff', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  const signalLine = chart.addSeries(LineSeries, { color: '#ff516a', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  histogram.setData(props.response.indicators.macd.filter((point) => point.histogram !== null).map((point) => ({ time: toChartTime(point.time), value: point.histogram as number, color: (point.histogram ?? 0) >= 0 ? 'rgba(78, 222, 163, 0.42)' : 'rgba(255, 81, 106, 0.42)' })));
  macdLine.setData(props.response.indicators.macd.filter((point) => point.macd !== null).map((point) => ({ time: toChartTime(point.time), value: point.macd as number })));
  signalLine.setData(props.response.indicators.macd.filter((point) => point.signal !== null).map((point) => ({ time: toChartTime(point.time), value: point.signal as number })));
}

function setupAtrChart() {
  if (!atrRef.value || !props.visibility.atr) return;
  setupLinePanel(atrRef.value, props.response.indicators.atr14, '#ffb2b7');
}

function setupAdxChart() {
  if (!adxRef.value || !props.visibility.adxDmi) return;
  const chart = createBaseChart(adxRef.value, 168);
  registerChart(chart, adxRef.value);
  const adx = chart.addSeries(LineSeries, { color: '#ff9f6e', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  const plus = chart.addSeries(LineSeries, { color: '#4edea3', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  const minus = chart.addSeries(LineSeries, { color: '#ff516a', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  adx.setData(props.response.indicators.adxDmi14.filter((point) => point.adx !== null).map((point) => ({ time: toChartTime(point.time), value: point.adx as number })));
  plus.setData(props.response.indicators.adxDmi14.filter((point) => point.plusDi !== null).map((point) => ({ time: toChartTime(point.time), value: point.plusDi as number })));
  minus.setData(props.response.indicators.adxDmi14.filter((point) => point.minusDi !== null).map((point) => ({ time: toChartTime(point.time), value: point.minusDi as number })));
  adx.createPriceLine({ price: props.response.analysisContext.adxHeuristicThreshold, color: 'rgba(255,159,110,0.32)', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: String(props.response.analysisContext.adxHeuristicThreshold) });
}

function setupRvolChart() {
  if (!rvolRef.value || !props.visibility.rvol) return;
  setupLinePanel(rvolRef.value, props.response.indicators.rvol20, '#9bff8a');
}

function setupRelativeChart() {
  if (!relativeRef.value || !props.visibility.relativeStrength) return;
  setupLinePanel(relativeRef.value, props.response.indicators.relativeStrength, '#79a8ff');
}

function buildCharts() {
  destroyCharts();
  setupPriceChart();
  setupVolumeChart();
  setupRsiChart();
  setupMacdChart();
  setupAtrChart();
  setupAdxChart();
  setupRvolChart();
  setupRelativeChart();

  syncCharts(charts.map(({ chart }) => chart));
  resizeObserver = new ResizeObserver(() => {
    charts.forEach(({ chart, container }) => chart.applyOptions({ width: container.clientWidth }));
  });
  charts.forEach(({ container }) => resizeObserver?.observe(container));
}

watch(
  () => [props.response, props.visibility, props.manualAnchorArmed],
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

    <div class="indicator-grid indicator-grid--chart mt-4">
      <v-card v-if="visibility.volume" class="surface-panel surface-panel--high pa-4" rounded="xl">
        <div class="metric-row indicator-panel__header mb-3">
          <span class="indicator-panel__title">
            <span class="muted-label">{{ panelMeta.volume.label }}</span>
            <InfoPopoverButton
              :title="panelMeta.volume.label"
              :description="panelExplanations.volume.description"
              :details="panelExplanations.volume.details"
              :button-label="t('common.openInfoFor', { label: panelMeta.volume.label })"
            />
          </span>
          <span>{{ panelMeta.volume.value }}</span>
        </div>
        <div ref="volumeRef" class="chart-surface" style="height: 168px;" />
      </v-card>

      <v-card v-if="visibility.rsi" class="surface-panel surface-panel--high pa-4" rounded="xl">
        <div class="metric-row indicator-panel__header mb-3">
          <span class="indicator-panel__title">
            <span class="muted-label">{{ panelMeta.rsi.label }}</span>
            <InfoPopoverButton
              :title="panelMeta.rsi.label"
              :description="panelExplanations.rsi.description"
              :details="panelExplanations.rsi.details"
              :button-label="t('common.openInfoFor', { label: panelMeta.rsi.label })"
            />
          </span>
          <span>{{ panelMeta.rsi.value }}</span>
        </div>
        <div ref="rsiRef" class="chart-surface" style="height: 168px;" />
      </v-card>

      <v-card v-if="visibility.macd" class="surface-panel surface-panel--high pa-4" rounded="xl">
        <div class="metric-row indicator-panel__header mb-3">
          <span class="indicator-panel__title">
            <span class="muted-label">{{ panelMeta.macd.label }}</span>
            <InfoPopoverButton
              :title="panelMeta.macd.label"
              :description="panelExplanations.macd.description"
              :details="panelExplanations.macd.details"
              :button-label="t('common.openInfoFor', { label: panelMeta.macd.label })"
            />
          </span>
          <span>{{ panelMeta.macd.value }}</span>
        </div>
        <div ref="macdRef" class="chart-surface" style="height: 168px;" />
      </v-card>

      <v-card v-if="visibility.atr" class="surface-panel surface-panel--high pa-4" rounded="xl">
        <div class="metric-row indicator-panel__header mb-3">
          <span class="indicator-panel__title">
            <span class="muted-label">{{ panelMeta.atr.label }}</span>
            <InfoPopoverButton
              :title="panelMeta.atr.label"
              :description="panelExplanations.atr.description"
              :details="panelExplanations.atr.details"
              :button-label="t('common.openInfoFor', { label: panelMeta.atr.label })"
            />
          </span>
          <span>{{ panelMeta.atr.value }}</span>
        </div>
        <div ref="atrRef" class="chart-surface" style="height: 168px;" />
      </v-card>

      <v-card v-if="visibility.adxDmi" class="surface-panel surface-panel--high pa-4" rounded="xl">
        <div class="metric-row indicator-panel__header mb-3">
          <span class="indicator-panel__title">
            <span class="muted-label">{{ panelMeta.adx.label }}</span>
            <InfoPopoverButton
              :title="panelMeta.adx.label"
              :description="panelExplanations.adx.description"
              :details="panelExplanations.adx.details"
              :button-label="t('common.openInfoFor', { label: panelMeta.adx.label })"
            />
          </span>
          <span>{{ panelMeta.adx.value }}</span>
        </div>
        <div ref="adxRef" class="chart-surface" style="height: 168px;" />
      </v-card>

      <v-card v-if="visibility.rvol" class="surface-panel surface-panel--high pa-4" rounded="xl">
        <div class="metric-row indicator-panel__header mb-3">
          <span class="indicator-panel__title">
            <span class="muted-label">{{ panelMeta.rvol.label }}</span>
            <InfoPopoverButton
              :title="panelMeta.rvol.label"
              :description="panelExplanations.rvol.description"
              :details="panelExplanations.rvol.details"
              :button-label="t('common.openInfoFor', { label: panelMeta.rvol.label })"
            />
          </span>
          <span>{{ panelMeta.rvol.value }}</span>
        </div>
        <div ref="rvolRef" class="chart-surface" style="height: 168px;" />
      </v-card>

      <v-card v-if="visibility.relativeStrength" class="surface-panel surface-panel--high pa-4" rounded="xl">
        <div class="metric-row indicator-panel__header mb-3">
          <span class="indicator-panel__title">
            <span class="muted-label">{{ panelMeta.relative.label }}</span>
            <InfoPopoverButton
              :title="panelMeta.relative.label"
              :description="panelExplanations.relative.description"
              :details="panelExplanations.relative.details"
              :button-label="t('common.openInfoFor', { label: panelMeta.relative.label })"
            />
          </span>
          <span>{{ panelMeta.relative.value }}</span>
        </div>
        <div ref="relativeRef" class="chart-surface" style="height: 168px;" />
      </v-card>
    </div>
  </v-card>
</template>
