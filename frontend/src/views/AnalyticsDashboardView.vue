<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Bar, Doughnut, Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { getAnalyticsDashboard } from "../services/analytics";
import type { AnalyticsDashboard, AdminAnalyticsSummary, SellerAnalyticsSummary } from "../types/analytics";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
);

const data = ref<AnalyticsDashboard | null>(null);
const loading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    data.value = await getAnalyticsDashboard();
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "Analytics unavailable.";
  } finally {
    loading.value = false;
  }
});

const money = (v: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(v);

const isSeller = computed(() =>
  Boolean(data.value && "seller" in data.value.summary),
);

const adminSummary = computed<AdminAnalyticsSummary | null>(() =>
  data.value && !("seller" in data.value.summary)
    ? data.value.summary as AdminAnalyticsSummary
    : null,
);

const sellerSummary = computed<SellerAnalyticsSummary | null>(() =>
  data.value && "seller" in data.value.summary
    ? data.value.summary as SellerAnalyticsSummary
    : null,
);

const segments = computed<Record<string, number>>(
  () => adminSummary.value?.business_insights.customers.segments ?? {},
);

const orderValue = computed(() =>
  sellerSummary.value
    ? sellerSummary.value.business_insights.orders.sales_value
    : adminSummary.value?.business_insights.orders.order_value ?? 0,
);

const orderCount = computed(() =>
  sellerSummary.value
    ? sellerSummary.value.business_insights.orders.orders
    : adminSummary.value?.business_insights.orders.qualifying_orders ?? 0,
);

const unitsSold = computed(() =>
  sellerSummary.value
    ? sellerSummary.value.business_insights.orders.units_sold
    : adminSummary.value?.business_insights.orders.units_sold ?? 0,
);

const averageValue = computed(() =>
  sellerSummary.value
    ? sellerSummary.value.business_insights.orders.average_item_value
    : adminSummary.value?.business_insights.orders.average_order_value ?? 0,
);

const segmentChart = computed(() => ({
  labels: Object.keys(segments.value),
  datasets: [
    {
      data: Object.values(segments.value),
      backgroundColor: [
        "#7c3aed",
        "#06b6d4",
        "#10b981",
        "#f59e0b",
      ],
      borderWidth: 0,
      hoverOffset: 8,
    },
  ],
}));

const productChart = computed(() => ({
  labels:
    data.value?.summary.business_insights.top_products.map(
      (p) => p.product_name,
    ) ?? [],
  datasets: [
    {
      label: "Sales value (£)",
      data:
        data.value?.summary.business_insights.top_products.map(
          (p) => p.sales_value,
        ) ?? [],
      backgroundColor: [
        "#7c3aed",
        "#06b6d4",
        "#10b981",
        "#f59e0b",
        "#f43f5e",
      ],
      borderRadius: 8,
      borderSkipped: false,
    },
  ],
}));

const forecastChart = computed(() => {
  const history = data.value?.demandHistory ?? [];
  const forecast = data.value?.forecast ?? [];

  return {
    labels: [
      ...history.map((x) => x.date ?? x.order_date ?? ""),
      ...forecast.map((x) => x.date ?? x.forecast_date ?? ""),
    ],
    datasets: [
      {
        label: "Historical demand",
        data: [
          ...history.map((x) =>
            Number(x.units_sold ?? x.demand ?? x.quantity ?? 0),
          ),
          ...forecast.map(() => null),
        ],
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6,182,212,0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
      {
        label: "Forecast",
        data: [
          ...history.map(() => null),
          ...forecast.map((x) =>
            Number(x.predicted_demand ?? x.forecast ?? x.units ?? 0),
          ),
        ],
        borderColor: "#7c3aed",
        backgroundColor: "rgba(124,58,237,0.08)",
        fill: true,
        borderDash: [7, 5],
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "#111827",
      padding: 12,
      cornerRadius: 10,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: "#64748b",
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(148,163,184,0.16)",
      },
      ticks: {
        color: "#64748b",
      },
    },
  },
};

const forecastOptions = {
  ...chartOptions,
  plugins: {
    ...chartOptions.plugins,
    legend: {
      display: true,
      position: "bottom" as const,
      labels: {
        usePointStyle: true,
        padding: 18,
      },
    },
  },
};
</script>

<template>
  <main class="analytics-page">
    <!-- HERO -->
    <section class="hero">
      <div class="hero-content">
        <div class="eyebrow">NEXAMARKET INTELLIGENCE</div>
        <h1>Analytics &amp; Data Science</h1>
        <p>
          <template v-if="isSeller">
            Store performance, product sales and inventory intelligence
            powered by your own PostgreSQL transactional data.
          </template>
          <template v-else>
            Real-time marketplace intelligence powered by PostgreSQL,
            Python, RFM analysis, K-Means segmentation and demand
            forecasting.
          </template>
        </p>

        <div class="hero-tags">
          <span>PostgreSQL</span>
          <template v-if="isSeller">
            <span>Seller Analytics</span>
            <span>Sales</span>
            <span>Inventory</span>
          </template>
          <template v-else>
            <span>Python</span>
            <span>Scikit-learn</span>
            <span>RFM</span>
            <span>K-Means</span>
          </template>
        </div>
      </div>

      <div class="hero-status">
        <span class="status-dot"></span>
        <div>
          <strong>Analytics live</strong>
          <small>PostgreSQL data pipeline</small>
        </div>
      </div>
    <a class="powerbi-report-button" href="https://app.powerbi.com/groups/5fd4a8d1-ad7c-4293-a57d-ba84c57b97a4/reports/ccb57d85-b588-4852-9cfa-ec6ef99d1a61/af22e5b08009c1697524?experience=power-bi" target="_blank" rel="noopener noreferrer">Power BI Dashboard ↗</a>
</section>

    <div v-if="loading" class="state">
      <div class="loader"></div>
      <strong>Loading marketplace intelligence…</strong>
    </div>

    <div v-else-if="error" class="state error">
      {{ error }}
    </div>

    <template v-else-if="data">
      <!-- KPI ROW -->
      <section class="kpis">
        <article class="kpi purple">
          <div class="kpi-icon">£</div>
          <div>
            <span>Order value</span>
            <strong>
              {{
                money(
                  orderValue,
                )
              }}
            </strong>
            <small>Simulated checkout value</small>
          </div>
        </article>

        <article class="kpi cyan">
          <div class="kpi-icon">↗</div>
          <div>
            <span>Orders</span>
            <strong>
              {{
                orderCount
              }}
            </strong>
            <small>{{ isSeller ? "Your store orders" : "Qualifying marketplace orders" }}</small>
          </div>
        </article>

        <article class="kpi green">
          <div class="kpi-icon">◈</div>
          <div>
            <span>Units sold</span>
            <strong>
              {{ unitsSold }}
            </strong>
            <small>{{ isSeller ? "Units sold by your store" : "Across qualifying orders" }}</small>
          </div>
        </article>

        <article class="kpi orange">
          <div class="kpi-icon">AOV</div>
          <div>
            <span>{{ isSeller ? "Average item value" : "Average order value" }}</span>
            <strong>
              {{
                money(
                  averageValue,
                )
              }}
            </strong>
            <small>{{ isSeller ? "Average seller line value" : "Average marketplace order" }}</small>
          </div>
        </article>
      </section>

      <section v-if="isSeller && sellerSummary" class="seller-overview">
        <article class="panel seller-store-card">
          <span class="eyebrow purple-text">SELLER INTELLIGENCE</span>
          <h2>{{ sellerSummary.seller.store_name }}</h2>
          <p>{{ sellerSummary.seller.store_description }}</p>
          <div class="seller-mini-stats">
            <div>
              <strong>{{ sellerSummary.business_insights.products.active }}</strong>
              <span>Active products</span>
            </div>
            <div>
              <strong>{{ sellerSummary.business_insights.products.total }}</strong>
              <span>Total products</span>
            </div>
            <div>
              <strong>{{ data.sellerProducts?.reduce((sum, p) => sum + p.stock, 0) ?? 0 }}</strong>
              <span>Inventory units</span>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div>
              <span class="eyebrow cyan-text">PRODUCT PERFORMANCE</span>
              <h2>Top Products</h2>
              <p>Sales value from your own store only</p>
            </div>
          </div>
          <div class="chart product-chart">
            <Bar
              :data="productChart"
              :options="{ ...chartOptions, indexAxis: 'y' }"
            />
          </div>
        </article>
      </section>

      <section v-if="isSeller && sellerSummary" class="dashboard-grid">
        <article class="panel">
          <div class="panel-head">
            <div>
              <span class="eyebrow cyan-text">INVENTORY</span>
              <h2>Your Products</h2>
              <p>Current catalogue and stock position</p>
            </div>
          </div>
          <div class="table-wrap seller-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="product in data.sellerProducts ?? []" :key="product.id">
                  <td><strong>{{ product.name }}</strong></td>
                  <td>{{ money(Number(product.price)) }}</td>
                  <td>{{ product.stock }}</td>
                  <td>
                    <span class="segment-pill">
                      {{ product.is_active ? "Active" : "Inactive" }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div>
              <span class="eyebrow orange-text">ORDER ACTIVITY</span>
              <h2>Recent Orders</h2>
              <p>Latest orders containing your products</p>
            </div>
          </div>
          <div class="table-wrap seller-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Qty</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in data.recentOrders ?? []" :key="order.order_id">
                  <td><strong>{{ order.product_name }}</strong></td>
                  <td><span class="cluster-pill">{{ order.status }}</span></td>
                  <td>{{ order.quantity }}</td>
                  <td>{{ money(order.line_total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section v-if="isSeller && sellerSummary" class="panel seller-health">
        <div>
          <span class="eyebrow orange-text">STOCK MONITORING</span>
          <h2>Inventory Health</h2>
          <p v-if="sellerSummary.business_insights.low_stock_products.length === 0">
            ✓ Your inventory is currently healthy. No products are at or below the low-stock threshold.
          </p>
          <div v-else>
            <div
              v-for="product in sellerSummary.business_insights.low_stock_products"
              :key="product.product_id"
              class="stock-row"
            >
              <div class="stock-icon">!</div>
              <div class="stock-info"><strong>{{ product.name }}</strong></div>
              <b>{{ product.stock }} in stock</b>
            </div>
          </div>
        </div>
      </section>

      <!-- TOP ROW -->
      <section v-if="!isSeller && adminSummary" class="dashboard-grid">
        <article class="panel segment-panel">
          <div class="panel-head">
            <div>
              <span class="eyebrow purple-text">MACHINE LEARNING</span>
              <h2>Customer Segmentation</h2>
              <p>RFM behavioural clustering</p>
            </div>
            <span class="badge purple-badge">K-Means</span>
          </div>

          <div class="segment-layout">
            <div class="donut">
              <Doughnut
                :data="segmentChart"
                :options="{
                  ...chartOptions,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  cutout: '68%',
                }"
              />
            </div>

            <div class="segment-list">
              <div
                v-for="(count, name, index) in segments"
                :key="name"
                class="segment-item"
              >
                <span
                  class="segment-dot"
                  :class="`dot-${index}`"
                ></span>
                <span>{{ name }}</span>
                <strong>{{ count }}</strong>
              </div>
            </div>
          </div>

          <div class="model-stats">
            <div>
              <strong>{{ adminSummary.clustering.clusters }}</strong>
              <span>Clusters</span>
            </div>
            <div>
              <strong>
                {{ adminSummary.clustering.silhouette_score }}
              </strong>
              <span>Silhouette</span>
            </div>
            <div>
              <strong>
                {{
                  adminSummary.business_insights.customers
                    .analysed_customers
                }}
              </strong>
              <span>Customers</span>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div>
              <span class="eyebrow cyan-text">PRODUCT INTELLIGENCE</span>
              <h2>Top Products</h2>
              <p>Highest sales value from analysed orders</p>
            </div>
            <span class="badge cyan-badge">Top 5</span>
          </div>

          <div class="chart product-chart">
            <Bar
              :data="productChart"
              :options="{
                ...chartOptions,
                indexAxis: 'y',
              }"
            />
          </div>
        </article>
      </section>

      <!-- FORECAST -->
      <section v-if="!isSeller && adminSummary" class="panel forecast-panel">
        <div class="panel-head">
          <div>
            <span class="eyebrow cyan-text">DEMAND INTELLIGENCE</span>
            <h2>Demand &amp; Forecast</h2>
            <p>
              Historical demand compared with the next
              {{ adminSummary.forecasting.forecast_days }} days.
            </p>
          </div>

          <div class="forecast-meta">
            <span class="badge cyan-badge">
              {{ adminSummary.forecasting.method.replace("_", " ") }}
            </span>
            <span class="history-badge">
              {{ adminSummary.forecasting.history_days }} days history
            </span>
          </div>
        </div>

        <div class="forecast-chart">
          <Line
            :data="forecastChart"
            :options="forecastOptions"
          />
        </div>

        <div class="forecast-note">
          <strong>Forecast methodology</strong>
          <span>{{ adminSummary.forecasting.reason }}</span>
        </div>
      </section>

      <!-- BOTTOM -->
      <section v-if="!isSeller && adminSummary" class="dashboard-grid bottom-grid">
        <article class="panel">
          <div class="panel-head">
            <div>
              <span class="eyebrow purple-text">RFM ANALYSIS</span>
              <h2>Customer Intelligence</h2>
              <p>Recency, frequency and monetary behaviour</p>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Recency</th>
                  <th>Frequency</th>
                  <th>Monetary</th>
                  <th>Cluster</th>
                  <th>Segment</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="c in data.customerSegments"
                  :key="c.customer_id"
                >
                  <td>
                    <strong>
                      {{ c.first_name }} {{ c.last_name }}
                    </strong>
                    <small>{{ c.email }}</small>
                  </td>
                  <td>{{ c.recency_days }}</td>
                  <td>{{ c.frequency }}</td>
                  <td>£{{ Number(c.monetary).toFixed(2) }}</td>
                  <td>
                    <span class="cluster-pill">
                      {{ c.cluster }}
                    </span>
                  </td>
                  <td>
                    <span class="segment-pill">
                      {{ c.segment }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel inventory-panel">
          <div class="panel-head">
            <div>
              <span class="eyebrow orange-text">
                INVENTORY INTELLIGENCE
              </span>
              <h2>Stock Attention</h2>
              <p>Products requiring inventory attention</p>
            </div>
            <span class="badge orange-badge">
              {{
                adminSummary.business_insights.low_stock_products
                  .length
              }}
              alerts
            </span>
          </div>

          <div
            v-if="
              adminSummary.business_insights.low_stock_products
                .length
            "
          >
            <div
              v-for="p in data.summary.business_insights
                .low_stock_products"
              :key="p.product_id"
              class="stock-row"
            >
              <div class="stock-icon">!</div>
              <div class="stock-info">
                <strong>{{ p.name }}</strong>
                <span>{{ "category" in p ? p.category : "" }}{{ "seller" in p ? " · " + p.seller : "" }}</span>
              </div>
              <b>{{ p.stock }} in stock</b>
            </div>
          </div>

          <div v-else class="no-alerts">
            ✓ Inventory is currently healthy
          </div>

          <div class="model-card">
            <div class="model-card-title">
              <span>MODEL STATUS</span>
              <span class="live-chip">LIVE</span>
            </div>

            <strong>
              {{
                adminSummary.clustering.model_trained
                  ? "K-Means model trained"
                  : "Model fallback"
              }}
            </strong>

            <p>
              Segmentation uses RFM-derived customer behaviour.
              Forecasting uses a transparent baseline because only
              {{ adminSummary.forecasting.history_days }} days of
              demand history are currently available.
            </p>
          </div>
        </article>
      </section>

      <!-- LIMITATIONS -->
      <section class="limitations">
        <div>
          <span class="eyebrow">DATA QUALITY &amp; NOTES</span>
          <h3>Analytics context</h3>
        </div>

        <div class="notes">
          <p
            v-for="note in data.summary.limitations"
            :key="note"
          >
            {{ note }}
          </p>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.analytics-page {
  max-width: 1440px;
  margin: auto;
  padding: 36px 28px 90px;
  color: #111827;
  background: #f7f8fc;
}

/* HERO */
.hero {
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
  padding: 48px;
  margin-bottom: 22px;
  border-radius: 30px;
  color: white;
  background:
    radial-gradient(circle at 85% 15%, rgba(6, 182, 212, .35), transparent 28%),
    radial-gradient(circle at 55% 100%, rgba(124, 58, 237, .45), transparent 38%),
    linear-gradient(135deg, #111827 0%, #1e1b4b 52%, #312e81 100%);
  box-shadow: 0 24px 70px rgba(49, 46, 129, .22);
}

.hero::after {
  content: "";
  position: absolute;
  width: 280px;
  height: 280px;
  right: -90px;
  top: -120px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,.18);
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero h1 {
  max-width: 850px;
  margin: 10px 0 16px;
  font-size: clamp(2.5rem, 5vw, 4.7rem);
  line-height: .98;
  letter-spacing: -.045em;
}

.hero p {
  max-width: 760px;
  margin: 0;
  color: #dbeafe;
  line-height: 1.7;
}

.eyebrow {
  font-size: .68rem;
  font-weight: 800;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}

.hero-tags span {
  padding: 7px 11px;
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  color: #e0e7ff;
  font-size: .76rem;
}

.hero-status {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 210px;
  padding: 16px 18px;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 18px;
  background: rgba(255,255,255,.08);
  backdrop-filter: blur(12px);
}

.hero-status strong,
.hero-status small {
  display: block;
}

.hero-status small {
  margin-top: 3px;
  color: #bfdbfe;
  font-size: .76rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 0 6px rgba(52,211,153,.12);
}

/* KPI */
.kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.kpi {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 22px;
  border-radius: 22px;
  background: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 28px rgba(15,23,42,.05);
}

.kpi::after {
  content: "";
  position: absolute;
  right: -25px;
  bottom: -35px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  opacity: .1;
}

.kpi-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border-radius: 15px;
  color: white;
  font-size: .78rem;
  font-weight: 800;
}

.kpi span,
.kpi small {
  display: block;
}

.kpi span {
  color: #64748b;
  font-size: .78rem;
}

.kpi strong {
  display: block;
  margin: 4px 0;
  font-size: 1.75rem;
  letter-spacing: -.03em;
}

.kpi small {
  color: #94a3b8;
  font-size: .7rem;
}

.kpi.purple .kpi-icon { background: #7c3aed; }
.kpi.cyan .kpi-icon { background: #0891b2; }
.kpi.green .kpi-icon { background: #059669; }
.kpi.orange .kpi-icon { background: #ea580c; }

.seller-overview {
  display: grid;
  grid-template-columns: .8fr 1.2fr;
  gap: 16px;
  margin-bottom: 16px;
}

.seller-store-card {
  background:
    radial-gradient(circle at 100% 0%, rgba(124,58,237,.13), transparent 36%),
    white;
}

.seller-store-card > p,
.seller-health p {
  color: #64748b;
  line-height: 1.65;
}

.seller-mini-stats {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 10px;
  margin-top: 26px;
}

.seller-mini-stats div {
  padding: 18px 14px;
  border-radius: 17px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
}

.seller-mini-stats strong,
.seller-mini-stats span {
  display: block;
}

.seller-mini-stats strong {
  font-size: 1.6rem;
}

.seller-mini-stats span {
  margin-top: 5px;
  color: #94a3b8;
  font-size: .72rem;
}

.seller-table {
  margin-top: 20px;
}

.seller-health {
  margin-bottom: 16px;
  background:
    radial-gradient(circle at 95% 20%, rgba(16,185,129,.10), transparent 30%),
    white;
}

@media (max-width: 900px) {
  .seller-overview {
    grid-template-columns: 1fr;
  }

  .seller-mini-stats {
    grid-template-columns: 1fr;
  }
}

/* PANELS */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.panel {
  min-width: 0;
  padding: 26px;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  background: white;
  box-shadow: 0 10px 30px rgba(15,23,42,.045);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
}

.panel h2 {
  margin: 6px 0 5px;
  font-size: 1.45rem;
  letter-spacing: -.025em;
}

.panel-head p {
  margin: 0;
  color: #94a3b8;
  font-size: .82rem;
}

.purple-text { color: #7c3aed; }
.cyan-text { color: #0891b2; }
.orange-text { color: #ea580c; }

.badge {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: .72rem;
  font-weight: 800;
  white-space: nowrap;
}

.purple-badge {
  color: #6d28d9;
  background: #ede9fe;
}

.cyan-badge {
  color: #0e7490;
  background: #cffafe;
}

.orange-badge {
  color: #c2410c;
  background: #ffedd5;
}

/* SEGMENTS */
.segment-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.donut {
  height: 230px;
}

.segment-list {
  display: grid;
  gap: 12px;
}

.segment-item {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 9px;
  font-size: .84rem;
}

.segment-item strong {
  font-size: .95rem;
}

.segment-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.dot-0 { background: #7c3aed; }
.dot-1 { background: #06b6d4; }
.dot-2 { background: #10b981; }
.dot-3 { background: #f59e0b; }

.model-stats {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 10px;
  margin-top: 18px;
}

.model-stats div {
  padding: 15px;
  border-radius: 15px;
  background: #f8fafc;
}

.model-stats strong,
.model-stats span {
  display: block;
}

.model-stats strong {
  font-size: 1.2rem;
}

.model-stats span {
  margin-top: 4px;
  color: #94a3b8;
  font-size: .7rem;
}

/* CHARTS */
.chart {
  height: 315px;
  margin-top: 20px;
}

.product-chart {
  height: 330px;
}

.forecast-panel {
  margin-bottom: 16px;
}

.forecast-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-badge {
  padding: 8px 12px;
  border-radius: 999px;
  color: #475569;
  background: #f1f5f9;
  font-size: .72rem;
  font-weight: 700;
}

.forecast-chart {
  height: 340px;
  margin-top: 22px;
}

.forecast-note {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fafc;
  color: #64748b;
  font-size: .78rem;
}

.forecast-note strong {
  color: #334155;
  text-transform: capitalize;
  white-space: nowrap;
}

/* TABLE */
.table-wrap {
  overflow-x: auto;
  margin-top: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: .78rem;
}

th {
  padding: 12px 10px;
  color: #94a3b8;
  font-size: .68rem;
  font-weight: 800;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: .05em;
  border-bottom: 1px solid #e5e7eb;
}

td {
  padding: 14px 10px;
  white-space: nowrap;
  border-bottom: 1px solid #f1f5f9;
}

td small {
  display: block;
  margin-top: 4px;
  color: #94a3b8;
  font-size: .67rem;
}

.segment-pill,
.cluster-pill {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: .68rem;
  font-weight: 700;
}

.segment-pill {
  color: #6d28d9;
  background: #ede9fe;
}

.cluster-pill {
  color: #0e7490;
  background: #cffafe;
}

/* INVENTORY */
.stock-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 17px 0;
  border-bottom: 1px solid #f1f5f9;
}

.stock-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  color: #c2410c;
  background: #ffedd5;
  font-weight: 900;
}

.stock-info strong,
.stock-info span {
  display: block;
}

.stock-info span {
  margin-top: 4px;
  color: #94a3b8;
  font-size: .72rem;
}

.stock-row b {
  color: #dc2626;
  font-size: .78rem;
}

.no-alerts {
  margin-top: 22px;
  padding: 18px;
  border-radius: 15px;
  color: #047857;
  background: #ecfdf5;
}

.model-card {
  margin-top: 22px;
  padding: 20px;
  border-radius: 18px;
  background:
    linear-gradient(135deg, #eef2ff, #ecfeff);
}

.model-card-title {
  display: flex;
  justify-content: space-between;
  color: #64748b;
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .1em;
}

.live-chip {
  padding: 4px 7px;
  border-radius: 999px;
  color: #047857;
  background: #d1fae5;
  letter-spacing: 0;
}

.model-card > strong {
  display: block;
  margin-top: 10px;
}

.model-card p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: .76rem;
  line-height: 1.6;
}

/* NOTES */
.limitations {
  display: grid;
  grid-template-columns: 230px 1fr;
  gap: 30px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  background: #f1f5f9;
}

.limitations h3 {
  margin: 7px 0 0;
  font-size: 1.1rem;
}

.notes p {
  margin: 0 0 8px;
  color: #64748b;
  font-size: .76rem;
  line-height: 1.6;
}

.notes p:last-child {
  margin-bottom: 0;
}

/* STATES */
.state {
  display: grid;
  justify-items: center;
  gap: 14px;
  padding: 110px;
}

.loader {
  width: 34px;
  height: 34px;
  border: 3px solid #e2e8f0;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

.error {
  color: #b91c1c;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* RESPONSIVE */
@media (max-width: 1050px) {
  .kpis {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .hero {
    display: block;
  }

  .hero-status {
    margin-top: 25px;
    display: inline-flex;
  }
}

@media (max-width: 650px) {
  .analytics-page {
    padding: 22px 14px 60px;
  }

  .hero {
    padding: 30px 24px;
    border-radius: 24px;
  }

  .hero h1 {
    font-size: 2.7rem;
  }

  .kpis {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 20px;
  }

  .segment-layout {
    grid-template-columns: 1fr;
  }

  .donut {
    height: 220px;
  }

  .forecast-meta {
    flex-wrap: wrap;
  }

  .forecast-note {
    display: block;
  }

  .forecast-note span {
    display: block;
    margin-top: 7px;
  }

  .limitations {
    grid-template-columns: 1fr;
  }
}
</style>
