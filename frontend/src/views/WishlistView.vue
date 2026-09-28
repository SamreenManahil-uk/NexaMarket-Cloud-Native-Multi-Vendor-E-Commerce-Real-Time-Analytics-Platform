<script setup lang="ts">
import { onMounted, ref } from "vue";
import { authStore } from "../stores/auth";
import { commerceApi } from "../services/commerce";
import type { WishlistItem } from "../types/commerce";
import { trackClickstream } from "../services/clickstream";

const items = ref<WishlistItem[]>([]);
const loading = ref(true);
const error = ref("");
const busyProduct = ref<string | null>(null);

async function loadWishlist() {
  const token = authStore.state.token;
  if (!token) return;

  try {
    loading.value = true;
    error.value = "";
    const response = await commerceApi.wishlist(token);
    items.value = response.data ?? [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to load wishlist.";
  } finally {
    loading.value = false;
  }
}

async function removeItem(productId: string) {
  const token = authStore.state.token;
  if (!token) return;

  try {
    busyProduct.value = productId;
    error.value = "";
    await commerceApi.removeWishlistItem(token, productId);
    await loadWishlist();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to remove this product.";
  } finally {
    busyProduct.value = null;
  }
}

async function moveToCart(item: WishlistItem) {
  const token = authStore.state.token;
  if (!token || item.product.stock <= 0) return;

  try {
    busyProduct.value = item.product.id;
    error.value = "";
    await commerceApi.addToCart(token, item.product.id, 1);
    void trackClickstream("ADD_TO_CART", { productId: item.product.id, path: "/wishlist" });
    await commerceApi.removeWishlistItem(token, item.product.id);
    await loadWishlist();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to move this product to your cart.";
  } finally {
    busyProduct.value = null;
  }
}

onMounted(loadWishlist);
</script>

<template>
  <main class="nx-wishlist">
    <div class="nx-wishlist-shell">
      <nav class="nx-wishlist-breadcrumb">
        <RouterLink to="/">Home</RouterLink>
        <span>›</span>
        <RouterLink to="/account">Account</RouterLink>
        <span>›</span>
        <strong>Wishlist</strong>
      </nav>

      <section class="nx-wishlist-hero">
        <div>
          <span>SAVED FOR LATER</span>
          <h1>Your wishlist</h1>

          <p>
            Keep your favourite NexaMarket discoveries
            together and move them to your cart when
            you're ready.
          </p>
        </div>

        <div
          v-if="!loading && items.length"
          class="nx-wishlist-count"
        >
          <strong>{{ items.length }}</strong>
          <span>
            {{ items.length === 1 ? "saved item" : "saved items" }}
          </span>
        </div>
      </section>

      <section
        v-if="loading"
        class="nx-wishlist-state"
      >
        <div class="nx-wishlist-loader"></div>
        <h2>Loading your wishlist</h2>
        <p>Bringing back your saved products.</p>
      </section>

      <section
        v-else-if="error"
        class="nx-wishlist-state nx-wishlist-error"
      >
        <div class="nx-state-icon">!</div>
        <h2>We couldn't load your wishlist</h2>
        <p>{{ error }}</p>

        <button
          type="button"
          @click="loadWishlist"
        >
          Try again
        </button>
      </section>

      <section
        v-else-if="!items.length"
        class="nx-wishlist-empty"
      >
        <div class="nx-empty-heart">♡</div>

        <span>YOUR SAVED PRODUCTS</span>
        <h2>Nothing saved yet.</h2>

        <p>
          Explore the marketplace and save products
          you'd like to come back to.
        </p>

        <RouterLink to="/#catalogue">
          Discover products
          <span>→</span>
        </RouterLink>
      </section>

      <template v-else>
        <div class="nx-wishlist-toolbar">
          <div>
            <strong>
              {{ items.length }}
              {{ items.length === 1 ? "product" : "products" }}
            </strong>

            <span>saved to your account</span>
          </div>

          <RouterLink to="/#catalogue">
            Continue shopping →
          </RouterLink>
        </div>

        <section class="nx-wishlist-grid">
          <article
            v-for="item in items"
            :key="item.id"
            class="nx-wishlist-card"
          >
            <RouterLink
              :to="`/products/${item.product.id}`"
              class="nx-wishlist-image"
            >
              <img
                v-if="item.product.imageUrl"
                :src="item.product.imageUrl"
                :alt="item.product.name"
              />

              <div
                v-else
                class="nx-wishlist-image-empty"
                aria-hidden="true"
              >
                NM
              </div>

              <span
                class="nx-stock-pill"
                :class="{ unavailable: item.product.stock <= 0 }"
              >
                {{
                  item.product.stock > 0
                    ? `${item.product.stock} available`
                    : "Out of stock"
                }}
              </span>
            </RouterLink>

            <div class="nx-wishlist-info">
              <div class="nx-wishlist-product-head">
                <div>
                  <p class="nx-wishlist-seller">
                    {{ item.product.sellerName }}
                  </p>

                  <RouterLink
                    :to="`/products/${item.product.id}`"
                    class="nx-wishlist-name"
                  >
                    {{ item.product.name }}
                  </RouterLink>
                </div>

                <strong class="nx-wishlist-price">
                  £{{ Number(item.product.price).toFixed(2) }}
                </strong>
              </div>

              <div class="nx-wishlist-divider"></div>

              <div class="nx-wishlist-actions">
                <button
                  type="button"
                  class="nx-move-cart"
                  :disabled="
                    item.product.stock <= 0 ||
                    busyProduct === item.product.id
                  "
                  @click="moveToCart(item)"
                >
                  <span>
                    {{
                      busyProduct === item.product.id
                        ? "Updating..."
                        : item.product.stock <= 0
                          ? "Out of stock"
                          : "Move to cart"
                    }}
                  </span>

                  <span aria-hidden="true">→</span>
                </button>

                <button
                  type="button"
                  class="nx-remove-item"
                  :disabled="
                    busyProduct === item.product.id
                  "
                  :aria-label="`Remove ${item.product.name} from wishlist`"
                  @click="removeItem(item.product.id)"
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        </section>

        <section class="nx-wishlist-bottom">
          <div>
            <span>KEEP DISCOVERING</span>
            <h2>Find something else you'll love.</h2>
          </div>

          <RouterLink to="/#catalogue">
            Explore marketplace
            <span>→</span>
          </RouterLink>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.nx-wishlist {
  min-height: 75vh;
  padding: 34px 0 80px;
  background: #f7f7f3;
  color: #18382e;
}

.nx-wishlist-shell {
  width: min(calc(100% - 48px), 1280px);
  margin: 0 auto;
}

.nx-wishlist-breadcrumb {
  display: flex;
  gap: 9px;
  align-items: center;
  margin-bottom: 28px;
  color: #818783;
  font-size: 13px;
}

.nx-wishlist-breadcrumb a {
  color: inherit;
  text-decoration: none;
}

.nx-wishlist-breadcrumb strong {
  color: #405249;
}

.nx-wishlist-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 30px;
  padding: 39px 42px;
  margin-bottom: 24px;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(
      circle at 92% 20%,
      rgba(246, 209, 88, .25),
      transparent 24%
    ),
    radial-gradient(
      circle at 75% 130%,
      rgba(238, 147, 137, .18),
      transparent 34%
    ),
    #173f32;
  color: #fff;
}

.nx-wishlist-hero > div:first-child > span,
.nx-wishlist-empty > span,
.nx-wishlist-bottom > div > span {
  display: block;
  margin-bottom: 8px;
  color: #f0cf5c;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .14em;
}

.nx-wishlist-hero h1 {
  margin: 0;
  font-size: clamp(40px, 5vw, 60px);
  letter-spacing: -.055em;
}

.nx-wishlist-hero p {
  max-width: 610px;
  margin: 12px 0 0;
  color: #ccdad4;
  font-size: 14px;
  line-height: 1.65;
}

.nx-wishlist-count {
  display: grid;
  place-items: center;
  min-width: 115px;
  min-height: 100px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 19px;
  background: rgba(255,255,255,.09);
  text-align: center;
}

.nx-wishlist-count strong {
  display: block;
  font-size: 32px;
  line-height: 1;
}

.nx-wishlist-count span {
  color: #cbd9d3;
  font-size: 10px;
}

.nx-wishlist-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  min-height: 63px;
  padding: 0 4px;
}

.nx-wishlist-toolbar > div {
  display: flex;
  gap: 8px;
  align-items: center;
}

.nx-wishlist-toolbar strong {
  font-size: 13px;
}

.nx-wishlist-toolbar span {
  color: #858c87;
  font-size: 12px;
}

.nx-wishlist-toolbar a {
  color: #236249;
  font-size: 12px;
  font-weight: 850;
  text-decoration: none;
}

.nx-wishlist-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.nx-wishlist-card {
  overflow: hidden;
  border: 1px solid #e0e4df;
  border-radius: 20px;
  background: #fff;
  transition:
    transform .18s ease,
    box-shadow .18s ease;
}

.nx-wishlist-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 15px 38px rgba(25, 58, 47, .08);
}

.nx-wishlist-image {
  position: relative;
  display: block;
  height: 280px;
  overflow: hidden;
  background: #f0f1ed;
}

.nx-wishlist-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .35s ease;
}

.nx-wishlist-card:hover
.nx-wishlist-image img {
  transform: scale(1.025);
}

.nx-wishlist-image-empty {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #71837b;
  font-size: 30px;
  font-weight: 900;
}

.nx-stock-pill {
  position: absolute;
  left: 14px;
  bottom: 14px;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.94);
  color: #28654d;
  font-size: 9px;
  font-weight: 900;
  box-shadow:
    0 5px 18px rgba(0,0,0,.08);
}

.nx-stock-pill.unavailable {
  color: #9a4841;
}

.nx-wishlist-info {
  padding: 20px;
}

.nx-wishlist-product-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  min-height: 65px;
}

.nx-wishlist-seller {
  margin: 0 0 5px;
  color: #929894;
  font-size: 10px;
}

.nx-wishlist-name {
  display: block;
  color: #18382e;
  font-size: 16px;
  font-weight: 850;
  line-height: 1.3;
  text-decoration: none;
}

.nx-wishlist-name:hover {
  color: #277052;
}

.nx-wishlist-price {
  flex: 0 0 auto;
  color: #18382e;
  font-size: 16px;
}

.nx-wishlist-divider {
  height: 1px;
  margin: 17px 0;
  background: #eceeea;
}

.nx-wishlist-actions {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr) auto;
  gap: 9px;
}

.nx-move-cart {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 45px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: #173f32;
  color: #fff;
  font: inherit;
  font-size: 11px;
  font-weight: 850;
  cursor: pointer;
}

.nx-move-cart:hover:not(:disabled) {
  background: #0f3328;
}

.nx-move-cart:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.nx-remove-item {
  min-height: 45px;
  padding: 0 14px;
  border: 1px solid #dfe3de;
  border-radius: 999px;
  background: #fff;
  color: #7d6661;
  font: inherit;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}

.nx-remove-item:hover:not(:disabled) {
  border-color: #e5c8c3;
  background: #fff5f3;
  color: #9a4941;
}

.nx-remove-item:disabled {
  opacity: .5;
}

.nx-wishlist-state,
.nx-wishlist-empty {
  display: grid;
  place-items: center;
  min-height: 390px;
  padding: 45px;
  border: 1px solid #e0e4df;
  border-radius: 22px;
  background: #fff;
  text-align: center;
}

.nx-wishlist-state h2,
.nx-wishlist-empty h2 {
  margin: 15px 0 7px;
  font-size: 28px;
  letter-spacing: -.035em;
}

.nx-wishlist-state p,
.nx-wishlist-empty p {
  max-width: 450px;
  margin: 0;
  color: #7a827d;
  font-size: 13px;
  line-height: 1.6;
}

.nx-wishlist-loader {
  width: 38px;
  height: 38px;
  border: 3px solid #dce4df;
  border-top-color: #27684f;
  border-radius: 50%;
  animation: nxSpin .8s linear infinite;
}

@keyframes nxSpin {
  to {
    transform: rotate(360deg);
  }
}

.nx-state-icon,
.nx-empty-heart {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
}

.nx-state-icon {
  background: #fff0ee;
  color: #9c4a42;
  font-size: 24px;
  font-weight: 900;
}

.nx-empty-heart {
  margin-bottom: 21px;
  background: #f7e8e5;
  color: #9e534b;
  font-size: 30px;
}

.nx-wishlist-empty > span {
  color: #347057;
}

.nx-wishlist-empty > a,
.nx-wishlist-state button {
  display: flex;
  gap: 30px;
  align-items: center;
  min-height: 47px;
  padding: 0 20px;
  margin-top: 23px;
  border: 0;
  border-radius: 999px;
  background: #173f32;
  color: #fff;
  font: inherit;
  font-size: 11px;
  font-weight: 850;
  text-decoration: none;
  cursor: pointer;
}

.nx-wishlist-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
  padding: 29px 32px;
  margin-top: 30px;
  border-radius: 20px;
  background: #f4e3df;
}

.nx-wishlist-bottom > div > span {
  color: #99564e;
}

.nx-wishlist-bottom h2 {
  margin: 0;
  font-size: 25px;
  letter-spacing: -.035em;
}

.nx-wishlist-bottom > a {
  display: flex;
  gap: 30px;
  align-items: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  background: #fff;
  color: #653f39;
  font-size: 11px;
  font-weight: 850;
  text-decoration: none;
}

@media (max-width: 980px) {
  .nx-wishlist-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 650px) {
  .nx-wishlist-shell {
    width: min(calc(100% - 28px), 1280px);
  }

  .nx-wishlist-hero {
    align-items: flex-start;
    flex-direction: column;
    padding: 29px;
  }

  .nx-wishlist-count {
    grid-template-columns: auto auto;
    gap: 7px;
    min-width: 0;
    min-height: 0;
  }

  .nx-wishlist-count strong {
    font-size: 20px;
  }

  .nx-wishlist-grid {
    grid-template-columns: 1fr;
  }

  .nx-wishlist-image {
    height: 330px;
  }

  .nx-wishlist-toolbar,
  .nx-wishlist-bottom {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 420px) {
  .nx-wishlist-image {
    height: 270px;
  }

  .nx-wishlist-actions {
    grid-template-columns: 1fr;
  }

  .nx-remove-item {
    width: 100%;
  }
}
</style>
