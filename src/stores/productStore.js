import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/fb";
import {
  getAllProducts,
  ensureProductsExist,
  updateProductPrice,
  fetchChangesCountPerDay,
} from "@/db/priceService";
import { useSessionStore } from "@/stores/userSessionStore";

/**
 * Product Store
 *
 * Responsibilities:
 * - Load product list from Firestore (via priceService.fetchProducts)
 * - Optionally ensure product docs exist (seed from constants)
 * - Provide real-time updates via onSnapshot (startRealtime / stopRealtime)
 * - Expose helpers to lookup product by id or name
 * - Provide updatePrice action that writes via priceService.updateProductPrice and keeps local cache in sync
 *
 * Usage:
 * const productStore = useProductStore();
 * await productStore.loadProducts();
 * productStore.startRealtime(); // optional
 *
 */

export const useProductStore = defineStore("product", {
  state: () => ({
    products: [], // array of { id, slno, name, mrp, ... }
    loading: false,
    lastLoadedAt: null,
    realtimeUnsubscribe: null,
  }),

  getters: {
    // map of id -> product for quick lookup
    productsById: (state) =>
      state.products.reduce((acc, p) => {
        acc[String(p.id)] = p;
        return acc;
      }, {}),

    // convenience getter to expose product names list for selects
    productNames: (state) => state.products.map((p) => p.name),
  },

  actions: {
    // Load products from Firestore; if empty, seed once using constants then reload
    async loadProducts() {
      this.loading = true;
      try {
        let list = await getAllProducts();

        // If DB is empty, seed once and refetch
        if (!Array.isArray(list) || list.length === 0) {
          // Only attempt seeding if current user is admin
          try {
            const sessionStore = useSessionStore();
            const isAdmin = !!sessionStore.getIsAdmin?.();
            if (isAdmin) {
              await ensureProductsExist();
              list = await getAllProducts();
            }
          } catch (seedErr) {
            console.error("productStore.loadProducts: seeding failed", seedErr);
          }
        }

        // normalize fields
        this.products = (list || []).map((p) => ({
          id: p.id || String(p.slno),
          slno: p.slno,
          name: p.name,
          mrp: Number(p.mrp),
          raw: p,
        }));
        this.lastLoadedAt = Date.now();
      } catch (err) {
        console.error("productStore.loadProducts: failed to fetch products", err);
        this.products = [];
      } finally {
        this.loading = false;
      }
    },

    // Ensure products exist in Firestore (seeds using constants if missing)
    async ensureProductsExist() {
      try {
        const created = await ensureProductsExist();
        // If new products were created, reload
        if (created && created.length) {
          await this.loadProducts();
        }
        return created;
      } catch (err) {
        console.error("productStore.ensureProductsExist failed", err);
        throw err;
      }
    },

    // Start realtime listener for products collection to keep store in sync
    startRealtime() {
      // avoid multiple listeners
      if (this.realtimeUnsubscribe) return;

      try {
        const productsColl = collection(db, "products");
        const q = query(productsColl, orderBy("slno", "asc"));
        const unsub = onSnapshot(
          q,
          (snap) => {
            const items = [];
            snap.forEach((doc) => {
              const data = doc.data();
              items.push({
                id: doc.id,
                slno: data.slno,
                name: data.name,
                mrp: Number(data.mrp),
                raw: data,
              });
            });
            this.products = items;
            this.lastLoadedAt = Date.now();
          },
          (err) => {
            console.error("productStore realtime snapshot error", err);
          }
        );

        this.realtimeUnsubscribe = unsub;
      } catch (err) {
        console.error("productStore.startRealtime failed", err);
      }
    },

    // Stop realtime listener if active
    stopRealtime() {
      if (this.realtimeUnsubscribe) {
        try {
          this.realtimeUnsubscribe();
        } catch (e) {
          console.warn("productStore.stopRealtime unsubscribe failed", e);
        }
        this.realtimeUnsubscribe = null;
      }
    },

    // Return product by id (string or number)
    getProductById(id) {
      if (!id && id !== 0) return null;
      const key = String(id);
      return this.products.find((p) => String(p.id) === key) || null;
    },

    // Return first product that matches name exactly
    getProductByName(name) {
      if (!name) return null;
      return this.products.find((p) => p.name === name) || null;
    },

    // Update a product price using the priceService (transaction + audit)
    // Accepts optional reason and optional user payload; if user not provided it will be built from session store
    async updatePrice(productId, newPrice, reason = null, userPayload = null) {
      // basic input validation
      if (newPrice === undefined || newPrice === null || Number.isNaN(Number(newPrice))) {
        throw new Error("Invalid newPrice");
      }

      const numericPrice = Number(newPrice);
      if (numericPrice < 0) {
        throw new Error("Price cannot be negative");
      }

      // Build user payload if not passed
      let user = userPayload;
      if (!user) {
        const sessionStore = useSessionStore();
        const u = sessionStore.getUser()?.fbUser || {};
        user = {
          uid: u?.uid || null,
          email: u?.email || sessionStore.getUser()?.email || null,
          name: u?.displayName || u?.email || null,
        };
      }

      try {
        // call service that runs transaction and writes audit
        const result = await updateProductPrice(productId, numericPrice, user, reason);

        // optimistic local update: find product and update mrp
        const idx = this.products.findIndex((p) => String(p.id) === String(productId));
        if (idx !== -1) {
          this.products[idx].mrp = numericPrice;
        } else {
          // If product isn't in the local list, trigger a reload for safety
          await this.loadProducts();
        }

        return result;
      } catch (err) {
        console.error("productStore.updatePrice failed", err);
        throw err;
      }
    },

    // small helper to get count of changes per day (delegates to priceService)
    async loadChangesCountPerDay({ from = null, to = null } = {}) {
      try {
        const arr = await fetchChangesCountPerDay({ from, to });
        return arr;
      } catch (err) {
        console.error("productStore.loadChangesCountPerDay failed", err);
        return [];
      }
    },
  },
});
