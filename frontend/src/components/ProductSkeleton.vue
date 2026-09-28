<script setup lang="ts">
defineProps<{ detail?: boolean }>();
</script>
<template>
  <div
    role="status"
    :aria-label="detail ? 'Loading product details' : 'Loading the catalogue'"
  >
    <span class="sr-only">{{
      detail ? "Loading product details…" : "Loading the catalogue…"
    }}</span>
    <div
      v-if="detail"
      class="product-detail skeleton-detail"
      aria-hidden="true"
    >
      <div class="skeleton skeleton-visual"></div>
      <div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-visual"></div>
      </div>
    </div>
    <div v-else class="product-grid" aria-hidden="true">
      <div v-for="n in 8" :key="n" class="product-card skeleton-card">
        <div class="skeleton skeleton-visual"></div>
        <div class="card-content">
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-line"></div>
        </div>
      </div>
    </div>
  </div>
</template>
