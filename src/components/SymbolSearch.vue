<script setup lang="ts">
import { computed } from 'vue';
import type { SearchResult } from '@shared/market';
import { translateErrorMessage, useI18n } from '@/utils/i18n';

const props = defineProps<{
  modelValue: string;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [value: string];
  select: [result: SearchResult];
  clear: [];
}>();
const { t } = useI18n();

const showPopover = computed(
  () => props.modelValue.trim().length > 0 && (props.loading || props.results.length > 0 || Boolean(props.error))
);
const localizedError = computed(() => {
  if (!props.error) {
    return '';
  }

  if (props.error === 'No matching symbols.') {
    return t('search.noResults');
  }

  const translated = translateErrorMessage(props.error);
  return translated === props.error ? t('search.genericError') : translated;
});
</script>

<template>
  <div style="position: relative;">
    <v-text-field
      :model-value="modelValue"
      prepend-inner-icon="mdi-magnify"
      clearable
      bg-color="rgba(45, 52, 73, 0.82)"
      color="primary"
      :placeholder="t('search.placeholder')"
      rounded="xl"
      @update:model-value="emit('update:modelValue', String($event ?? ''))"
      @click:clear="emit('clear')"
      @keydown.enter.prevent="emit('submit', modelValue)"
    />

    <div v-if="showPopover" class="search-popover">
      <v-card class="surface-panel surface-panel--glass" rounded="xl">
        <v-progress-linear
          v-if="loading"
          color="secondary"
          indeterminate
          height="2"
          bg-color="transparent"
        />

        <div class="pa-2">
          <button
            v-for="result in results"
            :key="`${result.symbol}:${result.exchange}`"
            class="search-result"
            type="button"
            @click="emit('select', result)"
          >
            <v-icon icon="mdi-finance" size="18" color="primary" />
            <div style="text-align: left;">
              <div style="font-weight: 700;">{{ result.symbol }}</div>
              <div class="text-medium-emphasis" style="font-size: 0.8rem;">{{ result.name }}</div>
            </div>
            <div class="text-medium-emphasis" style="font-size: 0.74rem; text-transform: uppercase;">
              {{ result.exchange }}
            </div>
          </button>

          <div
            v-if="!loading && !results.length && error"
            class="d-flex align-center ga-2 px-4 py-3 text-medium-emphasis"
            style="font-size: 0.82rem;"
          >
            <v-icon icon="mdi-alert-circle-outline" color="error" size="18" />
            <span>{{ localizedError }}</span>
          </div>
        </div>
      </v-card>
    </div>
  </div>
</template>
