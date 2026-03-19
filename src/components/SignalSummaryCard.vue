<script setup lang="ts">
import { computed } from 'vue';
import type { SignalSummary } from '@shared/market';
import { localizeSignalSummary, useI18n } from '@/utils/i18n';

const props = defineProps<{
  summary: SignalSummary;
}>();
const { t } = useI18n();

const icon = computed(() => {
  switch (props.summary.bias) {
    case 'strong_bullish':
    case 'bullish':
      return 'mdi-trending-up';
    case 'strong_bearish':
    case 'bearish':
      return 'mdi-trending-down';
    default:
      return 'mdi-swap-horizontal';
  }
});

const tone = computed(() => {
  switch (props.summary.bias) {
    case 'strong_bullish':
    case 'bullish':
      return 'secondary';
    case 'strong_bearish':
    case 'bearish':
      return 'error';
    default:
      return 'primary';
  }
});

const localized = computed(() => localizeSignalSummary(props.summary));
</script>

<template>
  <v-card class="surface-panel surface-panel--high pa-6" rounded="xl">
    <div class="muted-label mb-4">{{ t('summary.title') }}</div>
    <div class="d-flex align-center ga-3 mb-4">
      <v-avatar :color="tone === 'secondary' ? 'rgba(78, 222, 163, 0.12)' : tone === 'error' ? 'rgba(255, 81, 106, 0.12)' : 'rgba(192, 193, 255, 0.12)'">
        <v-icon :icon="icon" :color="tone" />
      </v-avatar>
      <div>
        <div style="font-size: 1.1rem; font-weight: 800;">{{ localized.label }}</div>
        <div class="text-medium-emphasis" style="font-size: 0.82rem;">
          {{ t('summary.confidence') }} {{ localized.confidence }}
        </div>
      </div>
    </div>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <span v-for="chip in localized.metricChips" :key="chip" class="helper-chip">{{ chip }}</span>
    </div>

    <div class="d-flex flex-column ga-3">
      <div
        v-for="bullet in localized.bullets"
        :key="bullet"
        class="d-flex align-start ga-3 text-medium-emphasis"
        style="font-size: 0.92rem; line-height: 1.55;"
      >
        <v-icon icon="mdi-circle-small" :color="tone" size="18" class="mt-1" />
        <span>{{ bullet }}</span>
      </div>
    </div>
  </v-card>
</template>
