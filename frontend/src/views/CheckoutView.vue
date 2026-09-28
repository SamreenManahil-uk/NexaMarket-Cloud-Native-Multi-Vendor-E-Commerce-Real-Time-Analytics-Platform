<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { authStore } from "../stores/auth";
import { commerceApi } from "../services/commerce";
import { ordersApi } from "../services/orders";
import type { CartData, CartItem } from "../types/commerce";

const router = useRouter();

const items = ref<CartItem[]>([]);
const loading = ref(true);
const placingOrder = ref(false);
const error = ref("");

const itemCount = computed(() =>
  items.value.reduce((total, item) => total + item.quantity, 0),
);

const subtotal = computed(() =>
  items.value.reduce(
    (total, item) =>
      total + Number(item.product.price) * item.quantity,
    0,
  ),
);

async function loadCheckout() {
  const token = authStore.state.token;

  if (!token) {
    await router.push({
      path: "/auth",
      query: { redirect: "/checkout" },
    });
    return;
  }

  try {
    loading.value = true;
    error.value = "";

    const response = await commerceApi.cart(token);
    const data: CartData = response.data;

    items.value = data.items ?? [];

    if (!items.value.length) {
      await router.replace("/cart");
    }
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Unable to prepare checkout.";
  } finally {
    loading.value = false;
  }
}

async function placeOrder() {
  const token = authStore.state.token;

  if (!token || !items.value.length || placingOrder.value) return;

  try {
    placingOrder.value = true;
    error.value = "";

    const response = await ordersApi.checkout(token);

    await router.push({
      name: "order-confirmation",
      params: {
        id: response.data.id,
      },
    });
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Unable to place simulated order.";
  } finally {
    placingOrder.value = false;
  }
}

onMounted(loadCheckout);
</script>

<template>
  <main class="nx-checkout-page">
    <div class="nx-checkout-shell">
      <nav class="nx-checkout-breadcrumb" aria-label="Breadcrumb">
        <RouterLink to="/">Home</RouterLink>
        <span>›</span>
        <RouterLink to="/cart">Cart</RouterLink>
        <span>›</span>
        <strong>Checkout</strong>
      </nav>

      <header class="nx-checkout-heading">
        <div>
          <span>SECURE PORTFOLIO CHECKOUT</span>
          <h1>Checkout</h1>
          <p>
            Review your items before creating your simulated NexaMarket order.
          </p>
        </div>

        <RouterLink to="/cart" class="nx-checkout-back">
          ← Back to cart
        </RouterLink>
      </header>

      <div v-if="loading" class="nx-checkout-state">
        <div class="nx-checkout-spinner"></div>
        <strong>Preparing checkout...</strong>
        <p>Validating your current cart and inventory.</p>
      </div>

      <div
        v-else-if="error && !items.length"
        class="nx-checkout-error"
        role="alert"
      >
        <strong>Checkout unavailable</strong>
        <p>{{ error }}</p>
        <RouterLink to="/cart">Return to cart</RouterLink>
      </div>

      <div v-else class="nx-checkout-layout">
        <section class="nx-checkout-main">
          <article class="nx-checkout-card">
            <div class="nx-checkout-card-heading">
              <div class="nx-checkout-step">1</div>
              <div>
                <span>ORDER REVIEW</span>
                <h2>Your items</h2>
              </div>

              <strong class="nx-checkout-count">
                {{ itemCount }}
                {{ itemCount === 1 ? "item" : "items" }}
              </strong>
            </div>

            <div class="nx-checkout-products">
              <article
                v-for="item in items"
                :key="item.id"
                class="nx-checkout-product"
              >
                <RouterLink
                  :to="`/products/${item.product.id}`"
                  class="nx-checkout-product-image"
                >
                  <img
                    v-if="item.product.imageUrl"
                    :src="item.product.imageUrl"
                    :alt="item.product.name"
                  />
                  <div v-else class="nx-checkout-image-placeholder">
                    NM
                  </div>
                </RouterLink>

                <div class="nx-checkout-product-copy">
                  <small>{{ item.product.sellerName }}</small>

                  <RouterLink :to="`/products/${item.product.id}`">
                    <h3>{{ item.product.name }}</h3>
                  </RouterLink>

                  <p>
                    Quantity:
                    <strong>{{ item.quantity }}</strong>
                  </p>

                  <span>
                    {{ item.product.stock }} currently available
                  </span>
                </div>

                <div class="nx-checkout-product-price">
                  <small>
                    £{{ Number(item.product.price).toFixed(2) }} each
                  </small>

                  <strong>
                    £{{
                      (
                        Number(item.product.price) *
                        item.quantity
                      ).toFixed(2)
                    }}
                  </strong>
                </div>
              </article>
            </div>

            <RouterLink to="/cart" class="nx-checkout-edit">
              Edit shopping cart →
            </RouterLink>
          </article>

          <article class="nx-checkout-card">
            <div class="nx-checkout-card-heading">
              <div class="nx-checkout-step">2</div>
              <div>
                <span>DELIVERY</span>
                <h2>Portfolio delivery</h2>
              </div>
            </div>

            <div class="nx-checkout-info-box">
              <div class="nx-checkout-info-icon">⌂</div>

              <div>
                <strong>Simulated fulfilment</strong>
                <p>
                  NexaMarket demonstrates the commerce and order lifecycle
                  without arranging a real-world delivery.
                </p>
              </div>

              <span>Demo</span>
            </div>
          </article>

          <article class="nx-checkout-card">
            <div class="nx-checkout-card-heading">
              <div class="nx-checkout-step">3</div>
              <div>
                <span>PAYMENT</span>
                <h2>Simulated payment</h2>
              </div>
            </div>

            <div class="nx-checkout-payment-box">
              <div class="nx-checkout-payment-symbol">✓</div>

              <div>
                <strong>No real payment details required</strong>
                <p>
                  This portfolio checkout does not collect card numbers,
                  security codes or real payment credentials.
                </p>
              </div>
            </div>
          </article>
        </section>

        <aside class="nx-checkout-summary">
          <span class="nx-checkout-summary-label">ORDER SUMMARY</span>
          <h2>Summary</h2>

          <div class="nx-checkout-summary-row">
            <span>Items ({{ itemCount }})</span>
            <strong>£{{ subtotal.toFixed(2) }}</strong>
          </div>

          <div class="nx-checkout-summary-row">
            <span>Delivery</span>
            <strong>Demo</strong>
          </div>

          <div class="nx-checkout-summary-divider"></div>

          <div class="nx-checkout-summary-total">
            <span>Total</span>
            <strong>£{{ subtotal.toFixed(2) }}</strong>
          </div>

          <p class="nx-checkout-server-note">
            Final stock and order totals are validated by the NexaMarket
            backend when the order is created.
          </p>

          <p
            v-if="error"
            class="nx-checkout-inline-error"
            role="alert"
          >
            {{ error }}
          </p>

          <button
            type="button"
            class="nx-checkout-place-order"
            :disabled="placingOrder || !items.length"
            @click="placeOrder"
          >
            {{
              placingOrder
                ? "Creating order..."
                : "Place simulated order"
            }}
          </button>

          <div class="nx-checkout-safe">
            <strong>Portfolio transaction</strong>
            <p>
              No money will be charged and no real payment will be processed.
            </p>
          </div>

          <ul class="nx-checkout-benefits">
            <li><span>✓</span> Server-side inventory validation</li>
            <li><span>✓</span> Authenticated checkout flow</li>
            <li><span>✓</span> Order history after checkout</li>
          </ul>
        </aside>
      </div>
    </div>
  </main>
</template>
