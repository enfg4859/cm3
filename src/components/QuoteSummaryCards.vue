<script setup lang="ts">
import { computed } from 'vue';
import type { Quote } from '@shared/market';
import { formatCompactNumber, formatCurrency, formatTimestamp } from '@/utils/format';
import { useI18n } from '@/utils/i18n';

const props = defineProps<{
  quote: Quote;
}>();
const { dateLocale, t } = useI18n();

const cards = computed(() => [
  {
    label: t('quote.card.volume'),
    value: formatCompactNumber(props.quote.volume, dateLocale.value),
    note: t('quote.note.latestPrint')
  },
  {
    label: t('quote.card.dayHigh'),
    value: formatCurrency(props.quote.high, props.quote.currency),
    note: t('quote.note.intradayResistance')
  },
  {
    label: t('quote.card.dayLow'),
    value: formatCurrency(props.quote.low, props.quote.currency),
    note: t('quote.note.intradaySupport')
  },
  {
    label: t('quote.card.updated'),
    value: formatTimestamp(props.quote.updatedAt, dateLocale.value),
    note: props.quote.exchange
  }
]);
</script>

<template>
  <div class="summary-grid">
    <v-card
      v-for="card in cards"
      :key="card.label"
      class="surface-panel surface-panel--high pa-5"
      rounded="xl"
    >
      <div class="muted-label mb-3">{{ card.label }}</div>
      <div style="font-size: 1.3rem; font-weight: 800;">{{ card.value }}</div>
      <div class="text-medium-emphasis mt-2" style="font-size: 0.82rem;">{{ card.note }}</div>
    </v-card>
  </div>
</template>
