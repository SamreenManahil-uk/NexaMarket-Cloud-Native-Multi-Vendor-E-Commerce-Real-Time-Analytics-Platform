<script setup lang="ts">

import {
  computed,
  onMounted,
  reactive,
  ref,
} from "vue";
import { RouterLink, useRouter } from "vue-router";
import { sellerApi } from "../services/seller";
import { authStore } from "../stores/auth";
import type {
  Category,
  SellerDashboard,
  SellerOrder,
  SellerProduct,
  SellerProfile,
} from "../types/seller";

const router = useRouter();

function logout(): void {
  authStore.logout();
  void router.push("/auth");
}

type Tab = "overview" | "products" | "orders";

const tab = ref<Tab>("overview");
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const notice = ref("");

const profile = ref<SellerProfile | null>(null);
const stats = ref<SellerDashboard | null>(null);
const products = ref<SellerProduct[]>([]);
const orders = ref<SellerOrder[]>([]);
const categories = ref<Category[]>([]);

const showEditor = ref(false);
const editing = ref<SellerProduct | null>(null);
const inventoryProduct = ref<SellerProduct | null>(null);
const inventoryValue = ref(0);

const form = reactive({
  categoryId: "",
  name: "",
  slug: "",
  description: "",
  price: 0,
  imageUrl: "",
  stock: 0,
  isActive: true,
});

const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const recentOrders = computed(() =>
  orders.value.slice(0, 5),
);

const lowStock = computed(() =>
  products.value
    .filter((product) => product.stock <= 5)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6),
);

function formatMoney(value: string | number): string {
  const amount = Number(value);
  return money.format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: string): string {
  return `status-${status.toLowerCase()}`;
}

function resetMessages(): void {
  error.value = "";
  notice.value = "";
}

function slugify(): void {
  if (editing.value) return;

  form.slug = form.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function newProduct(): void {
  resetMessages();
  editing.value = null;

  Object.assign(form, {
    categoryId: categories.value[0]?.id ?? "",
    name: "",
    slug: "",
    description: "",
    price: 0,
    imageUrl: "",
    stock: 0,
    isActive: true,
  });

  showEditor.value = true;
}

function editProduct(product: SellerProduct): void {
  resetMessages();
  editing.value = product;

  Object.assign(form, {
    categoryId: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: Number(product.price),
    imageUrl: product.imageUrl ?? "",
    stock: product.stock,
    isActive: product.isActive,
  });

  showEditor.value = true;
}

function editInventory(product: SellerProduct): void {
  resetMessages();
  inventoryProduct.value = product;
  inventoryValue.value = product.stock;
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";

  try {
    const [
      profileData,
      dashboardData,
      productData,
      orderData,
      categoryData,
    ] = await Promise.all([
      sellerApi.profile(),
      sellerApi.dashboard(),
      sellerApi.products(),
      sellerApi.orders(),
      sellerApi.categories(),
    ]);

    profile.value = profileData;
    stats.value = dashboardData;
    products.value = productData;
    orders.value = orderData;
    categories.value = categoryData;
  } catch (caught) {
    error.value =
      caught instanceof Error
        ? caught.message
        : "Seller dashboard could not be loaded.";
  } finally {
    loading.value = false;
  }
}

async function saveProduct(): Promise<void> {
  resetMessages();

  if (
    !form.categoryId ||
    !form.name.trim() ||
    !form.slug.trim()
  ) {
    error.value =
      "Category, product name and slug are required.";
    return;
  }

  if (
    !Number.isFinite(Number(form.price)) ||
    Number(form.price) < 0
  ) {
    error.value = "Enter a valid product price.";
    return;
  }

  if (
    !Number.isInteger(Number(form.stock)) ||
    Number(form.stock) < 0
  ) {
    error.value = "Stock must be a whole number.";
    return;
  }

  saving.value = true;

  try {
    if (editing.value) {
      await sellerApi.updateProduct(editing.value, {
        categoryId: form.categoryId,
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        imageUrl: form.imageUrl.trim(),
        isActive: form.isActive,
      });

      if (editing.value.stock !== Number(form.stock)) {
        await sellerApi.updateStock(
          editing.value.id,
          Number(form.stock),
        );
      }

      notice.value = "Product updated successfully.";
    } else {
      await sellerApi.createProduct({
        categoryId: form.categoryId,
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        imageUrl: form.imageUrl.trim(),
        stock: Number(form.stock),
      });

      notice.value = "Product created successfully.";
    }

    showEditor.value = false;
    await load();
    tab.value = "products";
  } catch (caught) {
    error.value =
      caught instanceof Error
        ? caught.message
        : "Product could not be saved.";
  } finally {
    saving.value = false;
  }
}

async function saveInventory(): Promise<void> {
  if (!inventoryProduct.value) return;

  resetMessages();

  if (
    !Number.isInteger(Number(inventoryValue.value)) ||
    Number(inventoryValue.value) < 0
  ) {
    error.value = "Stock must be a non-negative integer.";
    return;
  }

  saving.value = true;

  try {
    await sellerApi.updateStock(
      inventoryProduct.value.id,
      Number(inventoryValue.value),
    );

    inventoryProduct.value = null;
    notice.value = "Inventory updated.";
    await load();
  } catch (caught) {
    error.value =
      caught instanceof Error
        ? caught.message
        : "Inventory could not be updated.";
  } finally {
    saving.value = false;
  }
}

async function deactivate(
  product: SellerProduct,
): Promise<void> {
  if (
    !window.confirm(
      `Deactivate "${product.name}" from the marketplace?`,
    )
  ) {
    return;
  }

  resetMessages();

  try {
    await sellerApi.deactivate(product.id);
    notice.value = "Product deactivated.";
    await load();
  } catch (caught) {
    error.value =
      caught instanceof Error
        ? caught.message
        : "Product could not be deactivated.";
  }
}

async function changeOrderStatus(
  order: SellerOrder,
  event: Event,
): Promise<void> {
  const value = (event.target as HTMLSelectElement).value;

  if (!value || value === order.status) return;

  resetMessages();

  try {
    await sellerApi.updateOrderStatus(order.id, value);
    notice.value = "Order status updated.";
    await load();
  } catch (caught) {
    error.value =
      caught instanceof Error
        ? caught.message
        : "Order status could not be updated.";
  }
}

onMounted(load);
</script>

<template>
  <main class="seller-shell">
    <section class="seller-hero">
      <div>
        <span class="seller-eyebrow">
          SELLER COMMAND CENTRE
        </span>

        <h1>
          {{ profile?.storeName || "Seller Dashboard" }}
        </h1>

        <p>
          {{
            profile?.storeDescription ||
            "Manage your NexaMarket store, products, inventory and orders."
          }}
        </p>
      </div>

      <div class="seller-hero-actions">
        <RouterLink to="/">
          View marketplace
        </RouterLink>

        <RouterLink to="/analytics">
          Analytics
        </RouterLink>

        <button type="button" @click="newProduct">
          + Add product
        </button>

        <button type="button" class="seller-signout" @click="logout">
          Sign out
        </button>
      </div>
    </section>

    <section
      v-if="error || notice"
      class="seller-message-wrap"
    >
      <p v-if="error" class="seller-error">
        {{ error }}
      </p>

      <p v-if="notice" class="seller-success">
        {{ notice }}
      </p>
    </section>

    <section v-if="loading" class="seller-loading">
      <div v-for="n in 4" :key="n"></div>
    </section>

    <template v-else>
      <nav class="seller-tabs" aria-label="Seller dashboard">
        <button
          :class="{ active: tab === 'overview' }"
          @click="tab = 'overview'"
        >
          Overview
        </button>

        <button
          :class="{ active: tab === 'products' }"
          @click="tab = 'products'"
        >
          Products
          <span>{{ products.length }}</span>
        </button>

        <button
          :class="{ active: tab === 'orders' }"
          @click="tab = 'orders'"
        >
          Orders
          <span>{{ orders.length }}</span>
        </button>
      </nav>

      <section
        v-if="tab === 'overview'"
        class="seller-dashboard"
      >
        <div class="seller-metrics">
          <article>
            <span>Sales value</span>
            <strong>
              {{ formatMoney(stats?.salesAmount ?? 0) }}
            </strong>
            <small>
              From seller order items
            </small>
          </article>

          <article>
            <span>Orders</span>
            <strong>{{ stats?.orderCount ?? 0 }}</strong>
            <small>
              Orders containing your products
            </small>
          </article>

          <article>
            <span>Active products</span>
            <strong>
              {{ stats?.activeProductCount ?? 0 }}
            </strong>
            <small>
              of {{ stats?.productCount ?? 0 }} products
            </small>
          </article>

          <article>
            <span>Inventory units</span>
            <strong>
              {{ stats?.inventoryUnits ?? 0 }}
            </strong>
            <small>
              {{ stats?.unitsSold ?? 0 }} units sold
            </small>
          </article>
        </div>

        <div class="seller-grid">
          <article class="seller-panel">
            <div class="seller-panel-head">
              <div>
                <span>RECENT ACTIVITY</span>
                <h2>Latest orders</h2>
              </div>

              <button @click="tab = 'orders'">
                View all
              </button>
            </div>

            <div
              v-if="recentOrders.length"
              class="seller-order-mini-list"
            >
              <div
                v-for="order in recentOrders"
                :key="order.id"
                class="seller-order-mini"
              >
                <div>
                  <strong>
                    #{{ order.id.slice(0, 8).toUpperCase() }}
                  </strong>
                  <span>{{ order.customerEmail }}</span>
                </div>

                <div>
                  <strong>
                    {{ formatMoney(order.totalAmount) }}
                  </strong>
                  <span
                    class="seller-status"
                    :class="statusClass(order.status)"
                  >
                    {{ order.status }}
                  </span>
                </div>
              </div>
            </div>

            <div v-else class="seller-empty">
              No seller orders yet.
            </div>
          </article>

          <article class="seller-panel">
            <div class="seller-panel-head">
              <div>
                <span>INVENTORY</span>
                <h2>Stock attention</h2>
              </div>
            </div>

            <div
              v-if="lowStock.length"
              class="seller-stock-list"
            >
              <button
                v-for="product in lowStock"
                :key="product.id"
                @click="editInventory(product)"
              >
                <div>
                  <strong>{{ product.name }}</strong>
                  <span>
                    {{ product.isActive ? "Active" : "Inactive" }}
                  </span>
                </div>

                <b>{{ product.stock }}</b>
              </button>
            </div>

            <div v-else class="seller-empty">
              No products currently need stock attention.
            </div>
          </article>
        </div>
      </section>

      <section
        v-if="tab === 'products'"
        class="seller-panel seller-products-panel"
      >
        <div class="seller-panel-head">
          <div>
            <span>CATALOGUE MANAGEMENT</span>
            <h2>Your products</h2>
          </div>

          <button class="seller-primary" @click="newProduct">
            + New product
          </button>
        </div>

        <div
          v-if="products.length"
          class="seller-product-list"
        >
          <article
            v-for="product in products"
            :key="product.id"
            class="seller-product-row"
          >
            <div class="seller-product-image">
              <img
                v-if="product.imageUrl"
                :src="product.imageUrl"
                :alt="product.name"
              />
              <span v-else>
                {{ product.name.charAt(0) }}
              </span>
            </div>

            <div class="seller-product-main">
              <span>
                {{ product.isActive ? "ACTIVE" : "INACTIVE" }}
              </span>
              <h3>{{ product.name }}</h3>
              <p>{{ product.slug }}</p>
            </div>

            <div class="seller-product-stat">
              <span>Price</span>
              <strong>{{ formatMoney(product.price) }}</strong>
            </div>

            <div class="seller-product-stat">
              <span>Stock</span>
              <strong>{{ product.stock }}</strong>
            </div>

            <div class="seller-row-actions">
              <button @click="editInventory(product)">
                Stock
              </button>

              <button @click="editProduct(product)">
                Edit
              </button>

              <button
                v-if="product.isActive"
                class="seller-danger-link"
                @click="deactivate(product)"
              >
                Deactivate
              </button>
            </div>
          </article>
        </div>

        <div v-else class="seller-empty seller-large-empty">
          <h3>Your catalogue is empty.</h3>
          <p>
            Create your first product to start building
            your NexaMarket storefront.
          </p>
          <button @click="newProduct">
            Create product
          </button>
        </div>
      </section>

      <section
        v-if="tab === 'orders'"
        class="seller-panel"
      >
        <div class="seller-panel-head">
          <div>
            <span>ORDER MANAGEMENT</span>
            <h2>Seller orders</h2>
          </div>
        </div>

        <div v-if="orders.length" class="seller-orders">
          <article
            v-for="order in orders"
            :key="order.id"
            class="seller-order-card"
          >
            <header>
              <div>
                <span>ORDER</span>
                <h3>
                  #{{ order.id.slice(0, 8).toUpperCase() }}
                </h3>
                <p>
                  {{ formatDate(order.createdAt) }}
                  · {{ order.customerEmail }}
                </p>
              </div>

              <div class="seller-order-total">
                <strong>
                  {{ formatMoney(order.totalAmount) }}
                </strong>

                <select
                  :value="order.status"
                  @change="changeOrderStatus(order, $event)"
                >
                  <option
                    v-if="order.status === 'PENDING'"
                    value="PENDING"
                    disabled
                  >
                    PENDING
                  </option>
                  <option value="PROCESSING">
                    PROCESSING
                  </option>
                  <option value="SHIPPED">
                    SHIPPED
                  </option>
                  <option value="DELIVERED">
                    DELIVERED
                  </option>
                  <option value="CANCELLED">
                    CANCELLED
                  </option>
                </select>
              </div>
            </header>

            <div class="seller-order-items">
              <div
                v-for="item in order.items"
                :key="item.id"
              >
                <div>
                  <strong>{{ item.productName }}</strong>
                  <span>
                    {{ item.quantity }} ×
                    {{ formatMoney(item.unitPrice) }}
                  </span>
                </div>

                <b>{{ formatMoney(item.lineTotal) }}</b>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="seller-empty seller-large-empty">
          No orders containing your products yet.
        </div>
      </section>
    </template>

    <div
      v-if="showEditor"
      class="seller-modal-backdrop"
      @click.self="showEditor = false"
    >
      <section class="seller-modal">
        <header>
          <div>
            <span>
              {{ editing ? "EDIT PRODUCT" : "NEW PRODUCT" }}
            </span>
            <h2>
              {{ editing ? "Update product" : "Add to catalogue" }}
            </h2>
          </div>

          <button @click="showEditor = false">×</button>
        </header>

        <form @submit.prevent="saveProduct">
          <label>
            Product name
            <input
              v-model="form.name"
              maxlength="200"
              required
              @input="slugify"
            />
          </label>

          <label>
            Slug
            <input
              v-model="form.slug"
              maxlength="180"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
            />
          </label>

          <label>
            Category
            <select v-model="form.categoryId" required>
              <option value="" disabled>
                Select category
              </option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </label>

          <div class="seller-form-pair">
            <label>
              Price (£)
              <input
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </label>

            <label>
              Stock
              <input
                v-model.number="form.stock"
                type="number"
                min="0"
                step="1"
                required
              />
            </label>
          </div>

          <label>
            Image URL
            <input
              v-model="form.imageUrl"
              maxlength="2000"
              placeholder="/products/example.png"
            />
          </label>

          <label>
            Description
            <textarea
              v-model="form.description"
              maxlength="4000"
              rows="5"
            ></textarea>
          </label>

          <label
            v-if="editing"
            class="seller-checkbox"
          >
            <input
              v-model="form.isActive"
              type="checkbox"
            />
            Product active on marketplace
          </label>

          <footer>
            <button
              type="button"
              @click="showEditor = false"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="seller-primary"
              :disabled="saving"
            >
              {{
                saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Create product"
              }}
            </button>
          </footer>
        </form>
      </section>
    </div>

    <div
      v-if="inventoryProduct"
      class="seller-modal-backdrop"
      @click.self="inventoryProduct = null"
    >
      <section class="seller-modal seller-stock-modal">
        <header>
          <div>
            <span>INVENTORY</span>
            <h2>{{ inventoryProduct.name }}</h2>
          </div>

          <button @click="inventoryProduct = null">×</button>
        </header>

        <form @submit.prevent="saveInventory">
          <label>
            Available units
            <input
              v-model.number="inventoryValue"
              type="number"
              min="0"
              step="1"
              required
              autofocus
            />
          </label>

          <footer>
            <button
              type="button"
              @click="inventoryProduct = null"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="seller-primary"
              :disabled="saving"
            >
              {{ saving ? "Saving..." : "Update stock" }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.seller-shell{max-width:1440px;margin:0 auto;padding:46px 32px 90px;color:#173f32}
.seller-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;padding:45px;border-radius:30px;background:#edf4ee}
.seller-eyebrow,.seller-panel-head span,.seller-modal header span{font-size:10px;font-weight:900;letter-spacing:.15em;color:#5f776c}
.seller-hero h1{font-size:clamp(36px,5vw,68px);line-height:.98;margin:12px 0 14px;letter-spacing:-.05em}
.seller-hero p{max-width:620px;margin:0;color:#66756d;line-height:1.7}
.seller-hero-actions{display:flex;gap:10px;flex-wrap:wrap}
.seller-hero-actions a,.seller-hero-actions button,.seller-primary{border:0;border-radius:999px;padding:14px 21px;font:inherit;font-weight:800;text-decoration:none;cursor:pointer}
.seller-hero-actions a{background:#fff;color:#173f32}
.seller-hero-actions button,.seller-primary{background:#173f32!important;color:#fff!important}
.seller-message-wrap{margin-top:20px}.seller-error,.seller-success{padding:14px 18px;border-radius:14px;font-weight:700}.seller-error{background:#fff0ee;color:#a53e34}.seller-success{background:#edf8ef;color:#27653f}
.seller-tabs{display:flex;gap:8px;margin:28px 0 20px;padding:6px;width:max-content;max-width:100%;overflow:auto;border:1px solid #e1e6e2;border-radius:999px;background:#fff}
.seller-tabs button{display:flex;align-items:center;gap:8px;padding:11px 18px;border:0;border-radius:999px;background:transparent;color:#68746e;font:inherit;font-weight:800;cursor:pointer}.seller-tabs button.active{background:#173f32;color:#fff}.seller-tabs span{display:grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:rgba(255,255,255,.16);font-size:11px}
.seller-loading,.seller-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.seller-loading div{height:150px;border-radius:22px;background:#edf1ed;animation:pulse 1.3s infinite alternate}@keyframes pulse{to{opacity:.45}}
.seller-metrics article,.seller-panel{border:1px solid #e2e7e3;border-radius:24px;background:#fff}.seller-metrics article{padding:25px}.seller-metrics span,.seller-product-stat span{display:block;color:#7b8781;font-size:12px;font-weight:750}.seller-metrics strong{display:block;margin:9px 0 5px;font-size:30px;letter-spacing:-.04em}.seller-metrics small{color:#8b9690}
.seller-grid{display:grid;grid-template-columns:1.3fr .7fr;gap:18px;margin-top:18px}.seller-panel{padding:27px}.seller-panel-head{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:23px}.seller-panel-head h2{margin:5px 0 0;font-size:24px}.seller-panel-head button{border:0;background:transparent;color:#27634d;font-weight:800;cursor:pointer}
.seller-order-mini,.seller-stock-list button{display:flex;justify-content:space-between;align-items:center;gap:18px;width:100%;padding:16px 0;border:0;border-bottom:1px solid #edf0ed;background:none;text-align:left}.seller-order-mini>div,.seller-stock-list button>div{display:flex;flex-direction:column;gap:5px}.seller-order-mini span,.seller-stock-list span{color:#89928e;font-size:12px}.seller-order-mini>div:last-child{align-items:flex-end}.seller-stock-list button{cursor:pointer}.seller-stock-list b{display:grid;place-items:center;min-width:40px;height:40px;border-radius:12px;background:#fff1e6;color:#a65d25}
.seller-status{padding:5px 9px;border-radius:999px;font-size:10px!important;font-weight:900}.status-pending{background:#fff5d9;color:#8c6b10}.status-processing{background:#e8f1ff;color:#355f99}.status-shipped{background:#eeeaff;color:#64539c}.status-delivered{background:#e6f6eb;color:#2e7448}.status-cancelled{background:#ffebe8;color:#9e4339}
.seller-products-panel{margin-top:0}.seller-product-list{display:flex;flex-direction:column}.seller-product-row{display:grid;grid-template-columns:72px minmax(220px,1fr) 120px 90px auto;align-items:center;gap:20px;padding:18px 0;border-bottom:1px solid #edf0ed}.seller-product-image{display:grid;place-items:center;width:68px;height:68px;border-radius:15px;background:#f2f4f1;overflow:hidden;font-size:22px;font-weight:900}.seller-product-image img{width:100%;height:100%;object-fit:contain}.seller-product-main>span{font-size:9px;font-weight:900;letter-spacing:.12em;color:#648071}.seller-product-main h3{margin:5px 0 3px;font-size:16px}.seller-product-main p{margin:0;color:#909995;font-size:12px}.seller-product-stat strong{display:block;margin-top:4px}.seller-row-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.seller-row-actions button{padding:8px 11px;border:1px solid #dfe5e0;border-radius:10px;background:#fff;font-weight:750;cursor:pointer}.seller-danger-link{color:#a33f35!important}
.seller-orders{display:flex;flex-direction:column;gap:14px}.seller-order-card{border:1px solid #e4e8e4;border-radius:20px;overflow:hidden}.seller-order-card header{display:flex;justify-content:space-between;gap:20px;padding:20px;background:#f7f9f7}.seller-order-card header span{font-size:9px;font-weight:900;letter-spacing:.12em;color:#7d8b84}.seller-order-card h3{margin:5px 0;font-size:17px}.seller-order-card p{margin:0;color:#8a9490;font-size:12px}.seller-order-total{display:flex;align-items:center;gap:15px}.seller-order-total select{padding:9px;border:1px solid #dbe2dc;border-radius:10px;background:#fff;font-weight:750}.seller-order-items{padding:7px 20px}.seller-order-items>div{display:flex;justify-content:space-between;gap:20px;padding:13px 0;border-bottom:1px solid #eef1ee}.seller-order-items>div:last-child{border-bottom:0}.seller-order-items div div{display:flex;flex-direction:column;gap:3px}.seller-order-items span{color:#8b9590;font-size:12px}
.seller-empty{padding:35px 5px;color:#89938e;text-align:center}.seller-large-empty{padding:70px 20px}.seller-large-empty h3{margin:0 0 8px;color:#173f32}.seller-large-empty p{margin:0 auto 20px;max-width:460px}.seller-large-empty button{border:0;border-radius:999px;padding:12px 18px;background:#173f32;color:#fff;font-weight:800;cursor:pointer}
.seller-modal-backdrop{position:fixed;z-index:1000;inset:0;display:grid;place-items:center;padding:20px;background:rgba(13,35,28,.56);backdrop-filter:blur(5px)}.seller-modal{width:min(680px,100%);max-height:90vh;overflow:auto;padding:28px;border-radius:25px;background:#fff;box-shadow:0 30px 90px rgba(0,0,0,.18)}.seller-stock-modal{width:min(480px,100%)}.seller-modal header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.seller-modal h2{margin:6px 0 0;font-size:27px}.seller-modal header>button{border:0;background:none;font-size:28px;cursor:pointer}.seller-modal form{display:flex;flex-direction:column;gap:16px}.seller-modal label{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:800}.seller-modal input,.seller-modal select,.seller-modal textarea{width:100%;box-sizing:border-box;padding:13px 14px;border:1px solid #dce2dd;border-radius:12px;background:#fff;font:inherit;color:#173f32;outline:none}.seller-modal textarea{resize:vertical}.seller-modal input:focus,.seller-modal select:focus,.seller-modal textarea:focus{border-color:#7ca28f}.seller-form-pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}.seller-checkbox{flex-direction:row!important;align-items:center}.seller-checkbox input{width:auto}.seller-modal footer{display:flex;justify-content:flex-end;gap:9px;margin-top:8px}.seller-modal footer button{padding:12px 18px;border:1px solid #dce2dd;border-radius:999px;background:#fff;font:inherit;font-weight:800;cursor:pointer}
@media(max-width:950px){.seller-metrics{grid-template-columns:repeat(2,1fr)}.seller-grid{grid-template-columns:1fr}.seller-product-row{grid-template-columns:68px 1fr 90px}.seller-product-stat:first-of-type{display:none}.seller-row-actions{grid-column:2/-1;justify-content:flex-start}}
@media(max-width:650px){.seller-shell{padding:25px 16px 70px}.seller-hero{align-items:flex-start;flex-direction:column;padding:28px 22px}.seller-hero-actions{width:100%}.seller-hero-actions>*{flex:1;text-align:center}.seller-metrics{grid-template-columns:1fr 1fr;gap:9px}.seller-metrics article{padding:18px}.seller-metrics strong{font-size:23px}.seller-panel{padding:19px}.seller-product-row{grid-template-columns:58px 1fr}.seller-product-image{width:56px;height:56px}.seller-product-stat{display:none}.seller-row-actions{grid-column:1/-1}.seller-order-card header{flex-direction:column}.seller-order-total{justify-content:space-between}.seller-form-pair{grid-template-columns:1fr}}
</style>


<style scoped>
.seller-signout {
  cursor: pointer;
  border: 1px solid #d9d9d9;
  background: white;
  color: #222;
  padding: 10px 16px;
  border-radius: 10px;
  font: inherit;
}

.seller-signout:hover {
  background: #f4f4f4;
}
</style>
