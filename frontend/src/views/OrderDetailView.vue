<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { authStore } from "../stores/auth";
import { ordersApi } from "../services/orders";
import type { Order } from "../types/orders";

const route = useRoute();
const order = ref<Order | null>(null);
const loading = ref(true);
const error = ref("");

async function loadOrder() {
  const token = authStore.state.token;
  if (!token) return;

  try {
    loading.value = true;
    error.value = "";

    const response = await ordersApi.get(
      token,
      String(route.params.id),
    );

    order.value = response.data;
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Unable to load order.";
  } finally {
    loading.value = false;
  }
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

onMounted(loadOrder);
</script>

<template>
  <main class="nx-order-page">
    <div class="nx-order-shell">
      <nav class="nx-order-breadcrumb">
        <RouterLink to="/">Home</RouterLink>
        <span>›</span>
        <RouterLink to="/orders">Orders</RouterLink>
        <span>›</span>
        <strong>Order details</strong>
      </nav>

      <div v-if="loading" class="nx-order-state">
        <div class="nx-order-spinner"></div>
        <h2>Loading order...</h2>
      </div>

      <div
        v-else-if="error"
        class="nx-order-state nx-order-state-error"
      >
        <h2>Unable to load order</h2>
        <p>{{ error }}</p>
        <RouterLink to="/orders">
          Return to orders
        </RouterLink>
      </div>

      <template v-else-if="order">
        <header class="nx-order-detail-heading">
          <div>
            <span>ORDER DETAILS</span>
            <h1>
              Order #{{ order.id.slice(0, 8).toUpperCase() }}
            </h1>
            <p>Created {{ date(order.createdAt) }}</p>
          </div>

          <span
            class="nx-order-status nx-order-status-large"
            :class="`status-${order.status.toLowerCase()}`"
          >
            {{ order.status }}
          </span>
        </header>

        <div class="nx-order-detail-layout">
          <section class="nx-order-card">
            <div class="nx-order-card-heading">
              <div>
                <span>PRODUCTS</span>
                <h2>Items in this order</h2>
              </div>
            </div>

            <article
              v-for="item in order.items"
              :key="item.id"
              class="nx-order-detail-item"
            >
              <div class="nx-order-item-quantity">
                {{ item.quantity }}
              </div>

              <div>
                <RouterLink
                  v-if="item.productId"
                  :to="`/products/${item.productId}`"
                >
                  <strong>{{ item.productName }}</strong>
                </RouterLink>

                <strong v-else>
                  {{ item.productName }}
                </strong>

                <p>
                  £{{ Number(item.unitPrice).toFixed(2) }}
                  each
                </p>
              </div>

              <div class="nx-order-line-total">
                <small>LINE TOTAL</small>
                <strong>
                  £{{ Number(item.lineTotal).toFixed(2) }}
                </strong>
              </div>
            </article>
          </section>

          <aside class="nx-order-detail-side">
            <section class="nx-order-card">
              <span class="nx-order-eyebrow">
                ORDER SUMMARY
              </span>

              <div class="nx-order-summary-line">
                <span>Status</span>
                <strong>{{ order.status }}</strong>
              </div>

              <div class="nx-order-summary-line">
                <span>
                  Items
                </span>
                <strong>
                  {{
                    order.items.reduce(
                      (sum, item) =>
                        sum + item.quantity,
                      0,
                    )
                  }}
                </strong>
              </div>

              <div class="nx-order-summary-divider"></div>

              <div class="nx-order-summary-total">
                <span>Total</span>
                <strong>
                  £{{ Number(order.totalAmount).toFixed(2) }}
                </strong>
              </div>

              <div class="nx-order-demo-note">
                <strong>Simulated checkout</strong>
                <p>
                  No real payment was processed for this
                  portfolio transaction.
                </p>
              </div>
            </section>

            <RouterLink
              to="/orders"
              class="nx-order-secondary"
            >
              ← Back to all orders
            </RouterLink>

            <RouterLink
              to="/#catalogue"
              class="nx-order-primary"
            >
              Continue shopping
            </RouterLink>
          </aside>
        </div>
      </template>
    </div>
  </main>
</template>
