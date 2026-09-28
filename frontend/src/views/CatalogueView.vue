<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, errorMessage } from "../services/api";
import { commerceApi } from "../services/commerce";
import { authStore } from "../stores/auth";
import { trackClickstream } from "../services/clickstream";
import type { Category, Product } from "../types/catalogue";

const router = useRouter();
const route = useRoute();

const categories = ref<Category[]>([]);
const products = ref<Product[]>([]);
const loading = ref(true);
const error = ref("");
const actionMessage = ref("");
const busyProduct = ref<string | null>(null);



const categoryImageFallbacks = [
  "/products/air-fryer.png",
  "/products/coffee-machine.png",
  "/products/apple-watch.png",
  "/products/bathtub-2.png",
  "/products/earphones.png",
  "/products/juicer.png",
];

const homeCollections = computed(() => {
  const seen = new Set<string>();

  const derived = products.value
    .filter((product) => {
      const categoryName =
        typeof product.category === "string"
          ? product.category
          : product.category?.name;

      if (!categoryName || seen.has(categoryName)) {
        return false;
      }

      seen.add(categoryName);
      return true;
    })
    .map((product, index) => {
      const categoryName =
        typeof product.category === "string"
          ? product.category
          : product.category?.name ?? "Products";

      return {
        name: categoryName,
        image:
          product.image_url ||
          categoryImageFallbacks[index % categoryImageFallbacks.length],
        search: categoryName,
      };
    });

  if (derived.length >= 6) {
    return derived.slice(0, 6);
  }

  const extras = products.value
    .filter((product) => !derived.some((item) => item.image === product.image_url))
    .slice(0, 6 - derived.length)
    .map((product, index) => ({
      name: product.name,
      image:
        product.image_url ||
        categoryImageFallbacks[(derived.length + index) % categoryImageFallbacks.length],
      search: product.name,
    }));

  return [...derived, ...extras].slice(0, 6);
});

const visibleProducts = computed(() => products.value.slice(0, 12));

const bestDeals = computed(() => visibleProducts.value.slice(0, 4));
const weeklyProducts = computed(() => visibleProducts.value.slice(4, 8));
const moreProducts = computed(() => visibleProducts.value.slice(8, 12));

const catalogueEyebrow = computed(() => {
  if (route.query.search) return "SEARCH RESULTS";
  if (route.query.category) return "SELECTED CATEGORY";
  return "SHOP OUR PRODUCTS";
});

const catalogueTitle = computed(() => {
  const search = String(route.query.search ?? "").trim();

  if (search) return `Results for “${search}”`;

  return "Today’s best picks";
});

const catalogueDescription = computed(() => {
  const search = String(route.query.search ?? "").trim();

  if (search) {
    return `Products matching ${search} from the NexaMarket catalogue.`;
  }

  return "Explore products available from sellers across NexaMarket.";
});

async function loadHome() {
  const controller = new AbortController();

  try {
    loading.value = true;
    error.value = "";

    const [categoryResponse, productResponse] = await Promise.all([
      api.categories(controller.signal),
      api.products(1, 12, String(route.query.category ?? ""), String(route.query.search ?? ""), controller.signal),
    ]);

    categories.value = categoryResponse.data ?? [];
    products.value = productResponse.data ?? [];
  } catch (err) {
    console.error(err);
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
  }
}


function openProduct(id: string) {
  router.push(`/products/${id}`);
}

function requireCustomer(): string | null {
  const token = authStore.state.token;
  const user = authStore.state.user;

  if (!token || !user) {
    void router.push({ path: "/auth", query: { redirect: route.fullPath } });
    return null;
  }

  if (user.role !== "CUSTOMER") {
    actionMessage.value = "Cart and wishlist are available to customer accounts.";
    return null;
  }

  return token;
}

async function addProductToCart(product: Product) {
  const token = requireCustomer();
  if (!token || product.available_quantity <= 0) return;

  try {
    busyProduct.value = product.id;
    actionMessage.value = "";
    await commerceApi.addToCart(token, product.id, 1);
    actionMessage.value = `${product.name} added to your cart.`;
    void trackClickstream("ADD_TO_CART", {
      productId: product.id,
      path: route.fullPath,
    });
  } catch (err) {
    actionMessage.value = err instanceof Error ? err.message : "Unable to add this product to your cart.";
  } finally {
    busyProduct.value = null;
  }
}

async function addProductToWishlist(product: Product) {
  const token = requireCustomer();
  if (!token) return;

  try {
    busyProduct.value = product.id;
    actionMessage.value = "";
    await commerceApi.addToWishlist(token, product.id);
    actionMessage.value = `${product.name} saved to your wishlist.`;
    void trackClickstream("ADD_TO_WISHLIST", {
      productId: product.id,
      path: route.fullPath,
    });
  } catch (err) {
    actionMessage.value = err instanceof Error ? err.message : "Unable to save this product.";
  } finally {
    busyProduct.value = null;
  }
}


function productPrice(product: Product) {
  return `£${Number(product.price).toFixed(2)}`;
}

watch(() => [route.query.search, route.query.category], () => { void loadHome(); });

onMounted(loadHome);

/* ---------- Homepage visual merchandising ---------- */

const homeBrands = [
  {
    name: "Everyday Essentials",
    subtitle: "Practical picks for daily life",
    image: "/storefront/bathroom-banner.png",
  },
  {
    name: "Workspace",
    subtitle: "Useful desk essentials",
    image: "/storefront/bedroom-banner.png",
  },
  {
    name: "Home Living",
    subtitle: "Comfort for your space",
    image: "/storefront/home-living-banner-alt.png",
  },
  {
    name: "Everyday Tech",
    subtitle: "Simple technology essentials",
    image: "/storefront/home-living-banner.png",
  },
  {
    name: "Travel",
    subtitle: "Ready for days away",
    image: "/storefront/tech-collection-banner.png",
  },
  {
    name: "Outdoor",
    subtitle: "Useful outdoor products",
    image: "/storefront/travel-banner.png",
  },
  {
    name: "Nexa Select",
    subtitle: "Marketplace favourites",
    image: "/products/bed-2.png",
  },
  {
    name: "New Arrivals",
    subtitle: "Explore the latest catalogue",
    image: "/products/air-fryer.png",
  },
];

const homeOffers = [
  {
    eyebrow: "HOME PICKS",
    title: "Refresh your everyday space",
    copy: "Explore useful products selected from the NexaMarket catalogue.",
    image: "/storefront/workspace-banner.png",
    tone: "yellow",
  },
  {
    eyebrow: "TRAVEL PICKS",
    title: "Ready for your next journey",
    copy: "Browse practical accessories for days out and travel.",
    image: "/storefront/bathroom-banner.png",
    tone: "pink",
  },
  {
    eyebrow: "WORKSPACE",
    title: "Upgrade your desk setup",
    copy: "Discover useful products for focused and organised work.",
    image: "/storefront/bedroom-banner.png",
    tone: "green",
  },
  {
    eyebrow: "NEXA SELECT",
    title: "Discover marketplace favourites",
    copy: "Explore products available through the live NexaMarket catalogue.",
    image: "/storefront/home-living-banner-alt.png",
    tone: "red",
  },
];

const storeCards = [
  {
    name: "Nexa Everyday",
    description: "Everyday marketplace essentials",
    image: "/storefront/home-living-banner.png",
  },
  {
    name: "Nexa Home",
    description: "Home and workspace collection",
    image: "/storefront/tech-collection-banner.png",
  },
  {
    name: "Nexa Select",
    description: "Curated catalogue products",
    image: "/storefront/travel-banner.png",
  },
  {
    name: "Nexa Outdoor",
    description: "Travel and outdoor essentials",
    image: "/storefront/workspace-banner.png",
  },
];


</script>

<template>
  <main class="ref-home">

    <!-- ==================================================
         MARKETPLACE HERO
         ================================================== -->
    <section class="ref-market-hero">
      <div class="ref-market-hero-copy">
        <span class="ref-hero-eyebrow">NEXAMARKET MARKETPLACE</span>

        <h1>
          Shopping that
          <br />
          feels good.
        </h1>

        <p>
          Discover useful products for your home, desk,
          everyday life and adventures — all in one marketplace.
        </p>

        <div class="ref-hero-actions">
          <a href="#catalogue" class="ref-hero-primary">
            Shop now
          </a>

          <RouterLink to="/nexa-ai" class="ref-hero-secondary">
            Ask Nexa AI
          </RouterLink>
        </div>
      </div>

      <div class="ref-market-hero-visual" aria-hidden="true">
        <span class="ref-hero-shape ref-hero-shape-one"></span>
        <span class="ref-hero-shape ref-hero-shape-two"></span>
        <span class="ref-hero-shape ref-hero-shape-three"></span>

        <div class="ref-hero-product ref-hero-product-main">
          <img
            src="/products/air-fryer.png"
            alt=""
          />
        </div>

        <div class="ref-hero-product ref-hero-product-small ref-hero-product-mug">
          <img
            src="/products/apple-watch.png"
            alt=""
          />
        </div>

        <div class="ref-hero-product ref-hero-product-small ref-hero-product-bottle">
          <img
            src="/products/bathtub-2.png"
            alt=""
          />
        </div>

        <span class="ref-hero-badge">
          <strong>{{ products.length }}</strong>
          catalogue products
        </span>
      </div>
    </section>


    <!-- ==================================================
         TOP CATEGORY SECTION
         ================================================== -->
    <section id="categories" class="ref-section ref-categories-section">
      <div class="ref-section-head">
        <div>
          <h2>Shop Our Top Categories</h2>
        </div>

        <a href="#catalogue" class="ref-view-link">View all →</a>
      </div>

      <div class="ref-category-grid">
        <button
          v-for="collection in homeCollections"
          :key="collection.name"
          type="button"
          class="ref-category-card"
          @click="$router.push({ path: '/', query: { search: collection.search }, hash: '#catalogue' })"
        >
          <img
            :src="collection.image"
            :alt="collection.name"
          />

          <span class="ref-category-overlay"></span>

          <strong>{{ collection.name }}</strong>
        </button>
      </div>
    </section>


    <!-- ==================================================
         BEST DEALS
         ================================================== -->
    <section id="catalogue" class="ref-section">
      <div class="ref-section-head">
        <div>
          <span class="ref-eyebrow">{{ catalogueEyebrow }}</span>
          <h2>{{ route.query.search ? catalogueTitle : "Featured Marketplace Picks" }}</h2>
          <p>{{ catalogueDescription }}</p>
        </div>

        <span class="ref-view-link">View all →</span>
      </div>

      <div v-if="error" class="ref-message ref-error">
        {{ error }}
      </div>

      <div v-else-if="loading" class="ref-product-grid">
        <div v-for="i in 4" :key="i" class="ref-product-card">
          <div class="ref-product-image skeleton"></div>
          <div class="skeleton ref-skeleton-line"></div>
          <div class="skeleton ref-skeleton-line short"></div>
        </div>
      </div>

      <div v-else-if="bestDeals.length" class="ref-product-grid">
        <article
          v-for="product in bestDeals"
          :key="product.id"
          class="ref-product-card"
        >
          <div
            class="ref-product-image"
            role="link"
            tabindex="0"
            @click="openProduct(product.id)"
            @keydown.enter="openProduct(product.id)"
          >
            <img
              v-if="product.image_url"
              :src="product.image_url"
              :alt="product.name"
              loading="lazy"
            />

            <div v-else class="ref-image-fallback">
              Product image unavailable
            </div>

            <button
              class="ref-heart"
              type="button"
              :disabled="busyProduct === product.id"
              :aria-label="`Save ${product.name} to wishlist`"
              @click.stop="addProductToWishlist(product)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                />
              </svg>
            </button>
          </div>

          <div class="ref-product-title-row">
            <h3 @click="openProduct(product.id)">
              {{ product.name }}
            </h3>

            <strong>{{ productPrice(product) }}</strong>
          </div>

          <p class="ref-product-description">
            {{ product.description || `Available from ${product.seller.store_name} on NexaMarket.` }}
          </p>

          <div class="ref-product-meta">
            <span>{{ product.category.name }}</span>
            <span>•</span>
            <span>
              {{ product.available_quantity > 0
                ? `${product.available_quantity} in stock`
                : "Out of stock" }}
            </span>
          </div>

          <button
            class="ref-add-cart"
            type="button"
            :disabled="product.available_quantity <= 0 || busyProduct === product.id"
            @click="addProductToCart(product)"
          >
            {{
              product.available_quantity <= 0
                ? "Out of stock"
                : busyProduct === product.id
                  ? "Adding..."
                  : "Add to Cart"
            }}
          </button>
        </article>
      </div>
    </section>


    <!-- ==================================================
         BRAND / MARKETPLACE SECTION
         ================================================== -->
    <section class="ref-section">
      <div class="ref-section-head">
        <div>
          <span class="ref-eyebrow">MULTI-VENDOR MARKETPLACE</span>
          <h2>Explore Our Collections</h2>
        </div>
      </div>

      <div class="ref-brand-grid">
        <article class="ref-brand-card">
          <img src="/products/bed-2.png" alt="" />
          <div>
            <strong>Premium Tech</strong>
            <span>Everyday accessories</span>
          </div>
        </article>

        <article class="ref-brand-card">
          <img src="/products/coffee-machine.png" alt="" />
          <div>
            <strong>Desk Essentials</strong>
            <span>Workspace favourites</span>
          </div>
        </article>

        <article class="ref-brand-card">
          <img src="/products/apple-watch.png" alt="" />
          <div>
            <strong>Home Collection</strong>
            <span>Everyday home products</span>
          </div>
        </article>

        <article class="ref-brand-card">
          <img src="/products/bathtub-2.png" alt="" />
          <div>
            <strong>Outdoor Picks</strong>
            <span>Products for days out</span>
          </div>
        </article>
      </div>
    </section>


    <!-- ==================================================
         DISCOUNT / FEATURE CARDS
         ================================================== -->
    <section class="ref-section">
      <div class="ref-section-head">
        <div>
          <span class="ref-eyebrow">DISCOVER MORE</span>
          <h2>Discover What's New</h2>
        </div>
      </div>

      <div class="ref-feature-grid">

        <article class="ref-feature-card ref-feature-blue">
          <div class="ref-feature-copy">
            <span>TECH COLLECTION</span>
            <h3>Upgrade your everyday setup.</h3>
            <p>Explore practical technology and accessories from the NexaMarket catalogue.</p>
            <a href="#catalogue">Shop products</a>
          </div>

          <div class="ref-feature-image">
            <img
              src="/products/bed-2.png"
              alt="Nexa Premium Wireless Stand"
            />
          </div>
        </article>

        <article class="ref-feature-card ref-feature-pink">
          <div class="ref-feature-copy">
            <span>HOME COLLECTION</span>
            <h3>Make your space feel like home.</h3>
            <p>Browse useful home and desk products from marketplace sellers.</p>
            <a href="#catalogue">Explore collection</a>
          </div>

          <div class="ref-feature-image">
            <img
              src="/products/led-tv.png"
              alt="Demo Cotton Throw"
            />
          </div>
        </article>

      </div>
    </section>


    <!-- ==================================================
         WEEKLY PRODUCTS
         ================================================== -->
    <section v-if="weeklyProducts.length" class="ref-section">
      <div class="ref-section-head">
        <div>
          <span class="ref-eyebrow">POPULAR THIS WEEK</span>
          <h2>Popular Right Now</h2>
        </div>

        <a href="#catalogue" class="ref-view-link">View all →</a>
      </div>

      <div class="ref-product-grid">
        <article
          v-for="product in weeklyProducts"
          :key="product.id"
          class="ref-product-card"
        >
          <div
            class="ref-product-image"
            @click="openProduct(product.id)"
          >
            <img
              v-if="product.image_url"
              :src="product.image_url"
              :alt="product.name"
              loading="lazy"
            />

            <button
              class="ref-heart"
              type="button"
              :aria-label="`Save ${product.name} to wishlist`"
              @click.stop="addProductToWishlist(product)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                />
              </svg>
            </button>
          </div>

          <div class="ref-product-title-row">
            <h3 @click="openProduct(product.id)">
              {{ product.name }}
            </h3>

            <strong>{{ productPrice(product) }}</strong>
          </div>

          <p class="ref-product-description">
            {{ product.description || `Available from ${product.seller.store_name}.` }}
          </p>

          <div class="ref-product-meta">
            <span>{{ product.category.name }}</span>
            <span>•</span>
            <span>
              {{ product.available_quantity > 0
                ? `${product.available_quantity} in stock`
                : "Out of stock" }}
            </span>
          </div>

          <button
            class="ref-add-cart"
            type="button"
            :disabled="product.available_quantity <= 0 || busyProduct === product.id"
            @click="addProductToCart(product)"
          >
            {{
              product.available_quantity <= 0
                ? "Out of stock"
                : busyProduct === product.id
                  ? "Adding..."
                  : "Add to Cart"
            }}
          </button>
        </article>
      </div>
    </section>


    <!-- ==================================================
         LARGE PROMO BANNER
         ================================================== -->
    <section class="ref-wide-banner">
      <div>
        <span>NEXAMARKET COLLECTION</span>
        <h2>One marketplace.<br />Many ways to discover.</h2>
        <p>
          Explore products from marketplace sellers with live inventory
          and a complete simulated commerce experience.
        </p>
        <a href="#catalogue">Explore products</a>
      </div>

      <img
        src="/products/air-fryer.png"
        alt="Demo Canvas Tote"
      />
    </section>


    <!-- ==================================================
         MORE PRODUCTS
         ================================================== -->
    <section v-if="moreProducts.length" class="ref-section">
      <div class="ref-section-head">
        <div>
          <span class="ref-eyebrow">MORE TO EXPLORE</span>
          <h2>More From NexaMarket</h2>
        </div>
      </div>

      <div class="ref-product-grid">
        <article
          v-for="product in moreProducts"
          :key="product.id"
          class="ref-product-card"
        >
          <div
            class="ref-product-image"
            @click="openProduct(product.id)"
          >
            <img
              v-if="product.image_url"
              :src="product.image_url"
              :alt="product.name"
              loading="lazy"
            />

            <button
              class="ref-heart"
              type="button"
              :aria-label="`Save ${product.name} to wishlist`"
              @click.stop="addProductToWishlist(product)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                />
              </svg>
            </button>
          </div>

          <div class="ref-product-title-row">
            <h3 @click="openProduct(product.id)">
              {{ product.name }}
            </h3>

            <strong>{{ productPrice(product) }}</strong>
          </div>

          <p class="ref-product-description">
            {{ product.description || `Available from ${product.seller.store_name}.` }}
          </p>

          <div class="ref-product-meta">
            <span>{{ product.category.name }}</span>
            <span>•</span>
            <span>
              {{ product.available_quantity > 0
                ? `${product.available_quantity} in stock`
                : "Out of stock" }}
            </span>
          </div>

          <button
            class="ref-add-cart"
            type="button"
            :disabled="product.available_quantity <= 0 || busyProduct === product.id"
            @click="addProductToCart(product)"
          >
            {{
              product.available_quantity <= 0
                ? "Out of stock"
                : busyProduct === product.id
                  ? "Adding..."
                  : "Add to Cart"
            }}
          </button>
        </article>
      </div>
    </section>


    <!-- ==================================================
         SERVICES
         ================================================== -->
    <section class="ref-section">
      <div class="ref-section-head">
        <div>
          <span class="ref-eyebrow">PLATFORM EXPERIENCE</span>
          <h2>Services to help you shop</h2>
        </div>
      </div>

      <div class="ref-service-grid">

        <article>
          <div>
            <h3>Live Inventory</h3>
            <p>Product availability is backed by NexaMarket inventory data.</p>
          </div>
          <img src="/storefront/live-inventory.png" alt="NexaMarket live inventory management" />
        </article>

        <article>
          <div>
            <h3>Simulated Checkout</h3>
            <p>Experience the complete portfolio commerce checkout flow.</p>
          </div>
          <img src="/storefront/simulated-checkout.png" alt="NexaMarket simulated checkout experience" />
        </article>

        <article>
          <div>
            <h3>Nexa AI Assistant</h3>
            <p>Ask catalogue-grounded questions about available products.</p>
          </div>
          <img src="/storefront/nexa-ai-assistant.png" alt="Nexa AI shopping assistant" />
        </article>

      </div>
    </section>

    <p
      v-if="actionMessage"
      class="ref-action-message"
      role="status"
    >
      {{ actionMessage }}
    </p>

  

    <!-- ==================================================
         CHOOSE BY COLLECTION
         ================================================== -->
    <section class="ref-section ref-brand-section">
      <div class="ref-section-head">
        <div>
          <h2>Explore Our Collections</h2>
        </div>
      </div>

      <div class="ref-brand-grid">
        <article
          v-for="brand in homeBrands"
          :key="brand.name"
          class="ref-brand-card"
        >
          <img :src="brand.image" :alt="brand.name" />

          <div>
            <strong>{{ brand.name }}</strong>
            <span>{{ brand.subtitle }}</span>
          </div>
        </article>
      </div>
    </section>


    <!-- ==================================================
         COLOURFUL COLLECTION OFFERS
         ================================================== -->
    <section class="ref-section">
      <div class="ref-section-head">
        <div>
          <h2>Curated For Your Lifestyle</h2>
        </div>
      </div>

      <div class="ref-offer-grid">
        <article
          v-for="offer in homeOffers"
          :key="offer.title"
          class="ref-offer-card"
          :class="`ref-offer-${offer.tone}`"
        >
          <div class="ref-offer-copy">
            <span>{{ offer.eyebrow }}</span>

            <h3>{{ offer.title }}</h3>

            <p>{{ offer.copy }}</p>

            <a href="#catalogue">Shop now</a>
          </div>

          <img :src="offer.image" :alt="offer.title" />
        </article>
      </div>
    </section>


    <!-- ==================================================
         LARGE LIFESTYLE BANNER
         ================================================== -->
    <section class="ref-lifestyle-banner">
      <img
        src="/storefront/home-living-banner.png"
        alt="Colourful NexaMarket marketplace collection"
      />

      <div class="ref-lifestyle-panel">
        <span>DISCOVER NEXAMARKET</span>

        <h2>Discover Your Next Favourite</h2>

        <p>
          Browse home, workspace, travel and everyday products
          from the NexaMarket catalogue.
        </p>

        <a href="#catalogue">Explore products</a>
      </div>
    </section>


    <!-- ==================================================
         FILTERED DEALS
         ================================================== -->
    <section id="catalogue" class="ref-section ref-filtered-section">
      <div class="ref-section-head">
        <div>
          <h2>Recommended Marketplace Picks</h2>
        </div>
      </div>

      <div class="ref-filter-pills">
        <button type="button">All</button>
        <button type="button">Accessories</button>
        <button type="button">Workspace</button>
        <button type="button">Home</button>
        <button type="button">Outdoor</button>
      </div>

      <div class="ref-product-grid">
        <article
          v-for="product in visibleProducts.slice(0, 8)"
          :key="`filtered-${product.id}`"
          class="ref-product-card"
        >
          <div
            class="ref-product-image"
            @click="$router.push(`/products/${product.id}`)"
          >
            <img
              :src="product.image_url || '/products/earphones.png'"
              :alt="product.name"
            />
          </div>

          <div class="ref-product-title-row">
            <h3 @click="$router.push(`/products/${product.id}`)">
              {{ product.name }}
            </h3>

            <strong>£{{ Number(product.price).toFixed(2) }}</strong>
          </div>

          <p class="ref-product-description">
            {{ product.description || "Available through NexaMarket." }}
          </p>

          <div class="ref-product-meta">
            <span>{{ product.seller.store_name }}</span>
            <span>•</span>
            <span>
              {{
                product.available_quantity > 0
                  ? `${product.available_quantity} available`
                  : "Out of stock"
              }}
            </span>
          </div>

          <button
            type="button"
            class="ref-add-cart"
            :disabled="product.available_quantity < 1"
            @click.stop="openProduct(product.id)"
          >
            {{
              product.available_quantity > 0
                ? "Add to Cart"
                : "Out of Stock"
            }}
          </button>
        </article>
      </div>
    </section>


    <!-- ==================================================
         COLOUR PROMOTIONAL STRIP
         ================================================== -->
    <section class="ref-colour-strip">
      <div>
        <span>NEXAMARKET EXPERIENCE</span>

        <h2>Shop. Discover. Checkout.</h2>

        <p>
          Explore a complete portfolio commerce experience
          with catalogue search, inventory and simulated checkout.
        </p>

        <a href="#catalogue">Explore marketplace</a>
      </div>

      <img
        src="/storefront/tech-collection-banner.png"
        alt="Colourful NexaMarket product collection"
      />
    </section>


    <!-- ==================================================
         MOST SELLING
         ================================================== -->
    <section class="ref-section">
      <div class="ref-section-head">
        <div>
          <h2>Marketplace Favourites</h2>
        </div>

        <a href="#catalogue" class="ref-view-link">
          View all
        </a>
      </div>

      <div class="ref-featured-three-grid">
        <article
          v-for="product in visibleProducts.slice(0, 3)"
          :key="`popular-${product.id}`"
          class="ref-product-card"
        >
          <div
            class="ref-product-image"
            @click="$router.push(`/products/${product.id}`)"
          >
            <img
              :src="product.image_url || '/products/earphones.png'"
              :alt="product.name"
            />
          </div>

          <div class="ref-product-title-row">
            <h3 @click="$router.push(`/products/${product.id}`)">
              {{ product.name }}
            </h3>

            <strong>£{{ Number(product.price).toFixed(2) }}</strong>
          </div>

          <p class="ref-product-description">
            {{ product.description || "Available through NexaMarket." }}
          </p>

          <div class="ref-product-meta">
            <span>{{ product.seller.store_name }}</span>
            <span>•</span>
            <span>{{ product.available_quantity }} available</span>
          </div>

          <button
            type="button"
            class="ref-add-cart"
            :disabled="product.available_quantity < 1"
            @click.stop="openProduct(product.id)"
          >
            Add to Cart
          </button>
        </article>
      </div>
    </section>


    <!-- ==================================================
         TRENDING
         ================================================== -->
    <section class="ref-section">
      <div class="ref-section-head">
        <div>
          <h2>Explore Trending Collections</h2>
        </div>
      </div>

      <div class="ref-trending-grid">
        <article class="ref-trending-card">
          <img
            src="/storefront/travel-banner.png"
            alt="Colourful everyday collection"
          />

          <div>
            <span>EVERYDAY COLLECTION</span>
            <h3>Fresh picks for everyday life</h3>
            <a href="#catalogue">Shop collection</a>
          </div>
        </article>

        <article class="ref-trending-card">
          <img
            src="/storefront/workspace-banner.png"
            alt="Colourful workspace collection"
          />

          <div>
            <span>WORKSPACE COLLECTION</span>
            <h3>Build a better desk setup</h3>
            <a href="#catalogue">Shop collection</a>
          </div>
        </article>
      </div>
    </section>


    <!-- ==================================================
         STORES
         ================================================== -->
    <section class="ref-section">
      <div class="ref-section-head">
        <div>
          <h2>Meet Our Marketplace Sellers</h2>
        </div>
      </div>

      <div class="ref-store-grid">
        <article
          v-for="store in storeCards"
          :key="store.name"
          class="ref-store-card"
        >
          <img :src="store.image" :alt="store.name" />

          <div>
            <strong>{{ store.name }}</strong>
            <span>{{ store.description }}</span>
          </div>
        </article>
      </div>
    </section>





    <!-- ==================================================
         LARGE FOOTER
         ================================================== -->
    <footer class="ref-footer">
      <div class="ref-footer-grid">
        <div class="ref-footer-brand">
          <strong class="ref-footer-logo">
            NexaMarket<span>.</span>
          </strong>

          <p>
            A cloud-native marketplace portfolio experience
            connecting catalogue, commerce, data and AI.
          </p>

          <div class="ref-footer-badges">
            <span>Vue</span>
            <span>Node</span>
            <span>Kafka</span>
            <span>PostgreSQL</span>
          </div>
        </div>

        <div>
          <h4>Marketplace</h4>
          <a href="#catalogue">Products</a>
          <a href="#catalogue">Categories</a>
          <a href="#catalogue">Collections</a>
          <RouterLink to="/nexa-ai">Nexa AI</RouterLink>
        </div>

        <div>
          <h4>Account</h4>
          <RouterLink to="/account">My Account</RouterLink>
          <RouterLink to="/orders">Orders</RouterLink>
          <RouterLink to="/wishlist">Wishlist</RouterLink>
          <RouterLink to="/cart">Cart</RouterLink>
        </div>

        <div>
          <h4>Platform</h4>
          <span>Live catalogue</span>
          <span>Inventory</span>
          <span>Simulated checkout</span>
          <span>Analytics pipeline</span>
        </div>

        <div>
          <h4>Technology</h4>
          <span>Vue + TypeScript</span>
          <span>Node + Express</span>
          <span>PostgreSQL</span>
          <span>Kafka</span>
        </div>
      </div>

      <div class="ref-footer-bottom">
        <span>© 2026 NexaMarket</span>

        <span>
          Portfolio marketplace — simulated checkout, no real payment processed.
        </span>
      </div>
    </footer>

  </main>
</template>
