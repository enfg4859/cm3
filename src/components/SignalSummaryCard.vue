<script setup lang="ts">
import { computed } from 'vue';
import type { SignalCategoryKey, SignalSummary } from '@shared/market';
import { localizeSignalCategory, localizeSignalCategoryStatus, useI18n } from '@/utils/i18n';

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

const orderedCategories = computed(() =>
  (Object.entries(props.summary.categories) as Array<[SignalCategoryKey, SignalSummary['categories'][SignalCategoryKey]]>)
    .filter(([, category]) => category.weight > 0)
    .sort(([, left], [, right]) => {
      const leftStrength = Math.max(left.contribution.bullish, left.contribution.bearish) - left.contribution.neutral;
      const rightStrength =
        Math.max(right.contribution.bullish, right.contribution.bearish) - right.contribution.neutral;
      return rightStrength - leftStrength;
    })
);
</script>

<template>
  <v-card class="surface-panel surface-panel--high pa-6" rounded="xl">
    <div class="muted-label mb-4">{{ t('summary.title') }}</div>
    <div class="d-flex align-center ga-3 mb-4">
      <v-avatar :color="tone === 'secondary' ? 'rgba(78, 222, 163, 0.12)' : tone === 'error' ? 'rgba(255, 81, 106, 0.12)' : 'rgba(192, 193, 255, 0.12)'">
        <v-icon :icon="icon" :color="tone" />
      </v-avatar>
      <div>
        <div style="font-size: 1.1rem; font-weight: 800;">{{ t(`summary.bias.${summary.bias}`) }}</div>
        <div class="text-medium-emphasis" style="font-size: 0.82rem;">
          {{ t('summary.confidence') }} {{ t(`summary.confidence.${summary.confidence}`) }}
        </div>
      </div>
    </div>

    <div class="score-grid mb-4">
      <div class="score-chip">
        <span class="muted-label">{{ t('summary.score.bullish') }}</span>
        <strong>{{ summary.scores.bullish.toFixed(1) }}</strong>
      </div>
      <div class="score-chip">
        <span class="muted-label">{{ t('summary.score.bearish') }}</span>
        <strong>{{ summary.scores.bearish.toFixed(1) }}</strong>
      </div>
      <div class="score-chip">
        <span class="muted-label">{{ t('summary.score.neutral') }}</span>
        <strong>{{ summary.scores.neutral.toFixed(1) }}</strong>
      </div>
      <div class="score-chip">
        <span class="muted-label">{{ t('summary.score.coverage') }}</span>
        <strong>{{ (summary.coverageFactor * 100).toFixed(0) }}%</strong>
      </div>
    </div>

    <div class="d-flex flex-column ga-3">
      <div
        v-for="[key, category] in orderedCategories"
        :key="key"
        class="summary-category"
      >
        <div class="d-flex align-center justify-space-between ga-3">
          <span style="font-weight: 700;">{{ localizeSignalCategory(key) }}</span>
          <span class="helper-chip" style="padding: 6px 10px;">{{ category.weight.toFixed(0) }}%</span>
        </div>
        <div class="text-medium-emphasis mt-2" style="font-size: 0.82rem;">
          {{ localizeSignalCategoryStatus(category.status) }}
        </div>
      </div>
    </div>
  </v-card>
</template>
