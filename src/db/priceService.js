/**
 * Firestore Price Service
 *
 * Responsibilities:
 * - Initialize product documents from the in-repo product list (src/util/constants.js)
 * - Read products from Firestore
 * - Update product price inside a transaction and write an audit record to `price_changes`
 * - Read price change history and simple aggregations
 *
 * Usage notes:
 * - This module expects `db` to be the Firestore instance exported from `src/fb.js`.
 * - The `user` passed to `updateProductPrice` should be an object like { uid, email, name }.
 * - This is written for the modular Firebase SDK (v9+).
 */

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  limit as fbLimit,
} from "firebase/firestore";
import { db } from "@/fb";
import { products as defaultProducts } from "@/util/constants";

/**
 * Ensure all products from the in-repo `constants.products` exist in Firestore.
 * Each product document will use the product `slno` as the document ID.
 *
 * Returns: Array of created product ids (strings).
 */
export async function ensureProductsExist() {
  const productsColl = collection(db, "products");
  // fetch all existing product docs
  const q = query(productsColl, orderBy("slno", "asc"));
  const snap = await getDocs(q);
  const existing = new Set();
  snap.forEach((d) => {
    // store existing slno as string
    const data = d.data();
    if (data && data.slno !== undefined) {
      existing.add(String(data.slno));
    } else {
      // fallback to doc.id
      existing.add(d.id);
    }
  });

  const created = [];
  // create missing products
  for (const p of defaultProducts) {
    const id = String(p.slno);
    if (!existing.has(id)) {
      await setDoc(doc(db, "products", id), {
        slno: p.slno,
        name: p.name,
        mrp: Number(p.mrp),
        createdAt: serverTimestamp(),
      });
      created.push(id);
    }
  }

  return created;
}

/**
 * Fetch all products from Firestore ordered by `slno`.
 * Returns: Array of product objects { id, slno, name, mrp, ... }
 */
export async function fetchProducts() {
  const productsColl = collection(db, "products");
  const q = query(productsColl, orderBy("slno", "asc"));
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  return list;
}

/**
 * New CRUD API (Database First)
 *
 * getAllProducts: returns products from Firestore (ordered by slno asc)
 * addProduct: adds a new product (uses provided slno as doc id if present)
 * updateProduct: updates an existing product document
 * deleteProduct: deletes a product document
 */
export async function getAllProducts() {
  return await fetchProducts();
}

export async function addProduct(product) {
  if (!product || typeof product !== "object") {
    throw new Error("addProduct: invalid product payload");
  }

  // If slno is provided, we prefer stable doc ids by slno
  if (product.slno !== undefined && product.slno !== null) {
    const id = String(product.slno);
    const ref = doc(db, "products", id);
    await setDoc(ref, {
      slno: product.slno,
      name: product.name ?? "",
      mrp: Number(product.mrp ?? 0),
      createdAt: serverTimestamp(),
      ...("createdAt" in product ? {} : {}),
    }, { merge: true });
    const snap = await getDoc(ref);
    return { id: ref.id, ...snap.data() };
  }

  // else use auto id
  const coll = collection(db, "products");
  const docRef = await addDoc(coll, {
    slno: product.slno ?? null,
    name: product.name ?? "",
    mrp: Number(product.mrp ?? 0),
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(docRef);
  return { id: docRef.id, ...snap.data() };
}

export async function updateProduct(id, updates) {
  if (!id) throw new Error("updateProduct: id is required");
  if (!updates || typeof updates !== "object") {
    throw new Error("updateProduct: updates must be an object");
  }
  const ref = doc(db, "products", String(id));
  // sanitize fields
  const payload = { ...updates };
  if (payload.mrp !== undefined) payload.mrp = Number(payload.mrp);
  await updateDoc(ref, payload);
  const snap = await getDoc(ref);
  return { id: ref.id, ...snap.data() };
}

export async function deleteProduct(id) {
  if (!id) throw new Error("deleteProduct: id is required");
  const ref = doc(db, "products", String(id));
  await deleteDoc(ref);
  return true;
}

/**
 * Update product price (mrp) and create an audit entry in `price_changes`.
 *
 * Params:
 * - productId: id of the product document (string or number)
 * - newPrice: numeric new price
 * - user: object containing at least { uid, email, name } identifying the changer
 * - reason: optional string describing why price changed
 *
 * Returns:
 * - Object with { productId, oldPrice, newPrice } on success
 *
 * Throws on failure (e.g. product not found).
 */
export async function updateProductPrice(
  productId,
  newPrice,
  user = {},
  reason = null,
) {
  const productRef = doc(db, "products", String(productId));
  const priceChangesColl = collection(db, "price_changes");

  // runTransaction will automatically retry on contention
  return await runTransaction(db, async (transaction) => {
    const prodSnap = await transaction.get(productRef);
    if (!prodSnap.exists()) {
      throw new Error("Product not found");
    }

    const prodData = prodSnap.data();
    const oldPrice = prodData?.mrp ?? null;

    // update product mrp
    transaction.update(productRef, { mrp: Number(newPrice) });

    // create audit record with auto id
    const auditRef = doc(priceChangesColl);
    transaction.set(auditRef, {
      productId: String(productId),
      productName: prodData?.name || null,
      oldPrice: oldPrice !== null ? Number(oldPrice) : null,
      newPrice: Number(newPrice),
      changedBy: {
        uid: user?.uid || null,
        email: user?.email || null,
        name: user?.name || null,
      },
      reason: reason || null,
      createdAt: serverTimestamp(),
    });

    return {
      productId: String(productId),
      oldPrice,
      newPrice: Number(newPrice),
    };
  });
}

/**
 * Resolve a product's MRP as of a specific timestamp.
 * Strategy:
 * 1) Find the last change at or before the timestamp => use its newPrice.
 * 2) Else find the first change after the timestamp => use its oldPrice.
 * 3) Else fallback to the product's current mrp.
 *
 * Accepts product id (string/number). If productName is provided instead,
 * pass it via the options { productName } to resolve the product id.
 */
export async function getProductPriceAtTime(productId, timestamp, options = {}) {
  let pid = productId ? String(productId) : null;
  // Resolve product id by name if needed
  if (!pid && options?.productName) {
    const qByName = query(
      collection(db, "products"),
      where("name", "==", options.productName),
      fbLimit(1),
    );
    const snap = await getDocs(qByName);
    if (!snap.empty) {
      pid = snap.docs[0].id;
    }
  }

  if (!pid) throw new Error("getProductPriceAtTime: productId or productName required");

  const productRef = doc(db, "products", pid);
  const priceChanges = collection(db, "price_changes");

  // 1) last change at or before t
  const qBefore = query(
    priceChanges,
    where("productId", "==", String(pid)),
    orderBy("createdAt", "desc"),
    fbLimit(20),
  );
  // We cannot directly filter by <= with composite without index setup here, so
  // we fetch a small recent window and pick the first <= timestamp.
  const snapBefore = await getDocs(qBefore);
  let candidateBefore = null;
  snapBefore.forEach((d) => {
    const data = d.data();
    const ts = data?.createdAt?.toMillis?.() ?? data?.createdAt;
    if (ts != null && ts <= timestamp && candidateBefore == null) {
      candidateBefore = data;
    }
  });
  if (candidateBefore) {
    return Number(candidateBefore.newPrice);
  }

  // 2) first change after t
  const qAfter = query(
    priceChanges,
    where("productId", "==", String(pid)),
    orderBy("createdAt", "asc"),
    fbLimit(20),
  );
  const snapAfter = await getDocs(qAfter);
  let candidateAfter = null;
  snapAfter.forEach((d) => {
    const data = d.data();
    const ts = data?.createdAt?.toMillis?.() ?? data?.createdAt;
    if (ts != null && ts > timestamp && candidateAfter == null) {
      candidateAfter = data;
    }
  });
  if (candidateAfter) {
    return Number(candidateAfter.oldPrice);
  }

  // 3) fallback to product's current mrp
  const prodSnap = await getDoc(productRef);
  if (prodSnap.exists()) {
    const data = prodSnap.data();
    return Number(data?.mrp ?? 0);
  }
  return 0;
}

/**
 * Fetch price change history with optional filters.
 *
 * Options:
 * - productId: (string|number) filter by product id
 * - from: ISO date string or Date - inclusive
 * - to: ISO date string or Date - inclusive
 * - limit: maximum number of entries to return (default 200)
 *
 * Note: For simplicity and because Firestore timestamps require specific query patterns,
 * this implementation fetches recent history ordered by createdAt desc and applies
 * additional filters client-side. For large datasets you should implement server-side
 * paging or additional indexed queries.
 *
 * Returns: array of history records (most-recent-first)
 */
export async function fetchPriceHistory({
  productId = null,
  from = null,
  to = null,
  limit = 200,
} = {}) {
  const coll = collection(db, "price_changes");
  const q = query(coll, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));

  let filtered = list;

  if (productId != null) {
    filtered = filtered.filter(
      (r) => String(r.productId) === String(productId),
    );
  }

  if (from) {
    const fromTs = new Date(from).getTime();
    filtered = filtered.filter((r) => {
      if (!r.createdAt) return false;
      // createdAt is a Firestore Timestamp - convert to Date for comparison
      const created = r.createdAt.toDate
        ? r.createdAt.toDate().getTime()
        : new Date(r.createdAt).getTime();
      return created >= fromTs;
    });
  }

  if (to) {
    const toTs = new Date(to).getTime();
    filtered = filtered.filter((r) => {
      if (!r.createdAt) return false;
      const created = r.createdAt.toDate
        ? r.createdAt.toDate().getTime()
        : new Date(r.createdAt).getTime();
      return created <= toTs;
    });
  }

  return filtered.slice(0, limit);
}

/**
 * Simple aggregation: count number of price changes grouped by day
 * within an optional date range.
 *
 * Options:
 * - from: ISO date string or Date - inclusive
 * - to: ISO date string or Date - inclusive
 *
 * Returns: Array of { day: 'YYYY-MM-DD', count: number } sorted ascending by day
 */
export async function fetchChangesCountPerDay({ from = null, to = null } = {}) {
  const all = await fetchPriceHistory({ from, to, limit: 10000 });
  const map = new Map();

  for (const r of all) {
    const dt = r.createdAt
      ? r.createdAt.toDate
        ? r.createdAt.toDate()
        : new Date(r.createdAt)
      : new Date();
    const key = dt.toISOString().slice(0, 10); // YYYY-MM-DD
    map.set(key, (map.get(key) || 0) + 1);
  }

  const result = Array.from(map.entries()).map(([day, count]) => ({
    day,
    count,
  }));
  result.sort((a, b) => a.day.localeCompare(b.day));
  return result;
}

/**
 * Check if a user (uid) is an admin by looking up admins/{uid}.
 * Returns: boolean
 *
 * This helper is lightweight and suitable for UI checks. For security enforcement,
 * rely on Firestore rules (admins collection / custom claims) and server-side checks.
 */
export async function isUserAdmin(uid) {
  if (!uid) return false;
  try {
    // Check explicit admin marker document and ensure isAdmin == true
    const ref = doc(db, "admins", String(uid));
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const data = snap.data() || {};
    return data.isAdmin === true;
  } catch (err) {
    console.error("isUserAdmin lookup failed", err);
    return false;
  }
}
