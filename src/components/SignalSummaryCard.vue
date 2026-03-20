<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SignalCategoryKey, SignalSummary } from '@shared/market';
import InfoPopoverButton from '@/components/InfoPopoverButton.vue';
import { buildSignalCategoryExplanation, buildSummaryOverviewExplanation } from '@/utils/explanations';
import { localizeSignalCategory, localizeSignalCategoryStatus, localizeSignalHeadline, useI18n } from '@/utils/i18n';

const props = defineProps<{
  summary: SignalSummary;
}>();
const { t } = useI18n();
const summaryExplanation = computed(() => buildSummaryOverviewExplanation(props.summary, t));
const scoresExpanded = ref(false);

function getCategoryExplanation(key: SignalCategoryKey, category: SignalSummary['categories'][SignalCategoryKey]) {
  return buildSignalCategoryExplanation(key, category, t);
}

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

const metricChipMap = computed(() => [
  {
    bullet: t('summary.bullet.emaTrend.bullish'),
    label: t('summary.metric.emaTrend.bullish')
  },
  {
    bullet: t('summary.bullet.emaTrend.bearish'),
    label: t('summary.metric.emaTrend.bearish')
  },
  {
    bullet: t('summary.bullet.emaTrend.mixed'),
    label: t('summary.metric.emaTrend.mixed')
  },
  {
    bullet: t('summary.bullet.rsiState.oversold'),
    label: t('summary.metric.rsiState.oversold')
  },
  {
    bullet: t('summary.bullet.rsiState.neutral'),
    label: t('summary.metric.rsiState.neutral')
  },
  {
    bullet: t('summary.bullet.rsiState.bullish'),
    label: t('summary.metric.rsiState.bullish')
  },
  {
    bullet: t('summary.bullet.rsiState.overbought'),
    label: t('summary.metric.rsiState.overbought')
  },
  {
    bullet: t('summary.bullet.macdState.bullish'),
    label: t('summary.metric.macdState.bullish')
  },
  {
    bullet: t('summary.bullet.macdState.bearish'),
    label: t('summary.metric.macdState.bearish')
  },
  {
    bullet: t('summary.bullet.macdState.flat'),
    label: t('summary.metric.macdState.flat')
  },
  {
    bullet: t('summary.bullet.volatilityState.calm'),
    label: t('summary.metric.volatilityState.calm')
  },
  {
    bullet: t('summary.bullet.volatilityState.normal'),
    label: t('summary.metric.volatilityState.normal')
  },
  {
    bullet: t('summary.bullet.volatilityState.elevated'),
    label: t('summary.metric.volatilityState.elevated')
  }
]);

const summaryMetricChips = computed(() => {
  const labels = metricChipMap.value
    .filter((entry) => props.summary.bullets.includes(entry.bullet))
    .map((entry) => entry.label);

  if (labels.length > 0) {
    return labels.slice(0, 4);
  }

  return orderedCategories.value
    .slice(0, 4)
    .map(([key, category]) => `${localizeSignalCategoryStatus(category.status)} ${localizeSignalCategory(key)}`);
});

const localizedBullets = computed(() => props.summary.bullets.map((bullet) => localizeSignalHeadline(bullet)));
</script>

<template>
  <div class="signal-summary-stack">
    <v-card class="surface-panel surface-panel--high signal-summary-card" rounded="xl">
      <div class="signal-summary-card__header">
        <div class="muted-label">{{ t('summary.title') }}</div>
        <InfoPopoverButton
          :title="t('summary.title')"
          :description="summaryExplanation.description"
          :details="summaryExplanation.details"
          :button-label="t('common.openInfoFor', { label: t('summary.title') })"
        />
      </div>

      <div class="signal-summary-card__hero">
        <v-avatar
          size="60"
          :color="tone === 'secondary' ? 'rgba(78, 222, 163, 0.12)' : tone === 'error' ? 'rgba(255, 81, 106, 0.12)' : 'rgba(192, 193, 255, 0.12)'"
        >
          <v-icon :icon="icon" :color="tone" size="30" />
        </v-avatar>
        <div class="signal-summary-card__hero-copy">
          <div class="signal-summary-card__bias">{{ t(`summary.bias.${summary.bias}`) }}</div>
          <div class="signal-summary-card__confidence">
            {{ t('summary.confidence') }} {{ t(`summary.confidence.${summary.confidence}`) }}
          </div>
        </div>
      </div>

      <div class="signal-summary-card__chips">
        <span
          v-for="chip in summaryMetricChips"
          :key="chip"
          class="signal-summary-card__chip"
        >
          {{ chip }}
        </span>
      </div>

      <ul class="signal-summary-card__bullets">
        <li
          v-for="bullet in localizedBullets"
          :key="bullet"
          class="signal-summary-card__bullet"
        >
          <span class="signal-summary-card__bullet-dot" aria-hidden="true" />
          <span>{{ bullet }}</span>
        </li>
      </ul>
    </v-card>

    <v-card class="surface-panel signal-score-card" rounded="xl">
      <div class="signal-score-card__header">
        <div class="muted-label">{{ t('summary.score.title') }}</div>
        <v-btn
          class="pill-button control-toggle-button"
          variant="text"
          :append-icon="scoresExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          @click="scoresExpanded = !scoresExpanded"
        >
          {{ scoresExpanded ? t('summary.score.hide') : t('summary.score.show') }}
        </v-btn>
      </div>

      <v-expand-transition>
        <div v-if="scoresExpanded" class="signal-score-card__body">
          <div class="score-grid signal-score-card__totals">
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

          <div class="signal-score-card__categories">
            <div
              v-for="[key, category] in orderedCategories"
              :key="key"
              class="summary-category"
            >
              <div class="d-flex align-center justify-space-between ga-3">
                <span class="indicator-label-row">
                  <span style="font-weight: 700;">{{ localizeSignalCategory(key) }}</span>
                  <InfoPopoverButton
                    :title="localizeSignalCategory(key)"
                    :description="getCategoryExplanation(key, category).description"
                    :details="getCategoryExplanation(key, category).details"
                    :button-label="t('common.openInfoFor', { label: localizeSignalCategory(key) })"
                  />
                </span>
                <span class="helper-chip signal-score-card__weight">{{ category.weight.toFixed(0) }}%</span>
              </div>

              <div class="signal-score-card__status">
                {{ localizeSignalCategoryStatus(category.status) }}
              </div>

              <div class="signal-score-card__contributions">
                <span>{{ t('summary.score.bullish') }} {{ category.contribution.bullish.toFixed(1) }}</span>
                <span>{{ t('summary.score.bearish') }} {{ category.contribution.bearish.toFixed(1) }}</span>
                <span>{{ t('summary.score.neutral') }} {{ category.contribution.neutral.toFixed(1) }}</span>
              </div>
            </div>
          </div>
        </div>
      </v-expand-transition>
    </v-card>
  </div>
</template>
