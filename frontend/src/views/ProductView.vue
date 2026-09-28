<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, errorMessage } from "../services/api";
import { commerceApi } from "../services/commerce";
import { authStore } from "../stores/auth";
import { trackClickstream } from "../services/clickstream";
import type { Product } from "../types/catalogue";

const route = useRoute();
const router = useRouter();

const product = ref<Product | null>(null);
const loading = ref(true);
const error = ref("");
const actionMessage = ref("");
const actionError = ref(false);
const busy = ref<"cart" | "wishlist" | null>(null);
const quantity = ref(1);

const productId = computed(() => String(route.params.id ?? ""));

const formattedPrice = computed(() => {
  if (!product.value) return "£0.00";
  return `£${Number(product.value.price).toFixed(2)}`;
});

const stockLabel = computed(() => {
  if (!product.value) return "";

  if (product.value.available_quantity <= 0) {
    return "Currently unavailable";
  }

  if (product.value.available_quantity <= 5) {
    return `Only ${product.value.available_quantity} left`;
  }

  return `${product.value.available_quantity} available`;
});

function requireCustomer(): string | null {
  const token = authStore.state.token;
  const user = authStore.state.user;

  if (!token || !user) {
    void router.push({
      path: "/auth",
      query: { redirect: route.fullPath },
    });

    return null;
  }

  if (user.role !== "CUSTOMER") {
    actionError.value = true;
    actionMessage.value =
      "Cart and wishlist are available to customer accounts.";
    return null;
  }

  return token;
}

async function loadProduct() {
  const controller = new AbortController();

  try {
    loading.value = true;
    error.value = "";
    actionMessage.value = "";
    quantity.value = 1;

    const response = await api.product(
      productId.value,
      controller.signal,
    );

    product.value = response.data;

    void trackClickstream("PRODUCT_VIEW", {
      productId: productId.value,
      path: route.fullPath,
    });
  } catch (err) {
    product.value = null;
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
  }
}

function decreaseQuantity() {
  if (quantity.value > 1) {
    quantity.value -= 1;
  }
}

function increaseQuantity() {
  if (
    product.value &&
    quantity.value < product.value.available_quantity
  ) {
    quantity.value += 1;
  }
}

async function addToCart() {
  if (!product.value || product.value.available_quantity <= 0) {
    return;
  }

  const token = requireCustomer();
  if (!token) return;

  try {
    busy.value = "cart";
    actionMessage.value = "";
    actionError.value = false;

    await commerceApi.addToCart(
      token,
      product.value.id,
      quantity.value,
    );

    void trackClickstream("ADD_TO_CART", {
      productId: product.value.id,
      path: route.fullPath,
    });

    actionMessage.value =
      `${quantity.value} × ${product.value.name} added to your cart.`;
  } catch (err) {
    actionError.value = true;
    actionMessage.value =
      err instanceof Error
        ? err.message
        : "Unable to add this product to your cart.";
  } finally {
    busy.value = null;
  }
}

async function addToWishlist() {
  if (!product.value) return;

  const token = requireCustomer();
  if (!token) return;

  try {
    busy.value = "wishlist";
    actionMessage.value = "";
    actionError.value = false;

    await commerceApi.addToWishlist(
      token,
      product.value.id,
    );

    void trackClickstream("ADD_TO_WISHLIST", {
      productId: product.value.id,
      path: route.fullPath,
    });

    actionMessage.value =
      `${product.value.name} saved to your wishlist.`;
  } catch (err) {
    actionError.value = true;
    actionMessage.value =
      err instanceof Error
        ? err.message
        : "Unable to save this product.";
  } finally {
    busy.value = null;
  }
}

watch(
  () => route.params.id,
  () => {
    void loadProduct();
  },
);

onMounted(loadProduct);
</script>

<template>
  <main class="pd-page">
    <div class="pd-shell">
      <nav class="pd-breadcrumb">
        <RouterLink to="/">Home</RouterLink>
        <span>›</span>

        <RouterLink
          v-if="product"
          :to="{
            path: '/',
            query: {
              category: product.category.slug,
            },
          }"
        >
          {{ product.category.name }}
        </RouterLink>

        <template v-if="product">
          <span>›</span>
          <strong>{{ product.name }}</strong>
        </template>
      </nav>

      <section
        v-if="loading"
        class="pd-state"
      >
        <div class="pd-spinner"></div>
        <h2>Loading product</h2>
        <p>Getting the latest catalogue information.</p>
      </section>

      <section
        v-else-if="error"
        class="pd-state"
      >
        <div class="pd-state-icon">!</div>
        <h2>Product unavailable</h2>
        <p>{{ error }}</p>

        <RouterLink to="/">
          Back to marketplace
        </RouterLink>
      </section>

      <template v-else-if="product">
        <section class="pd-layout">
          <div class="pd-gallery">
            <div class="pd-image-stage">
              <img
                v-if="product.image_url"
                :src="product.image_url"
                :alt="product.name"
              />

              <div
                v-else
                class="pd-image-placeholder"
              >
                <span>NM</span>
                <small>Product image unavailable</small>
              </div>

              <span class="pd-category-chip">
                {{ product.category.name }}
              </span>
            </div>

            <div class="pd-image-note">
              <span>✦</span>

              <div>
                <strong>Marketplace listing</strong>
                <p>
                  Product imagery and information are
                  provided through the NexaMarket catalogue.
                </p>
              </div>
            </div>
          </div>

          <div class="pd-info">
            <span class="pd-eyebrow">
              NEXAMARKET MARKETPLACE
            </span>

            <h1>{{ product.name }}</h1>

            <RouterLink
              :to="{
                path: '/',
                query: {
                  category: product.category.slug,
                },
              }"
              class="pd-category-link"
            >
              {{ product.category.name }}
              <span>→</span>
            </RouterLink>

            <div class="pd-seller">
              <div class="pd-store-icon">
                N
              </div>

              <div>
                <small>Sold by</small>
                <strong>
                  {{ product.seller.store_name }}
                </strong>
              </div>
            </div>

            <div class="pd-price-row">
              <strong>{{ formattedPrice }}</strong>

              <span
                class="pd-stock"
                :class="{
                  unavailable:
                    product.available_quantity <= 0,
                }"
              >
                <i></i>
                {{ stockLabel }}
              </span>
            </div>

            <p class="pd-description">
              {{
                product.description ||
                "No additional product description has been provided by the seller."
              }}
            </p>

            <div class="pd-divider"></div>

            <template
              v-if="product.available_quantity > 0"
            >
              <div class="pd-purchase-label">
                <strong>Quantity</strong>
                <span>
                  {{ product.available_quantity }}
                  currently available
                </span>
              </div>

              <div class="pd-purchase-row">
                <div class="pd-quantity">
                  <button
                    type="button"
                    :disabled="quantity <= 1"
                    aria-label="Decrease quantity"
                    @click="decreaseQuantity"
                  >
                    −
                  </button>

                  <strong>{{ quantity }}</strong>

                  <button
                    type="button"
                    :disabled="
                      quantity >=
                      product.available_quantity
                    "
                    aria-label="Increase quantity"
                    @click="increaseQuantity"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  class="pd-cart-button"
                  :disabled="busy !== null"
                  @click="addToCart"
                >
                  <span>
                    {{
                      busy === "cart"
                        ? "Adding..."
                        : "Add to cart"
                    }}
                  </span>

                  <span>→</span>
                </button>
              </div>
            </template>

            <div
              v-else
              class="pd-out-stock"
            >
              This product is currently out of stock.
            </div>

            <button
              type="button"
              class="pd-wishlist-button"
              :disabled="busy !== null"
              @click="addToWishlist"
            >
              <span>♡</span>

              {{
                busy === "wishlist"
                  ? "Saving..."
                  : "Save to wishlist"
              }}
            </button>

            <div
              v-if="actionMessage"
              class="pd-message"
              :class="{ error: actionError }"
              role="status"
            >
              {{ actionMessage }}
            </div>

            <div class="pd-feature-grid">
              <div>
                <span>01</span>
                <strong>Live inventory</strong>
                <small>
                  Availability comes from catalogue stock.
                </small>
              </div>

              <div>
                <span>02</span>
                <strong>Saved products</strong>
                <small>
                  Customer accounts can build a wishlist.
                </small>
              </div>

              <div>
                <span>03</span>
                <strong>Simulated checkout</strong>
                <small>
                  Portfolio checkout without real payments.
                </small>
              </div>
            </div>
          </div>
        </section>

        <section class="pd-details-section">
          <div>
            <span>PRODUCT INFORMATION</span>
            <h2>About this product</h2>
          </div>

          <div class="pd-details-copy">
            <p>
              {{
                product.description ||
                "The seller has not supplied an extended description for this listing."
              }}
            </p>

            <dl>
              <div>
                <dt>Category</dt>
                <dd>{{ product.category.name }}</dd>
              </div>

              <div>
                <dt>Seller</dt>
                <dd>
                  {{ product.seller.store_name }}
                </dd>
              </div>

              <div>
                <dt>Availability</dt>
                <dd>
                  {{ product.available_quantity }}
                  units
                </dd>
              </div>

              <div>
                <dt>Price</dt>
                <dd>{{ formattedPrice }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="pd-bottom-banner">
          <div>
            <span>CONTINUE DISCOVERING</span>
            <h2>
              More products are waiting in the marketplace.
            </h2>
          </div>

          <RouterLink to="/#catalogue">
            Explore products
            <span>→</span>
          </RouterLink>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.pd-page {
  min-height: 80vh;
  padding: 28px 0 80px;
  background: #f7f7f3;
  color: #173c30;
}

.pd-shell {
  width: min(calc(100% - 48px), 1280px);
  margin: 0 auto;
}

.pd-breadcrumb {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 42px;
  margin-bottom: 20px;
  color: #858d88;
  font-size: 12px;
}

.pd-breadcrumb a {
  color: inherit;
  text-decoration: none;
}

.pd-breadcrumb strong {
  overflow: hidden;
  color: #3c5148;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pd-layout {
  display: grid;
  grid-template-columns:
    minmax(0, 1.05fr)
    minmax(400px, .95fr);
  gap: 58px;
  align-items: start;
}

.pd-gallery {
  min-width: 0;
}

.pd-image-stage {
  position: relative;
  height: 610px;
  overflow: hidden;
  border-radius: 26px;
  background: #eeefea;
}

.pd-image-stage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pd-image-placeholder {
  display: grid;
  place-items: center;
  align-content: center;
  width: 100%;
  height: 100%;
  color: #667b72;
}

.pd-image-placeholder span {
  font-size: 55px;
  font-weight: 900;
}

.pd-image-placeholder small {
  margin-top: 8px;
}

.pd-category-chip {
  position: absolute;
  top: 18px;
  left: 18px;
  padding: 9px 13px;
  border-radius: 999px;
  background: rgba(255,255,255,.94);
  color: #214d3c;
  font-size: 10px;
  font-weight: 850;
  box-shadow:
    0 7px 22px rgba(18,51,40,.08);
}

.pd-image-note {
  display: flex;
  gap: 13px;
  align-items: flex-start;
  padding: 18px 6px 0;
  color: #6f7974;
}

.pd-image-note > span {
  color: #c89337;
  font-size: 17px;
}

.pd-image-note strong {
  display: block;
  margin-bottom: 3px;
  color: #354b42;
  font-size: 11px;
}

.pd-image-note p {
  margin: 0;
  font-size: 10px;
  line-height: 1.5;
}

.pd-info {
  padding: 23px 0 0;
}

.pd-eyebrow {
  display: block;
  margin-bottom: 14px;
  color: #317256;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .15em;
}

.pd-info h1 {
  max-width: 620px;
  margin: 0;
  color: #173c30;
  font-size: clamp(40px, 4.8vw, 65px);
  line-height: .98;
  letter-spacing: -.055em;
}

.pd-category-link {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-top: 17px;
  color: #5e756b;
  font-size: 11px;
  font-weight: 750;
  text-decoration: none;
}

.pd-seller {
  display: flex;
  gap: 11px;
  align-items: center;
  padding: 26px 0 21px;
}

.pd-store-icon {
  display: grid;
  place-items: center;
  width: 39px;
  height: 39px;
  border-radius: 50%;
  background: #e6eee9;
  color: #235c46;
  font-size: 13px;
  font-weight: 900;
}

.pd-seller small,
.pd-seller strong {
  display: block;
}

.pd-seller small {
  margin-bottom: 2px;
  color: #959c98;
  font-size: 9px;
}

.pd-seller strong {
  color: #334d42;
  font-size: 12px;
}

.pd-price-row {
  display: flex;
  justify-content: space-between;
  gap: 25px;
  align-items: center;
  padding: 20px 0;
  border-top: 1px solid #e1e5e0;
  border-bottom: 1px solid #e1e5e0;
}

.pd-price-row > strong {
  color: #173c30;
  font-size: 32px;
  letter-spacing: -.035em;
}

.pd-stock {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  color: #2c7657;
  font-size: 10px;
  font-weight: 800;
}

.pd-stock i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #48a979;
  box-shadow:
    0 0 0 4px rgba(72,169,121,.12);
}

.pd-stock.unavailable {
  color: #9b4e47;
}

.pd-stock.unavailable i {
  background: #bd6259;
  box-shadow:
    0 0 0 4px rgba(189,98,89,.12);
}

.pd-description {
  margin: 22px 0 0;
  color: #6e7772;
  font-size: 13px;
  line-height: 1.75;
}

.pd-divider {
  height: 1px;
  margin: 25px 0;
  background: #e3e6e2;
}

.pd-purchase-label {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 11px;
}

.pd-purchase-label strong {
  font-size: 11px;
}

.pd-purchase-label span {
  color: #929995;
  font-size: 10px;
}

.pd-purchase-row {
  display: grid;
  grid-template-columns: 126px 1fr;
  gap: 11px;
}

.pd-quantity {
  display: grid;
  grid-template-columns: 39px 1fr 39px;
  align-items: center;
  min-height: 52px;
  border: 1px solid #dce1dc;
  border-radius: 999px;
  background: #fff;
  text-align: center;
}

.pd-quantity button {
  height: 100%;
  border: 0;
  background: transparent;
  color: #173c30;
  font-size: 18px;
  cursor: pointer;
}

.pd-quantity button:disabled {
  color: #c5cbc7;
  cursor: not-allowed;
}

.pd-quantity strong {
  font-size: 12px;
}

.pd-cart-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 52px;
  padding: 0 22px;
  border: 0;
  border-radius: 999px;
  background: #173f32;
  color: #fff;
  font: inherit;
  font-size: 11px;
  font-weight: 850;
  cursor: pointer;
}

.pd-cart-button:hover:not(:disabled) {
  background: #0e3126;
}

.pd-cart-button:disabled {
  opacity: .55;
  cursor: wait;
}

.pd-wishlist-button {
  width: 100%;
  min-height: 48px;
  margin-top: 10px;
  border: 1px solid #d8ddd8;
  border-radius: 999px;
  background: transparent;
  color: #294c3e;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.pd-wishlist-button span {
  margin-right: 7px;
  font-size: 17px;
}

.pd-wishlist-button:hover:not(:disabled) {
  background: #fff;
}

.pd-wishlist-button:disabled {
  opacity: .55;
}

.pd-out-stock {
  padding: 16px;
  border-radius: 12px;
  background: #f5e5e2;
  color: #8d4c45;
  font-size: 11px;
  font-weight: 750;
}

.pd-message {
  padding: 12px 15px;
  margin-top: 12px;
  border-radius: 10px;
  background: #e7f1eb;
  color: #236044;
  font-size: 10px;
  font-weight: 750;
}

.pd-message.error {
  background: #f8e5e2;
  color: #914b43;
}

.pd-feature-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0,1fr));
  gap: 9px;
  margin-top: 24px;
}

.pd-feature-grid > div {
  padding: 14px;
  border-radius: 13px;
  background: #eeefe9;
}

.pd-feature-grid span,
.pd-feature-grid strong,
.pd-feature-grid small {
  display: block;
}

.pd-feature-grid span {
  margin-bottom: 12px;
  color: #8d9a94;
  font-size: 9px;
  font-weight: 900;
}

.pd-feature-grid strong {
  margin-bottom: 4px;
  color: #304a3f;
  font-size: 10px;
}

.pd-feature-grid small {
  color: #89918d;
  font-size: 8px;
  line-height: 1.4;
}

.pd-details-section {
  display: grid;
  grid-template-columns:
    minmax(240px,.65fr)
    minmax(0,1.35fr);
  gap: 80px;
  padding: 68px 0;
  margin-top: 68px;
  border-top: 1px solid #dfe3de;
}

.pd-details-section > div:first-child > span,
.pd-bottom-banner > div > span {
  display: block;
  margin-bottom: 10px;
  color: #347057;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .15em;
}

.pd-details-section h2,
.pd-bottom-banner h2 {
  margin: 0;
  font-size: 31px;
  line-height: 1.1;
  letter-spacing: -.04em;
}

.pd-details-copy > p {
  margin: 0 0 29px;
  color: #69746e;
  font-size: 13px;
  line-height: 1.8;
}

.pd-details-copy dl {
  margin: 0;
  border-top: 1px solid #dfe3de;
}

.pd-details-copy dl > div {
  display: flex;
  justify-content: space-between;
  gap: 25px;
  padding: 15px 0;
  border-bottom: 1px solid #dfe3de;
}

.pd-details-copy dt {
  color: #8a918d;
  font-size: 10px;
}

.pd-details-copy dd {
  margin: 0;
  color: #2b493c;
  font-size: 11px;
  font-weight: 750;
  text-align: right;
}

.pd-bottom-banner {
  display: flex;
  justify-content: space-between;
  gap: 40px;
  align-items: center;
  padding: 37px 40px;
  border-radius: 22px;
  background: #f1dfda;
}

.pd-bottom-banner > div > span {
  color: #9b574e;
}

.pd-bottom-banner h2 {
  max-width: 580px;
}

.pd-bottom-banner > a,
.pd-state > a {
  display: flex;
  gap: 28px;
  align-items: center;
  min-height: 47px;
  padding: 0 20px;
  border-radius: 999px;
  background: #fff;
  color: #603e38;
  font-size: 10px;
  font-weight: 850;
  text-decoration: none;
}

.pd-state {
  display: grid;
  place-items: center;
  min-height: 500px;
  padding: 50px;
  border-radius: 22px;
  background: #fff;
  text-align: center;
}

.pd-state h2 {
  margin: 16px 0 6px;
  font-size: 28px;
}

.pd-state p {
  max-width: 430px;
  margin: 0 0 22px;
  color: #818984;
  font-size: 12px;
}

.pd-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #dce4df;
  border-top-color: #27684f;
  border-radius: 50%;
  animation: pdSpin .8s linear infinite;
}

@keyframes pdSpin {
  to { transform: rotate(360deg); }
}

.pd-state-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #f7e4e1;
  color: #965048;
  font-size: 22px;
  font-weight: 900;
}

@media (max-width: 980px) {
  .pd-layout {
    grid-template-columns: 1fr;
    gap: 25px;
  }

  .pd-image-stage {
    height: min(75vw, 650px);
  }

  .pd-info {
    padding-top: 10px;
  }
}

@media (max-width: 650px) {
  .pd-shell {
    width: min(calc(100% - 28px),1280px);
  }

  .pd-page {
    padding-top: 18px;
  }

  .pd-image-stage {
    height: 105vw;
    max-height: 520px;
    border-radius: 19px;
  }

  .pd-info h1 {
    font-size: 39px;
  }

  .pd-price-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 9px;
  }

  .pd-purchase-row {
    grid-template-columns: 1fr;
  }

  .pd-quantity {
    max-width: 145px;
  }

  .pd-feature-grid {
    grid-template-columns: 1fr;
  }

  .pd-details-section {
    grid-template-columns: 1fr;
    gap: 27px;
    padding: 45px 0;
    margin-top: 45px;
  }

  .pd-bottom-banner {
    align-items: flex-start;
    flex-direction: column;
    padding: 29px;
  }
}
</style>
