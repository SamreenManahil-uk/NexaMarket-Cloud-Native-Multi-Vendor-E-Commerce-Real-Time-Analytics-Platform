<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { authStore } from "../stores/auth";
import { ordersApi } from "../services/orders";
import type { Order } from "../types/orders";

const orders = ref<Order[]>([]);
const loading = ref(true);
const error = ref("");

const totalSpent = computed(() =>
  orders.value.reduce(
    (sum, order) => sum + Number(order.totalAmount),
    0,
  ),
);

const totalItems = computed(() =>
  orders.value.reduce(
    (sum, order) =>
      sum +
      order.items.reduce(
        (itemSum, item) => itemSum + item.quantity,
        0,
      ),
    0,
  ),
);

async function loadOrders() {
  const token = authStore.state.token;
  if (!token) return;

  try {
    loading.value = true;
    error.value = "";

    const response = await ordersApi.list(token);
    orders.value = response.data ?? [];
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Unable to load orders.";
  } finally {
    loading.value = false;
  }
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

onMounted(loadOrders);
</script>

<template>
  <main class="nx-order-page">
    <div class="nx-order-shell">
      <nav class="nx-order-breadcrumb">
        <RouterLink to="/">Home</RouterLink>
        <span>›</span>
        <RouterLink to="/account">Account</RouterLink>
        <span>›</span>
        <strong>Orders</strong>
      </nav>

      <header class="nx-orders-heading">
        <div>
          <span>YOUR PURCHASES</span>
          <h1>Order history</h1>
          <p>
            Review your simulated NexaMarket purchases and
            order details.
          </p>
        </div>

        <RouterLink
          to="/#catalogue"
          class="nx-order-secondary"
        >
          Continue shopping
        </RouterLink>
      </header>

      <div v-if="loading" class="nx-order-state">
        <div class="nx-order-spinner"></div>
        <h2>Loading your orders...</h2>
      </div>

      <div
        v-else-if="error"
        class="nx-order-state nx-order-state-error"
      >
        <h2>Unable to load orders</h2>
        <p>{{ error }}</p>
      </div>

      <template v-else>
        <section
          v-if="orders.length"
          class="nx-orders-stats"
        >
          <article>
            <span>ORDERS</span>
            <strong>{{ orders.length }}</strong>
            <p>Completed checkout records</p>
          </article>

          <article>
            <span>ITEMS</span>
            <strong>{{ totalItems }}</strong>
            <p>Products across your orders</p>
          </article>

          <article>
            <span>PORTFOLIO TOTAL</span>
            <strong>£{{ totalSpent.toFixed(2) }}</strong>
            <p>Simulated purchase value</p>
          </article>
        </section>

        <section
          v-if="!orders.length"
          class="nx-orders-empty"
        >
          <div>NM</div>
          <span>NO ORDERS YET</span>
          <h2>Your order history is empty.</h2>
          <p>
            Products you purchase through the simulated
            checkout will appear here.
          </p>
          <RouterLink
            to="/#catalogue"
            class="nx-order-primary"
          >
            Explore marketplace
          </RouterLink>
        </section>

        <section v-else class="nx-orders-list">
          <div class="nx-orders-list-heading">
            <h2>Recent orders</h2>
            <span>{{ orders.length }} total</span>
          </div>

          <RouterLink
            v-for="order in orders"
            :key="order.id"
            :to="`/orders/${order.id}`"
            class="nx-order-row"
          >
            <div class="nx-order-row-number">
              <small>ORDER</small>
              <strong>
                #{{ order.id.slice(0, 8).toUpperCase() }}
              </strong>
              <span>{{ date(order.createdAt) }}</span>
            </div>

            <div>
              <small>ITEMS</small>
              <strong>
                {{
                  order.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0,
                  )
                }}
              </strong>
            </div>

            <div>
              <small>STATUS</small>
              <span
                class="nx-order-status"
                :class="`status-${order.status.toLowerCase()}`"
              >
                {{ order.status }}
              </span>
            </div>

            <div>
              <small>TOTAL</small>
              <strong>
                £{{ Number(order.totalAmount).toFixed(2) }}
              </strong>
            </div>

            <span class="nx-order-row-arrow">→</span>
          </RouterLink>
        </section>
      </template>
    </div>
  </main>
</template>
