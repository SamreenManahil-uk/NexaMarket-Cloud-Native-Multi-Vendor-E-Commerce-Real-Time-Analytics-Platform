<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { authStore } from "../stores/auth";
import { useRoute, useRouter } from "vue-router";
import { trackClickstream } from "../services/clickstream";

const user = computed(() => authStore.state.user);
const router = useRouter();
const route = useRoute();

const accountPath = computed(() => {
  if (!user.value) return "/auth";
  if (user.value.role === "SELLER") return "/seller";
  if (user.value.role === "ADMIN") return "/admin";
  return "/account";
});
const searchQuery = ref(String(route.query.search ?? ""));
const mobileOpen = ref(false);

async function submitSearch() {
  const query = searchQuery.value.trim();
  if (!query) return;

  void trackClickstream("SEARCH", {
    searchQuery: query,
    path: `/?search=${encodeURIComponent(query)}#catalogue`,
  });

  mobileOpen.value = false;

  await router.push({
    path: "/",
    query: { search: query },
    hash: "#catalogue",
  });
}

function closeMobile() {
  mobileOpen.value = false;
}

watch(
  () => route.query.search,
  (value) => {
    searchQuery.value = String(value ?? "");
  },
);

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
  },
);
</script>

<template>
  <header class="site-header">
    <div class="shopcart-topbar">
      <div class="container shopcart-topbar-inner">
        <span>Marketplace portfolio experience</span>

        <div>
          <RouterLink to="/nexa-ai">Nexa AI</RouterLink>
          <span class="topbar-divider">|</span>
          <span>English</span>
          <span class="topbar-divider">|</span>
          <span>GBP</span>
        </div>
      </div>
    </div>

    <div class="container shopcart-main-header">
      <RouterLink
        to="/"
        class="shopcart-logo"
        aria-label="NexaMarket home"
        @click="closeMobile"
      >
        <span class="shopcart-logo-mark" aria-hidden="true">
          N
        </span>

        <span>
          NexaMarket<span class="brand-dot">.</span>
        </span>
      </RouterLink>

      <nav class="desktop-primary-nav" aria-label="Primary navigation">
        <RouterLink :to="{ path: '/', hash: '#categories' }">
          Categories
          <svg class="nav-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </RouterLink>

        <RouterLink :to="{ path: '/', hash: '#catalogue' }">
          Products
        </RouterLink>

        <RouterLink to="/nexa-ai">
          Nexa AI
        </RouterLink>
      </nav>

      <form
        class="shopcart-search"
        role="search"
        @submit.prevent="submitSearch"
      >
        <input
          v-model="searchQuery"
          type="search"
          aria-label="Search NexaMarket"
          placeholder="Search Product"
        />

        <button type="submit" aria-label="Search">
          <svg class="header-svg-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.7-3.7" />
          </svg>
        </button>
      </form>

      <div class="shopcart-actions">
        <RouterLink
          :to="accountPath"
          class="shopcart-action"
        >
          <svg class="header-svg-icon action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
          </svg>
          <span>{{ user ? user.firstName : "Account" }}</span>
        </RouterLink>

        <RouterLink
          :to="user ? '/cart' : '/auth?redirect=/cart'"
          class="shopcart-action"
        >
          <svg class="header-svg-icon action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 5h2l2.1 9.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6" />
            <circle cx="9" cy="20" r="1" />
            <circle cx="17" cy="20" r="1" />
          </svg>
          <span>Cart</span>
        </RouterLink>

        <button
          type="button"
          class="mobile-menu-button"
          :aria-expanded="mobileOpen"
          aria-label="Toggle navigation"
          @click="mobileOpen = !mobileOpen"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>

    <div
      v-if="mobileOpen"
      class="mobile-shopcart-menu"
    >
      <nav class="container" aria-label="Mobile navigation">
        <RouterLink :to="{ path: '/', hash: '#categories' }">
          Shop by category
        </RouterLink>

        <RouterLink :to="{ path: '/', hash: '#catalogue' }">
          Explore products
        </RouterLink>

        <RouterLink to="/nexa-ai">
          Nexa AI Assistant
        </RouterLink>

        <RouterLink
          :to="user ? '/wishlist' : '/auth?redirect=/wishlist'"
        >
          Wishlist
        </RouterLink>

        <RouterLink
          :to="user ? '/orders' : '/auth?redirect=/orders'"
        >
          Orders
        </RouterLink>

        <form
          class="mobile-search"
          @submit.prevent="submitSearch"
        >
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search Product"
            aria-label="Search NexaMarket"
          />

          <button type="submit">Search</button>
        </form>
      </nav>
    </div>
  </header>
</template>
