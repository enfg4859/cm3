<script setup lang="ts">
import { computed } from 'vue';
import type { CandlesResponse, IndicatorToggleKey, IndicatorVisibility } from '@shared/market';
import InfoPopoverButton from '@/components/InfoPopoverButton.vue';
import { buildIndicatorExplanation } from '@/utils/explanations';
import { useI18n } from '@/utils/i18n';

const props = defineProps<{
  visibility: IndicatorVisibility;
  response?: CandlesResponse | null;
}>();

const { dateLocale, t } = useI18n();
const emit = defineEmits<{
  toggle: [key: IndicatorToggleKey];
}>();

const groups = computed(() => [
  {
    title: t('indicator.group.overlay'),
    items: [
      { key: 'ema20', label: t('indicator.ema20'), color: '#c0c1ff' },
      { key: 'ema50', label: t('indicator.ema50'), color: '#4edea3' },
      { key: 'ema200', label: t('indicator.ema200'), color: '#8083ff' },
      { key: 'bollinger', label: t('indicator.bollinger'), color: '#908fa0' },
      { key: 'vwap', label: t('indicator.vwap'), color: '#ffcb77' },
      { key: 'anchoredVwap', label: t('indicator.anchoredVwap'), color: '#ff8c42' },
      { key: 'pdhPdl', label: t('indicator.pdhPdl'), color: '#6ae1ff' },
      { key: 'openingRange', label: t('indicator.openingRange'), color: '#ffd166' }
    ]
  },
  {
    title: t('indicator.group.lower'),
    items: [
      { key: 'volume', label: t('indicator.volume'), color: '#4edea3' },
      { key: 'rvol', label: t('indicator.rvol'), color: '#9bff8a' },
      { key: 'rsi', label: t('indicator.rsi'), color: '#c0c1ff' },
      { key: 'macd', label: t('indicator.macd'), color: '#ff516a' },
      { key: 'adxDmi', label: t('indicator.adxDmi'), color: '#ff9f6e' },
      { key: 'atr', label: t('indicator.atr'), color: '#ffb2b7' },
      { key: 'relativeStrength', label: t('indicator.relativeStrength'), color: '#79a8ff' }
    ]
  }
]);

const indicatorExplanations = computed<Record<IndicatorToggleKey, ReturnType<typeof buildIndicatorExplanation>>>(() => ({
  ema20: buildIndicatorExplanation(props.response, 'ema20', t, dateLocale.value),
  ema50: buildIndicatorExplanation(props.response, 'ema50', t, dateLocale.value),
  ema200: buildIndicatorExplanation(props.response, 'ema200', t, dateLocale.value),
  bollinger: buildIndicatorExplanation(props.response, 'bollinger', t, dateLocale.value),
  volume: buildIndicatorExplanation(props.response, 'volume', t, dateLocale.value),
  rsi: buildIndicatorExplanation(props.response, 'rsi', t, dateLocale.value),
  macd: buildIndicatorExplanation(props.response, 'macd', t, dateLocale.value),
  atr: buildIndicatorExplanation(props.response, 'atr', t, dateLocale.value),
  vwap: buildIndicatorExplanation(props.response, 'vwap', t, dateLocale.value),
  anchoredVwap: buildIndicatorExplanation(props.response, 'anchoredVwap', t, dateLocale.value),
  adxDmi: buildIndicatorExplanation(props.response, 'adxDmi', t, dateLocale.value),
  rvol: buildIndicatorExplanation(props.response, 'rvol', t, dateLocale.value),
  relativeStrength: buildIndicatorExplanation(props.response, 'relativeStrength', t, dateLocale.value),
  pdhPdl: buildIndicatorExplanation(props.response, 'pdhPdl', t, dateLocale.value),
  openingRange: buildIndicatorExplanation(props.response, 'openingRange', t, dateLocale.value)
}));
</script>

<template>
  <v-card class="surface-panel pa-6" rounded="xl">
    <div class="muted-label mb-4">{{ t('indicator.title') }}</div>
    <div class="d-flex flex-column ga-5">
      <section v-for="group in groups" :key="group.title">
        <div class="muted-label mb-3">{{ group.title }}</div>
        <div class="d-flex flex-column ga-3">
          <div v-for="item in group.items" :key="item.key" class="indicator-toggle">
            <div class="indicator-toggle__meta">
              <span
                class="legend-chip__swatch"
                :style="{ backgroundColor: item.color, boxShadow: `0 0 12px ${item.color}55` }"
              />
              <div>
                <div class="indicator-label-row">
                  <span style="font-weight: 700;">{{ item.label }}</span>
                  <InfoPopoverButton
                    :title="item.label"
                    :description="indicatorExplanations[item.key].description"
                    :details="indicatorExplanations[item.key].details"
                    :button-label="t('common.openInfoFor', { label: item.label })"
                  />
                </div>
                <div class="text-medium-emphasis" style="font-size: 0.76rem;">{{ t('indicator.overlayControl') }}</div>
              </div>
            </div>

            <v-switch
              :model-value="visibility[item.key]"
              color="primary"
              density="compact"
              inset
              @update:model-value="emit('toggle', item.key)"
            />
          </div>
        </div>
      </section>
    </div>
  </v-card>
</template>
