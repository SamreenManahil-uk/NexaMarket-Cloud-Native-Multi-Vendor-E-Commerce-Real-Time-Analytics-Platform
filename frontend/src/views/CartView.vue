<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { authStore } from "../stores/auth";
import { commerceApi } from "../services/commerce";
import type { CartItem, CartData } from "../types/commerce";

const items = ref<CartItem[]>([]);
const loading = ref(true);
const error = ref("");
const busyItem = ref<string | null>(null);
const checkingOut = ref(false);

const subtotal = computed(() =>
  items.value.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
);

function extractItems(data: CartData): CartItem[] {
  return data.items ?? [];
}

async function loadCart() {
  const token = authStore.state.token;
  if (!token) return;

  try {
    loading.value = true;
    error.value = "";
    const response = await commerceApi.cart(token);
    items.value = extractItems(response.data);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to load cart.";
  } finally {
    loading.value = false;
  }
}

async function changeQuantity(item: CartItem, quantity: number) {
  const token = authStore.state.token;
  if (!token || quantity < 1 || quantity > item.product.stock) return;

  try {
    busyItem.value = item.id;
    error.value = "";
    await commerceApi.updateCartItem(token, item.id, quantity);
    await loadCart();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to update quantity.";
  } finally {
    busyItem.value = null;
  }
}

async function removeItem(item: CartItem) {
  const token = authStore.state.token;
  if (!token) return;

  try {
    busyItem.value = item.id;
    error.value = "";
    await commerceApi.removeCartItem(token, item.id);
    await loadCart();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to remove item.";
  } finally {
    busyItem.value = null;
  }
}

onMounted(loadCart);
</script>

<template>
  <main class="nx-cart-page">

    <section class="nx-cart-shell">

      <!-- Breadcrumb -->
      <nav class="nx-cart-breadcrumb" aria-label="Breadcrumb">
        <RouterLink to="/">Home</RouterLink>
        <span>›</span>
        <strong>Shopping Cart</strong>
      </nav>

      <!-- Heading -->
      <header class="nx-cart-header">
        <div>
          <span class="nx-cart-eyebrow">YOUR SHOPPING BAG</span>
          <h1>Shopping Cart</h1>

          <p v-if="items.length">
            {{ items.reduce((sum, item) => sum + item.quantity, 0) }}
            {{ items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "item" : "items" }}
            in your cart
          </p>

          <p v-else>
            Review your marketplace selections here.
          </p>
        </div>

        <RouterLink to="/#catalogue" class="nx-continue-top">
          ← Continue shopping
        </RouterLink>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="nx-cart-loading">
        <div class="nx-cart-spinner"></div>
        <p>Loading your cart...</p>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="nx-cart-error"
        role="alert"
      >
        <strong>We couldn't update your cart.</strong>
        <span>{{ error }}</span>
      </div>

      <!-- Empty -->
      <section v-else-if="!items.length" class="nx-cart-empty">

        <div class="nx-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M3 3h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H6" />
            <circle cx="10" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
          </svg>
        </div>

        <span>YOUR CART IS WAITING</span>

        <h2>Your cart is empty</h2>

        <p>
          Discover useful products across home, technology,
          workspace and everyday life.
        </p>

        <RouterLink to="/#catalogue">
          Explore marketplace
        </RouterLink>

      </section>

      <!-- Filled cart -->
      <div v-else class="nx-cart-layout">

        <!-- LEFT -->
        <section class="nx-cart-products">

          <div class="nx-cart-products-head">
            <h2>Your items</h2>

            <span>
              {{ items.length }}
              {{ items.length === 1 ? "product" : "products" }}
            </span>
          </div>

          <article
            v-for="item in items"
            :key="item.id"
            class="nx-cart-item"
          >

            <RouterLink
              :to="`/products/${item.product.id}`"
              class="nx-cart-image"
            >
              <img
                v-if="item.product.imageUrl"
                :src="item.product.imageUrl"
                :alt="item.product.name"
              />

              <span v-else aria-hidden="true">
                N
              </span>
            </RouterLink>

            <div class="nx-cart-info">

              <div class="nx-cart-item-top">

                <div>
                  <span class="nx-cart-seller">
                    {{ item.product.sellerName }}
                  </span>

                  <RouterLink
                    :to="`/products/${item.product.id}`"
                    class="nx-cart-name"
                  >
                    {{ item.product.name }}
                  </RouterLink>

                  <span
                    class="nx-cart-stock"
                    :class="{ low: item.product.stock <= 5 }"
                  >
                    <i></i>
                    {{ item.product.stock > 0 ? `${item.product.stock} available` : "Out of stock" }}
                  </span>
                </div>

                <strong class="nx-cart-unit-price">
                  £{{ Number(item.product.price).toFixed(2) }}
                </strong>

              </div>

              <div class="nx-cart-item-bottom">

                <div class="nx-cart-quantity-wrap">
                  <span>Quantity</span>

                  <div
                    class="nx-cart-quantity"
                    aria-label="Quantity controls"
                  >
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      :disabled="
                        item.quantity <= 1 ||
                        busyItem === item.id
                      "
                      @click="
                        changeQuantity(
                          item,
                          item.quantity - 1
                        )
                      "
                    >
                      −
                    </button>

                    <strong>
                      {{ item.quantity }}
                    </strong>

                    <button
                      type="button"
                      aria-label="Increase quantity"
                      :disabled="
                        item.quantity >= item.product.stock ||
                        busyItem === item.id
                      "
                      @click="
                        changeQuantity(
                          item,
                          item.quantity + 1
                        )
                      "
                    >
                      +
                    </button>
                  </div>
                </div>

                <div class="nx-cart-item-actions">

                  <button
                    class="nx-cart-remove"
                    type="button"
                    :disabled="busyItem === item.id"
                    @click="removeItem(item)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v5M14 11v5" />
                    </svg>

                    {{
                      busyItem === item.id
                        ? "Updating..."
                        : "Remove"
                    }}
                  </button>

                  <strong class="nx-cart-line-total">
                    £{{ (Number(item.product.price) * item.quantity).toFixed(2) }}
                  </strong>

                </div>

              </div>

            </div>

          </article>

          <RouterLink
            to="/#catalogue"
            class="nx-cart-continue"
          >
            <span>←</span>
            Continue shopping
          </RouterLink>

        </section>

        <!-- RIGHT SUMMARY -->
        <aside class="nx-cart-summary">

          <span class="nx-summary-eyebrow">
            ORDER SUMMARY
          </span>

          <h2>Summary</h2>

          <div class="nx-summary-lines">

            <div>
              <span>
                Items
                ({{ items.reduce((sum, item) => sum + item.quantity, 0) }})
              </span>

              <strong>
                £{{ subtotal.toFixed(2) }}
              </strong>
            </div>

            <div>
              <span>Delivery</span>
              <strong class="nx-summary-free">
                Calculated at checkout
              </strong>
            </div>

          </div>

          <div class="nx-summary-total">
            <div>
              <span>Total</span>
              <strong>
                £{{ subtotal.toFixed(2) }}
              </strong>
            </div>

            <small>
              Final inventory and totals are validated
              by the server.
            </small>
          </div>

          <button
            class="nx-checkout-button"
            type="button"
            :disabled="checkingOut || !items.length"
            @click="$router.push('/checkout')"
          >
            {{
              checkingOut
                ? "Creating your order..."
                : "Proceed to checkout"
            }}

            <span aria-hidden="true">→</span>
          </button>

          <div class="nx-simulated-notice">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>

            <div>
              <strong>Portfolio checkout</strong>
              <span>
                This is a simulated purchase experience.
                No real card or payment is processed.
              </span>
            </div>
          </div>

          <div class="nx-summary-benefits">

            <div>
              <span>✓</span>
              Live inventory validation
            </div>

            <div>
              <span>✓</span>
              Secure account flow
            </div>

            <div>
              <span>✓</span>
              Order history after checkout
            </div>

          </div>

        </aside>

      </div>

    </section>

  </main>
</template>
