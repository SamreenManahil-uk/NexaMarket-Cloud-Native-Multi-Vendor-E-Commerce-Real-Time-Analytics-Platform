<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getStorefront, type StorefrontResponse } from "../services/storefront";

const route = useRoute();
const store = ref<StorefrontResponse | null>(null);
const loading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    store.value = await getStorefront(String(route.params.sellerId));
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Store could not be loaded.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="store-page">
    <p v-if="loading" class="state">Loading store...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <template v-else-if="store">
      <section class="store-hero">
        <div>
          <span class="eyebrow">NexaMarket Seller</span>
          <h1>{{ store.seller.store_name }}</h1>
          <p>{{ store.seller.store_description }}</p>
        </div>
        <div class="store-stat">
          <strong>{{ store.products.length }}</strong>
          <span>Products</span>
        </div>
      </section>

      <section class="catalogue">
        <div class="section-heading">
          <div><span class="eyebrow">Store catalogue</span><h2>Products</h2></div>
        </div>

        <div v-if="store.products.length" class="grid">
          <RouterLink v-for="product in store.products" :key="product.id" :to="`/products/${product.id}`" class="card">
            <div class="image-wrap">
              <img v-if="product.image_url" :src="product.image_url" :alt="product.name" />
              <div v-else class="placeholder">NexaMarket</div>
            </div>
            <div class="card-body">
              <span class="category">{{ product.category }}</span>
              <h3>{{ product.name }}</h3>
              <p>{{ product.description }}</p>
              <div class="bottom">
                <strong>£{{ Number(product.price).toFixed(2) }}</strong>
                <span :class="{ out: product.available_quantity < 1 }">
                  {{ product.available_quantity > 0 ? `${product.available_quantity} in stock` : "Out of stock" }}
                </span>
              </div>
            </div>
          </RouterLink>
        </div>
        <p v-else class="state">This seller has no active products.</p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.store-page{max-width:1240px;margin:auto;padding:42px 24px 80px}.store-hero{display:flex;justify-content:space-between;align-items:center;gap:32px;padding:54px;border-radius:28px;background:#f4f1eb;margin-bottom:50px}.store-hero h1{font-size:clamp(2.4rem,5vw,4.8rem);line-height:1;margin:12px 0 18px}.store-hero p{max-width:650px;line-height:1.7;color:#5d5d5d}.eyebrow,.category{font-size:.75rem;text-transform:uppercase;letter-spacing:.14em}.store-stat{text-align:center;background:white;border-radius:22px;padding:26px 38px}.store-stat strong{display:block;font-size:2.2rem}.store-stat span{color:#666}.section-heading{margin-bottom:24px}.section-heading h2{font-size:2rem;margin:7px 0}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}.card{text-decoration:none;color:inherit;border:1px solid #e7e7e7;border-radius:20px;overflow:hidden;background:white;transition:.2s}.card:hover{transform:translateY(-4px);box-shadow:0 14px 35px rgba(0,0,0,.08)}.image-wrap{height:260px;background:#f7f7f7;display:flex;align-items:center;justify-content:center}.image-wrap img{width:100%;height:100%;object-fit:contain;padding:20px}.placeholder{color:#888}.card-body{padding:20px}.category{color:#777}.card h3{margin:9px 0;font-size:1.15rem}.card p{color:#666;font-size:.9rem;line-height:1.5;min-height:42px}.bottom{display:flex;justify-content:space-between;align-items:center;margin-top:18px}.bottom strong{font-size:1.15rem}.bottom span{font-size:.82rem;color:#26734d}.bottom .out{color:#a33}.state{text-align:center;padding:70px}.error{color:#a33}@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}.store-hero{padding:35px}}@media(max-width:560px){.store-page{padding:24px 16px 60px}.store-hero{display:block;padding:28px}.store-stat{margin-top:25px}.grid{grid-template-columns:1fr}}
</style>
