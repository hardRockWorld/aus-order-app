<template>
    <div class="price-management">
        <header class="pm-header">
            <h1>Price Management</h1>

            <!-- Admin notice: visible to non-admins -->
            <div v-if="!isAdmin" class="admin-banner">
                <strong>Read-only:</strong> Price editing and product imports
                are restricted to administrators. You can still view current
                prices and history. If you need edit access, ask an
                administrator to add you to the admins list.
            </div>

            <div class="pm-actions" style="margin-top: 10px">
                <button @click="refresh" :disabled="loading" class="btn">
                    Refresh
                </button>
                <!-- Import Defaults is an admin operation; disable for non-admins -->
                <button
                    @click="importProducts"
                    :disabled="importing || !isAdmin"
                    class="btn"
                >
                    Import Defaults
                </button>
                <button
                    v-if="Object.keys(edited).length"
                    @click="saveAllEdited"
                    :disabled="savingAll || !isAdmin"
                    class="btn primary"
                >
                    Save All Edited ({{ Object.keys(edited).length }})
                </button>
                <router-link :to="{ name: 'priceHistory' }" class="btn link"
                    >View Full History</router-link
                >
            </div>
        </header>

        <section v-if="loading" class="pm-loading">Loading products...</section>

        <section v-else class="pm-body">
            <div class="pm-stats">
                <div class="stat">
                    <div class="value">{{ products.length }}</div>
                    <div class="label">Products</div>
                </div>
                <div class="stat">
                    <div class="value">{{ totalEdited }}</div>
                    <div class="label">Edited (unsaved)</div>
                </div>
                <div class="stat">
                    <div class="value">{{ changesCountLast30Days }}</div>
                    <div class="label">Changes (last 30d)</div>
                </div>
            </div>

            <div class="table-wrap">
                <table class="pm-table">
                    <thead>
                        <tr>
                            <th style="width: 40px">
                                <input
                                    type="checkbox"
                                    @change="toggleSelectAll"
                                    :checked="allSelected"
                                />
                            </th>
                            <th style="width: 70px">SL</th>
                            <th>Product</th>
                            <th style="width: 140px">Current Price (MRP)</th>
                            <th style="width: 160px">New Price</th>
                            <th style="width: 220px">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="p in products" :key="p.id">
                            <td>
                                <input
                                    type="checkbox"
                                    v-model="selected"
                                    :value="p.id"
                                />
                            </td>
                            <td>{{ p.slno }}</td>
                            <td class="product-name">{{ p.name }}</td>
                            <td>{{ formatCurrency(p.mrp) }}</td>
                            <td>
                                <input
                                    class="price-input"
                                    type="number"
                                    step="0.01"
                                    :placeholder="p.mrp"
                                    v-model="edited[p.id]"
                                    :disabled="!isAdmin"
                                />
                            </td>
                            <td class="row-actions">
                                <button
                                    @click="saveSingle(p)"
                                    :disabled="saving[p.id] || !isAdmin"
                                    class="btn small"
                                >
                                    Save
                                </button>
                                <button
                                    @click="revert(p)"
                                    :disabled="!edited[p.id] || !isAdmin"
                                    class="btn small"
                                >
                                    Revert
                                </button>
                                <button
                                    @click="openHistory(p)"
                                    class="btn small muted"
                                >
                                    History
                                </button>
                            </td>
                        </tr>
                        <tr v-if="!products.length">
                            <td colspan="6" class="empty">
                                No products found. Click Import Defaults to
                                initialize product records in Firestore.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="bulk-actions" v-if="selected.length">
                <div class="selected-count">{{ selected.length }} selected</div>
                <button
                    @click="saveSelected"
                    :disabled="bulkSaving"
                    class="btn primary"
                >
                    Save Selected
                </button>
                <button @click="clearSelectedEdits" class="btn">
                    Clear Edits
                </button>
                <button @click="openBulkHistory" class="btn link">
                    View Selected History
                </button>
            </div>
        </section>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "@/stores/userSessionStore";
import {
    getAllProducts,
    ensureProductsExist,
    updateProductPrice,
    fetchChangesCountPerDay,
} from "@/db/priceService";

const router = useRouter();
const session = useSessionStore();
const isAdmin = computed(() => session.getIsAdmin());

const loading = ref(true);
const importing = ref(false);
const products = ref([]);
const edited = reactive({}); // keyed by product id -> new price value (string or number)
const saving = reactive({}); // productId -> boolean
const savingAll = ref(false);
const selected = ref([]); // array of selected product ids
const bulkSaving = ref(false);
const changesCountLast30Days = ref(0);

const allSelected = computed(
    () =>
        selected.value.length === products.value.length &&
        products.value.length > 0,
);
const totalEdited = computed(
    () =>
        Object.keys(edited).filter(
            (k) =>
                edited[k] !== undefined &&
                edited[k] !== null &&
                edited[k] !== "",
        ).length,
);

function formatCurrency(val) {
    if (val === null || val === undefined) return "-";
    return Number(val).toFixed(2);
}

async function loadProducts() {
    loading.value = true;
    try {
        let list = await getAllProducts();

        // If DB is empty, seed once using constants, then reload — only admins may seed
        if (!Array.isArray(list) || list.length === 0) {
            try {
                if (isAdmin.value) {
                    await ensureProductsExist();
                    list = await getAllProducts();
                }
            } catch (seedErr) {
                console.error(
                    "PriceManagement.loadProducts: seeding failed",
                    seedErr,
                );
            }
        }
        // Ensure numeric mrp and stable id property
        products.value = list.map((p) => ({
            id: p.id || String(p.slno),
            slno: p.slno,
            name: p.name,
            mrp: Number(p.mrp),
            raw: p,
        }));
        // reset edited object for items not present
        for (const k of Object.keys(edited)) {
            if (!products.value.find((x) => x.id === k)) delete edited[k];
        }
    } catch (err) {
        console.error("Failed to load products", err);
        window.alert("Failed to load products. Check console for details.");
    } finally {
        loading.value = false;
        loadStats();
    }
}

async function loadStats() {
    try {
        // load changes per day and count last 30 days
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 30);
        const arr = await fetchChangesCountPerDay({
            from: from.toISOString(),
            to: to.toISOString(),
        });
        const total = arr.reduce((s, r) => s + (r.count || 0), 0);
        changesCountLast30Days.value = total;
    } catch (e) {
        // non-fatal
        changesCountLast30Days.value = 0;
    }
}

onMounted(async () => {
    await loadProducts();
});

// Import defaults (create missing product docs from constants)
async function importProducts() {
    importing.value = true;
    try {
        const created = await ensureProductsExist();
        if (created && created.length) {
            window.alert(`Created ${created.length} product records`);
        } else {
            window.alert(
                "No new products to create. Products may already exist.",
            );
        }
        await loadProducts();
    } catch (err) {
        console.error("Import error", err);
        window.alert("Failed to import products. See console for details.");
    } finally {
        importing.value = false;
    }
}

// Save single product price
async function saveSingle(p) {
    const newVal = edited[p.id];
    if (newVal === undefined || newVal === null || newVal === "") {
        window.alert("Enter a new price before saving.");
        return;
    }
    const numeric = Number(newVal);
    if (Number.isNaN(numeric) || numeric < 0) {
        window.alert("Enter a valid non-negative number for price.");
        return;
    }
    saving[p.id] = true;
    try {
        const user = buildUserPayload();
        await updateProductPrice(
            p.id,
            numeric,
            user,
            `Manual update by ${user?.email || "unknown"}`,
        );
        // update local copy
        const idx = products.value.findIndex((x) => x.id === p.id);
        if (idx !== -1) products.value[idx].mrp = numeric;
        delete edited[p.id];
        // refresh stats
        await loadStats();
        window.alert(`Price updated for ${p.name}`);
    } catch (err) {
        console.error("Save single error", err);
        window.alert("Failed to update price. See console for details.");
    } finally {
        saving[p.id] = false;
    }
}

// Save all edited (bulk commit for all edited entries)
async function saveAllEdited() {
    const edits = Object.keys(edited).filter(
        (k) =>
            edited[k] !== undefined && edited[k] !== null && edited[k] !== "",
    );
    if (!edits.length) {
        window.alert("No edited prices to save.");
        return;
    }
    if (
        !confirm(
            `Save ${edits.length} price changes? This will create audit entries for each change.`,
        )
    )
        return;

    savingAll.value = true;
    const user = buildUserPayload();
    try {
        for (const id of edits) {
            const newVal = Number(edited[id]);
            if (Number.isNaN(newVal) || newVal < 0) {
                console.warn("Skipping invalid price for", id);
                continue;
            }
            // sequential to be simpler and to avoid Firestore contention in heavy cases; adjust to Promise.all if you prefer parallel
            await updateProductPrice(
                id,
                newVal,
                user,
                `Bulk save by ${user?.email || "unknown"}`,
            );
            // update local product object
            const idx = products.value.findIndex((x) => x.id === id);
            if (idx !== -1) products.value[idx].mrp = newVal;
            delete edited[id];
        }
        await loadStats();
        window.alert(`Saved ${edits.length} prices`);
    } catch (err) {
        console.error("Bulk save error", err);
        window.alert("Failed while saving bulk edits. See console.");
    } finally {
        savingAll.value = false;
    }
}

// Save selected products (only those selected & with edits)
async function saveSelected() {
    const toSave = selected.value.filter(
        (id) =>
            edited[id] !== undefined &&
            edited[id] !== null &&
            edited[id] !== "",
    );
    if (!toSave.length) {
        window.alert("Select products and make edits before saving.");
        return;
    }
    if (!confirm(`Save ${toSave.length} selected price changes?`)) return;
    bulkSaving.value = true;
    const user = buildUserPayload();
    try {
        for (const id of toSave) {
            const newVal = Number(edited[id]);
            if (Number.isNaN(newVal) || newVal < 0) continue;
            await updateProductPrice(
                id,
                newVal,
                user,
                `Bulk-selected save by ${user?.email || "unknown"}`,
            );
            const idx = products.value.findIndex((x) => x.id === id);
            if (idx !== -1) products.value[idx].mrp = newVal;
            delete edited[id];
        }
        selected.value = [];
        await loadStats();
        window.alert(`Saved ${toSave.length} selected prices.`);
    } catch (err) {
        console.error("saveSelected error", err);
        window.alert("Failed to save selected. See console.");
    } finally {
        bulkSaving.value = false;
    }
}

function revert(p) {
    if (edited[p.id] !== undefined) delete edited[p.id];
}

function clearSelectedEdits() {
    for (const id of selected.value) {
        if (edited[id] !== undefined) delete edited[id];
    }
}

function toggleSelectAll(e) {
    if (e.target.checked) {
        selected.value = products.value.map((p) => p.id);
    } else {
        selected.value = [];
    }
}

async function refresh() {
    await loadProducts();
}

function openHistory(p) {
    router.push({ name: "priceHistory", query: { productId: p.id } });
}

function openBulkHistory() {
    router.push({
        name: "priceHistory",
        query: { productId: selected.value.join(",") },
    });
}

function buildUserPayload() {
    // session.currentUser.fbUser contains firebase user object based on userSessionStore implementation
    const u = session.getUser()?.fbUser || {};
    return {
        uid: u?.uid || null,
        email: u?.email || session.getUser()?.email || null,
        name: u?.displayName || u?.email || null,
    };
}
</script>

<style scoped>
/* Make Price Management follow global theme variables (light/dark) */
.price-management {
    padding: 18px;
    max-width: 1100px;
    margin: 0 auto;
    color: var(--text-color);
    background-color: var(--background-color, var(--bg-color));
    transition:
        background-color 0.3s ease,
        color 0.3s ease;
}

.pm-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.pm-header h1 {
    margin: 0;
    font-size: 20px;
    color: var(--text-color);
}

/* Admin banner: theme-aware notice (light / dark) */
.admin-banner {
    margin-top: 8px;
    padding: 10px;
    border-radius: 6px;
    /* default (light) appearance - theme variables with sensible fallbacks */
    background: var(--warning-bg, #fff6f6);
    color: var(--warning-text, #7a1a1a);
    border: 1px solid var(--warning-border, #ffdddd);
    font-size: 14px;
    line-height: 1.3;
}

/* Dark theme variant: use theme variables and ensure contrast */
[data-theme="dark"] .admin-banner {
    /* use theme-aware variables for dark theme; fallback to a subtle gradient */
    background: var(
        --warning-bg-dark,
        linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.02),
            rgba(255, 255, 255, 0.01)
        )
    );
    color: var(--warning-text-dark, var(--text-color));
    border: 1px solid var(--warning-border-dark, rgba(255, 255, 255, 0.06));
}

/* Slightly muted primary-warning variant based on theme variables */
.admin-banner strong {
    color: var(--primary);
}

/* Dark mode overrides to match dashboard contrast and improve readability */
[data-theme="dark"] .price-management,
[data-theme="dark"] .pm-header,
[data-theme="dark"] .pm-stats,
[data-theme="dark"] .table-wrap,
[data-theme="dark"] .pm-table,
[data-theme="dark"] .pm-body {
    background-color: #1e1e1e !important;
    color: #ffffff !important;
}

/* Make table header and cards use darker but contrasted surfaces in dark theme */
[data-theme="dark"] .pm-table th {
    background-color: #2a2a2a !important;
    color: var(--primary, #c0ca33) !important;
    border-bottom-color: #404040 !important;
}

/* Force readable text colors on key elements in dark mode */
[data-theme="dark"] .pm-table td,
[data-theme="dark"] .product-name,
[data-theme="dark"] .price-input,
[data-theme="dark"] .stat,
[data-theme="dark"] .selected-count,
[data-theme="dark"] .bulk-actions,
[data-theme="dark"] .row-actions {
    color: #ffffff !important;
}

/* Button styles in dark theme: primary uses primary variable; muted buttons use subtle backgrounds */
[data-theme="dark"] .btn {
    background-color: var(--primary) !important;
    color: var(--primary-inverse, #121212) !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

[data-theme="dark"] .btn.muted {
    background-color: #2a2a2a !important;
    color: var(--text-muted, #d0d0d0) !important;
    border-color: #404040 !important;
}

/* Ensure inputs and selects use dark surfaces with clear text */
[data-theme="dark"] .ph-controls input,
[data-theme="dark"] .ph-controls select,
[data-theme="dark"] .price-input {
    background-color: #151515 !important;
    border-color: #2f2f2f !important;
    color: #ffffff !important;
}

.pm-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

/* Buttons: primary uses --primary variable; other buttons adapt to theme */
.btn {
    padding: 8px 12px;
    border-radius: 6px;
    background: var(--card-bg, transparent);
    border: 1px solid var(--border-light, #e0e0e0);
    cursor: pointer;
    font-size: 14px;
    color: var(--text-color);
    transition:
        background-color 0.2s ease,
        transform 0.08s ease,
        color 0.2s ease;
}

/* Improve hover and focus contrast similar to dashboard */
.btn:hover:not(:disabled) {
    filter: brightness(0.98);
    transform: translateY(-1px);
    background-color: var(--primary-hover, var(--primary)) !important;
    color: var(--primary-inverse, #fff) !important;
}

/* Make primary buttons visually prominent across themes */
.btn.primary {
    background: var(--primary);
    color: var(--primary-inverse, #fff);
    border: none;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.15);
}

.btn.link {
    background: none;
    border: none;
    color: var(--text-color);
    text-decoration: underline;
    padding: 6px 10px;
}

/* Muted buttons with good contrast on both themes */
.btn.muted {
    background: var(--card-bg, #fff);
    color: var(--text-muted, #666);
    border: 1px solid var(--border-light, #ddd);
}

.btn.small {
    padding: 6px 8px;
    font-size: 13px;
}

.btn.primary {
    background: var(--primary);
    color: var(--primary-inverse, #fff);
    border: none;
}

.btn.link {
    background: none;
    border: none;
    color: var(--text-color);
    text-decoration: underline;
    padding: 6px 10px;
}

.btn.muted {
    background: var(--card-bg, #fff);
    color: var(--text-muted, #666);
    border: 1px solid var(--border-light, #ddd);
}

.btn:hover:not(:disabled) {
    filter: brightness(0.98);
    transform: translateY(-1px);
}

.pm-loading {
    padding: 32px;
    text-align: center;
}

.pm-stats {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
}

.stat {
    background: var(--card-bg, #fff);
    border-radius: 8px;
    padding: 12px;
    min-width: 120px;
    text-align: center;
    box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.03));
    color: var(--text-color);
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
}

.stat .value {
    font-weight: 700;
    font-size: 18px;
}

.table-wrap {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid var(--border-light, #e9ecef);
    background: var(--card-bg, transparent);
}

.pm-table {
    width: 100%;
    border-collapse: collapse;
}

.pm-table th {
    text-align: left;
    background: var(--primary-focus, rgba(10, 61, 10, 0.06));
    padding: 10px;
    border-bottom: 1px solid var(--border-light, #eee);
    font-weight: 600;
    color: var(--primary);
}

.pm-table td {
    padding: 10px;
    border-bottom: 1px solid var(--border-light, #f2f2f2);
    vertical-align: middle;
    color: var(--text-color);
}

.product-name {
    max-width: 420px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-color);
}

.price-input {
    width: 120px;
    padding: 6px 8px;
    border: 1px solid var(--border-light, #ddd);
    border-radius: 6px;
    background: var(--card-bg, var(--background-color));
    color: var(--text-color);
    /* Ensure typed text is visible across browsers (WebKit) */
    -webkit-text-fill-color: var(--text-color) !important;
    caret-color: var(--text-color);
}

/* Placeholder rules - include vendor-prefixed variants for broad support */
.price-input::placeholder,
.price-input::-webkit-input-placeholder,
.price-input::-moz-placeholder,
.price-input:-ms-input-placeholder {
    color: var(--placeholder-color);
    opacity: 0.85;
}

/* Some browsers (WebKit) require explicit placeholder selector on number inputs */
input[type="number"].price-input::-webkit-input-placeholder {
    color: var(--placeholder-color);
    opacity: 0.85;
}

/* Dark-theme adjustments: keep strong contrast for both value and placeholder */
[data-theme="dark"] .price-input {
    background: var(--card-bg, #1e1e1e) !important;
    color: var(--text-color) !important;
    border-color: var(--border-color, #404040) !important;
    -webkit-text-fill-color: var(--text-color) !important;
}

/* Dark-theme placeholder: use a slightly muted light color so placeholder remains visible */
[data-theme="dark"] .price-input::placeholder,
[data-theme="dark"] .price-input::-webkit-input-placeholder,
[data-theme="dark"] .price-input::-moz-placeholder,
[data-theme="dark"] .price-input:-ms-input-placeholder {
    color: rgba(255, 255, 255, 0.65) !important;
    opacity: 0.95;
}

.row-actions {
    display: flex;
    gap: 6px;
    align-items: center;
}

.empty {
    text-align: center;
    padding: 18px;
    color: var(--text-muted, #666);
}

.bulk-actions {
    margin-top: 12px;
    display: flex;
    gap: 12px;
    align-items: center;
}

.selected-count {
    font-size: 14px;
    color: var(--text-color);
}
</style>
