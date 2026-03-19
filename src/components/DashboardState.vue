<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/utils/i18n';

const props = defineProps<{
  variant: 'empty' | 'loading' | 'error';
  title: string;
  description: string;
  suggestions?: string[];
  errorDetail?: string | null;
}>();

const emit = defineEmits<{
  select: [symbol: string];
  retry: [];
}>();
const { t } = useI18n();

const icon = computed(() => {
  switch (props.variant) {
    case 'loading':
      return 'mdi-chart-line';
    case 'error':
      return 'mdi-alert-circle-outline';
    default:
      return 'mdi-monitor-dashboard';
  }
});
</script>

<template>
  <v-card class="state-card surface-panel surface-panel--glass" rounded="xl">
    <div class="state-card__visual">
      <v-icon :icon="icon" size="56" :color="variant === 'error' ? 'error' : 'primary'" />
    </div>

    <div class="muted-label mb-4">
      {{
        variant === 'loading'
          ? t('state.loading.label')
          : variant === 'error'
            ? t('state.error.label')
            : t('state.empty.label')
      }}
    </div>
    <div style="font-size: clamp(2rem, 4vw, 3.4rem); font-weight: 900; letter-spacing: -0.06em;">
      {{ title }}
    </div>
    <div class="text-medium-emphasis mt-4" style="max-width: 720px; font-size: 1rem; line-height: 1.8;">
      {{ description }}
    </div>

    <div v-if="variant === 'loading'" class="mt-10 d-flex flex-column ga-4">
      <div class="skeleton-bar" style="width: 220px; height: 14px;" />
      <div class="skeleton-bar" style="width: 100%; height: 220px; border-radius: 28px;" />
      <div class="indicator-grid">
        <div class="skeleton-bar" style="height: 120px; border-radius: 24px;" />
        <div class="skeleton-bar" style="height: 120px; border-radius: 24px;" />
        <div class="skeleton-bar" style="height: 120px; border-radius: 24px;" />
      </div>
    </div>

    <div v-else class="mt-10 d-flex flex-column ga-6">
      <div v-if="errorDetail" class="helper-chip" style="align-self: flex-start; background: rgba(255, 81, 106, 0.12); color: #ff516a;">
        {{ errorDetail }}
      </div>

      <div v-if="suggestions?.length" class="d-flex flex-wrap ga-3">
        <v-btn
          v-for="suggestion in suggestions"
          :key="suggestion"
          class="pill-button"
          @click="emit('select', suggestion)"
        >
          {{ suggestion }}
        </v-btn>
      </div>

      <div class="d-flex flex-wrap ga-3">
        <v-btn
          v-if="variant === 'error'"
          color="primary"
          class="pill-button pill-button--active"
          @click="emit('retry')"
        >
          {{ t('state.retry') }}
        </v-btn>
        <v-btn
          v-if="variant === 'empty'"
          color="primary"
          class="pill-button pill-button--active"
          @click="emit('select', suggestions?.[0] ?? 'AAPL')"
        >
          {{ t('state.loadDemo') }}
        </v-btn>
      </div>
    </div>
  </v-card>
</template>
