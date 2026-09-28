<script setup lang="ts">
import type { Category } from "../types/catalogue";
import CategoryArtwork from "./CategoryArtwork.vue";
import { categoryTheme } from "../utils/artwork";
defineProps<{
  categories: Category[];
  selected: string;
  loading: boolean;
  error: string;
}>();
defineEmits<{ select: [slug: string]; retry: [] }>();
</script>
<template>
  <section
    id="categories"
    class="category-section"
    aria-labelledby="category-heading"
  >
    <div class="section-heading">
      <div>
        <p class="eyebrow">Follow your curiosity</p>
        <h2 id="category-heading">
          A world to explore<span class="coral-dot">.</span>
        </h2>
      </div>
      <a href="#catalogue" class="text-link"
        >Discover the catalogue <span aria-hidden="true">↓</span></a
      >
    </div>
    <p v-if="loading" class="inline-loading" role="status">
      Gathering the categories…
    </p>
    <div v-else-if="error" class="inline-error" role="alert">
      <p>{{ error }}</p>
      <button @click="$emit('retry')">Retry categories</button>
    </div>
    <div class="category-list" aria-label="Filter products by category">
      <button
        class="category-chip all-category"
        :aria-pressed="selected === ''"
        @click="$emit('select', '')"
      >
        <span class="all-icon" aria-hidden="true">✳</span
        ><span>All discoveries<small>The whole catalogue</small></span
        ><span class="category-arrow" aria-hidden="true">↗</span>
      </button>
      <button
        v-for="item in categories"
        :key="item.id"
        class="category-chip"
        :class="`theme-${categoryTheme(item.slug)}`"
        :aria-pressed="selected === item.slug"
        @click="$emit('select', item.slug)"
      >
        <CategoryArtwork :category="item.slug" /><span
          >{{ item.name }}<small>Explore category</small></span
        ><span class="category-arrow" aria-hidden="true">↗</span>
      </button>
    </div>
  </section>
</template>
