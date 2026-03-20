<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  details?: string[];
  buttonLabel: string;
}>();
</script>

<template>
  <v-menu
    location="bottom end"
    offset="10"
    :close-on-content-click="false"
    max-width="320"
  >
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        class="indicator-panel__info"
        variant="text"
        icon
        size="24"
        :aria-label="buttonLabel"
      >
        <v-icon icon="mdi-information-outline" size="16" />
      </v-btn>
    </template>

    <v-card class="indicator-tooltip">
      <div class="indicator-tooltip__title">{{ title }}</div>
      <div class="indicator-tooltip__description">{{ description }}</div>
      <div v-if="details?.length" class="indicator-tooltip__details">
        <div v-for="detail in details" :key="detail" class="indicator-tooltip__detail">
          {{ detail }}
        </div>
      </div>
    </v-card>
  </v-menu>
</template>
