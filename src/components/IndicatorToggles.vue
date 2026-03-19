<script setup lang="ts">
import { computed } from 'vue';
import type { IndicatorToggleKey, IndicatorVisibility } from '@shared/market';
import { useI18n } from '@/utils/i18n';

defineProps<{
  visibility: IndicatorVisibility;
}>();

const { t } = useI18n();
const emit = defineEmits<{
  toggle: [key: IndicatorToggleKey];
}>();

const items = computed<Array<{ key: IndicatorToggleKey; label: string; color: string }>>(() => [
  { key: 'ema20', label: t('indicator.ema20'), color: '#c0c1ff' },
  { key: 'ema50', label: t('indicator.ema50'), color: '#4edea3' },
  { key: 'ema200', label: t('indicator.ema200'), color: '#8083ff' },
  { key: 'bollinger', label: t('indicator.bollinger'), color: '#908fa0' },
  { key: 'volume', label: t('indicator.volume'), color: '#4edea3' },
  { key: 'rsi', label: t('indicator.rsi'), color: '#c0c1ff' },
  { key: 'macd', label: t('indicator.macd'), color: '#ff516a' },
  { key: 'atr', label: t('indicator.atr'), color: '#ffb2b7' }
]);
</script>

<template>
  <v-card class="surface-panel pa-6" rounded="xl">
    <div class="muted-label mb-4">{{ t('indicator.title') }}</div>
    <div class="d-flex flex-column ga-3">
      <div v-for="item in items" :key="item.key" class="indicator-toggle">
        <div class="indicator-toggle__meta">
          <span
            class="legend-chip__swatch"
            :style="{ backgroundColor: item.color, boxShadow: `0 0 12px ${item.color}55` }"
          />
          <div>
            <div style="font-weight: 700;">{{ item.label }}</div>
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
  </v-card>
</template>
