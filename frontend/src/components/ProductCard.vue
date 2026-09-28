<script setup lang="ts">
import type { Product } from "../types/catalogue";
import ProductImage from "./ProductImage.vue";
defineProps<{ product: Product }>();
</script>
<template>
  <article class="product-card">
    <RouterLink
      :to="{ name: 'product', params: { id: product.id }, query: $route.query }"
      class="product-link"
    >
      <div class="card-visual">
        <ProductImage
          :src="product.image_url"
          :name="product.name"
          :category="product.category.slug"
        /><span class="category-badge">{{ product.category.name }}</span
        ><span class="card-open" aria-hidden="true">↗</span>
      </div>
      <div class="card-content">
        <p class="store">{{ product.seller.store_name }}</p>
        <h3>{{ product.name }}</h3>
        <div class="card-bottom">
          <span class="price">{{ product.price }}</span
          ><span
            class="stock"
            :class="{ unavailable: product.available_quantity === 0 }"
            ><span aria-hidden="true">●</span>
            {{
              product.available_quantity > 0 ? "In stock" : "Out of stock"
            }}</span
          >
        </div>
        <span class="view-link"
          >View product <span aria-hidden="true">→</span></span
        >
      </div>
    </RouterLink>
  </article>
</template>
