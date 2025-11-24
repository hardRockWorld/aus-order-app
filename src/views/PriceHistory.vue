<template>
  <div class="price-history">
    <header class="ph-header">
      <h1>Price Change History</h1>

      <div class="ph-controls">
        <div class="filter-row">
          <label>
            Product
            <select v-model="filters.productId">
              <option value="">-- All products --</option>
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.slno }} - {{ p.name }}
              </option>
            </select>
          </label>

          <label>
            From
            <input type="date" v-model="filters.from" />
          </label>

          <label>
            To
            <input type="date" v-model="filters.to" />
          </label>

          <label>
            Changed By
            <input type="text" v-model="filters.changedBy" placeholder="email or name" />
          </label>

          <button @click="applyFilters" class="btn">Apply</button>
          <button @click="clearFilters" class="btn">Clear</button>
        </div>
      </div>
    </header>

    <section class="ph-stats">
      <div class="stat">
        <div class="value">{{ history.length }}</div>
        <div class="label">Records</div>
      </div>
      <div class="stat">
        <div class="value">{{ changesLast30Days }}</div>
        <div class="label">Changes (last 30 days)</div>
      </div>
    </section>

    <section class="ph-table">
      <table>
        <thead>
          <tr>
            <th style="width:160px">Date</th>
            <th style="width:90px">SLN</th>
            <th>Product</th>
            <th style="width:110px">Old</th>
            <th style="width:110px">New</th>
            <th style="width:220px">Changed By</th>
            <th style="width:220px">Reason</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="row in paginated" :key="row.id">
            <td>{{ formatDate(row.createdAt) }}</td>
            <td>{{ row.productId }}</td>
            <td class="product-cell">
              <div class="prod-name">{{ row.productName || '—' }}</div>
            </td>
            <td class="price-cell">{{ formatMoney(row.oldPrice) }}</td>
            <td class="price-cell">{{ formatMoney(row.newPrice) }}</td>
            <td>
              <div>{{ row.changedBy?.name || row.changedBy?.email || 'Unknown' }}</div>
              <div class="muted">{{ row.changedBy?.email }}</div>
            </td>
            <td class="reason-cell">{{ row.reason || '—' }}</td>
          </tr>

          <tr v-if="!history.length">
            <td colspan="7" class="empty">No history records found.</td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <div>
          <label>
            Per page:
            <select v-model.number="perPage">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </label>
        </div>

        <div class="pager">
          <button @click="prevPage" :disabled="page <= 1" class="btn">Prev</button>
          <span>Page {{ page }} / {{ totalPages }}</span>
          <button @click="nextPage" :disabled="page >= totalPages" class="btn">Next</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import {
  fetchPriceHistory,
  fetchChangesCountPerDay,
  fetchProducts,
} from "@/db/priceService";

// Local reactive state
const route = useRoute();

const loading = ref(false);
const history = ref([]);
const products = ref([]);
const page = ref(1);
const perPage = ref(25);

const filters = reactive({
  productId: route.query.productId || "",
  from: route.query.from || "",
  to: route.query.to || "",
  changedBy: route.query.changedBy || "",
});

// statistics
const changesLast30Days = ref(0);

// Fetch history from db using current filters
async function loadHistory() {
  loading.value = true;
  try {
    // pass productId if set
    const opts = {
      productId: filters.productId || null,
      from: filters.from || null,
      to: filters.to || null,
      limit: 10000,
    };
    const rows = await fetchPriceHistory(opts);
    // apply changedBy filter client-side (simple substring match)
    let filtered = rows;
    if (filters.changedBy && filters.changedBy.trim() !== "") {
      const q = filters.changedBy.toLowerCase();
      filtered = filtered.filter((r) => {
        const by = (r.changedBy && (r.changedBy.email || r.changedBy.name)) || "";
        return String(by).toLowerCase().includes(q);
      });
    }
    history.value = filtered;
    page.value = 1;
    await loadStats();
  } catch (err) {
    console.error("Failed to load price history", err);
    history.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadProducts() {
  try {
    const list = await fetchProducts();
    // normalize
    products.value = list.map((p) => ({
      id: p.id || String(p.slno),
      slno: p.slno,
      name: p.name,
    }));
  } catch (err) {
    console.error("Failed to load products", err);
    products.value = [];
  }
}

async function loadStats() {
  try {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    const arr = await fetchChangesCountPerDay({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    changesLast30Days.value = arr.reduce((s, r) => s + (r.count || 0), 0);
  } catch (e) {
    changesLast30Days.value = 0;
  }
}

// Helpers
function formatDate(ts) {
  if (!ts) return "—";
  // Firestore Timestamp may have toDate()
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString();
}
function formatMoney(v) {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(2);
}

// Pagination
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(history.value.length / perPage.value || 1));
});
const paginated = computed(() => {
  const start = (page.value - 1) * perPage.value;
  return history.value.slice(start, start + perPage.value);
});
function nextPage() {
  if (page.value < totalPages.value) page.value += 1;
}
function prevPage() {
  if (page.value > 1) page.value -= 1;
}

function applyFilters() {
  // normalize empty strings to nulls will be handled by loadHistory
  loadHistory();
}
function clearFilters() {
  filters.productId = "";
  filters.from = "";
  filters.to = "";
  filters.changedBy = "";
  loadHistory();
}

// react to initial query params if present
onMounted(async () => {
  await loadProducts();
  await loadHistory();
});
</script>

<style scoped>
.price-history {
  max-width: 1100px;
  margin: 0 auto;
  padding: 18px;
  color: var(--text-color);
}

.ph-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.ph-header h1 {
  margin: 0;
  font-size: 20px;
}

.ph-controls .filter-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.ph-controls label {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: var(--text-color);
}

.ph-controls input,
.ph-controls select {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.btn {
  padding: 8px 12px;
  border-radius: 6px;
  background: #f6f8f6;
  border: 1px solid #e6e6e6;
  cursor: pointer;
}

.ph-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.stat {
  padding: 10px;
  border-radius: 8px;
  background: var(--card-bg, #fff);
  min-width: 140px;
  text-align: center;
}

.stat .value {
  font-weight: 700;
  font-size: 18px;
}

.ph-table {
  border: 1px solid #ececec;
  border-radius: 8px;
  overflow: auto;
  padding: 0;
}

.ph-table table {
  width: 100%;
  border-collapse: collapse;
}

.ph-table th,
.ph-table td {
  padding: 10px;
  border-bottom: 1px solid #f3f3f3;
  text-align: left;
  vertical-align: middle;
}

.product-cell .prod-name {
  max-width: 420px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.price-cell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace;
}

.empty {
  padding: 16px;
  text-align: center;
  color: #666;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  gap: 12px;
}
</style>
