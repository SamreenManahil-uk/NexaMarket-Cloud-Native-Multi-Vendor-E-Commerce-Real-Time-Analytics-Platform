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

  if (!token) {
    loading.value = false;
    return;
  }

  try {
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

onMounted(loadOrder);
</script>

<template>
  <main class="nx-order-page">
    <div class="nx-order-shell">
      <div v-if="loading" class="nx-order-state">
        <div class="nx-order-spinner"></div>
        <h2>Confirming your order...</h2>
        <p>Retrieving your NexaMarket order details.</p>
      </div>

      <div
        v-else-if="error"
        class="nx-order-state nx-order-state-error"
      >
        <span>!</span>
        <h2>We couldn't load this order</h2>
        <p>{{ error }}</p>
        <RouterLink to="/orders">View your orders</RouterLink>
      </div>

      <template v-else-if="order">
        <section class="nx-confirm-hero">
          <div class="nx-confirm-check">✓</div>

          <span>ORDER CREATED</span>

          <h1>Thank you for your order.</h1>

          <p>
            Your simulated NexaMarket checkout has been completed
            successfully.
          </p>

          <div class="nx-confirm-number">
            Order
            <strong>
              #{{ order.id.slice(0, 8).toUpperCase() }}
            </strong>
          </div>
        </section>

        <div class="nx-confirm-layout">
          <section class="nx-order-card">
            <div class="nx-order-card-heading">
              <div>
                <span>ORDER DETAILS</span>
                <h2>Your purchase</h2>
              </div>

              <span
                class="nx-order-status"
                :class="`status-${order.status.toLowerCase()}`"
              >
                {{ order.status }}
              </span>
            </div>

            <div class="nx-confirm-items">
              <article
                v-for="item in order.items"
                :key="item.id"
                class="nx-confirm-item"
              >
                <div class="nx-confirm-item-icon">
                  {{ item.quantity }}
                </div>

                <div>
                  <strong>{{ item.productName }}</strong>
                  <p>
                    {{ item.quantity }} ×
                    £{{ Number(item.unitPrice).toFixed(2) }}
                  </p>
                </div>

                <strong>
                  £{{ Number(item.lineTotal).toFixed(2) }}
                </strong>
              </article>
            </div>

            <div class="nx-confirm-total">
              <span>Order total</span>
              <strong>
                £{{ Number(order.totalAmount).toFixed(2) }}
              </strong>
            </div>
          </section>

          <aside class="nx-confirm-side">
            <section class="nx-order-card">
              <span class="nx-order-eyebrow">
                WHAT HAPPENS NEXT?
              </span>

              <h2>Order saved</h2>

              <div class="nx-confirm-step">
                <span>1</span>
                <div>
                  <strong>Order created</strong>
                  <p>
                    Your purchase is now available in order history.
                  </p>
                </div>
              </div>

              <div class="nx-confirm-step">
                <span>2</span>
                <div>
                  <strong>Inventory updated</strong>
                  <p>
                    Stock validation is handled by the backend.
                  </p>
                </div>
              </div>

              <div class="nx-confirm-step">
                <span>3</span>
                <div>
                  <strong>Portfolio payment</strong>
                  <p>
                    No real payment or card transaction occurred.
                  </p>
                </div>
              </div>
            </section>

            <RouterLink
              :to="`/orders/${order.id}`"
              class="nx-order-primary"
            >
              View order details
            </RouterLink>

            <RouterLink
              to="/orders"
              class="nx-order-secondary"
            >
              View all orders
            </RouterLink>

            <RouterLink
              to="/#catalogue"
              class="nx-order-shopping"
            >
              Continue shopping →
            </RouterLink>
          </aside>
        </div>
      </template>
    </div>
  </main>
</template>
