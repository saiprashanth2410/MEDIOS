import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import defaultMedicines from "../data/catalogMedicines.json";

const COLLECTION_NAME = "batches";
const LOCAL_BATCHES_KEY = "meditrack_batches";

function calculateBatchStatus(expiryDate) {
  if (!expiryDate) return "Active";
  const now = new Date();
  const exp = new Date(expiryDate);
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Expired";
  if (diffDays <= 90) return "Expiring Soon";
  return "Active";
}

function getInitialBatchesFromCatalog() {
  return defaultMedicines.slice(0, 100).map((m, idx) => {
    const expiry = m.expiry || "2027-10-31";
    return {
      id: `batch-${m.id || idx}`,
      batchNumber: m.batch || `BT-${202600 + idx}`,
      medicineName: m.name,
      quantity: Number(m.stock) || 100,
      expiryDate: expiry,
      supplier: m.manufacturer || m.supplierName || "Cipla Pharmaceuticals Ltd",
      status: calculateBatchStatus(expiry),
      createdAt: new Date().toISOString(),
    };
  });
}

function getLocalBatches() {
  if (typeof window === "undefined") return getInitialBatchesFromCatalog();
  try {
    const raw = localStorage.getItem(LOCAL_BATCHES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const initial = getInitialBatchesFromCatalog();
  try {
    localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

function saveLocalBatches(list) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("meditrack_batches_updated"));
  } catch (e) {
    console.debug("Local batches save error:", e);
  }
}

export const batchesFirebaseService = {
  /* =====================================================
     LIST BATCHES
  ===================================================== */
  async list({ page = 1, limit = 50, search = "", status = "All" } = {}) {
    let all = getLocalBatches();

    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      if (!snap.empty) {
        const firestoreList = [];
        snap.forEach((d) => {
          firestoreList.push({ id: d.id, ...d.data() });
        });
        const map = new Map();
        all.forEach((b) => map.set(b.id, b));
        firestoreList.forEach((b) => map.set(b.id, b));
        all = Array.from(map.values());
        saveLocalBatches(all);
      }
    } catch (err) {
      console.debug("Firestore batches fetch fallback:", err.message);
    }

    // Refresh statuses dynamically
    all = all.map((b) => ({
      ...b,
      status: calculateBatchStatus(b.expiryDate),
    }));

    let filtered = all;
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (b) =>
          b.medicineName?.toLowerCase().includes(q) ||
          b.batchNumber?.toLowerCase().includes(q) ||
          b.supplier?.toLowerCase().includes(q)
      );
    }

    if (status && status !== "All") {
      filtered = filtered.filter(
        (b) => (b.status || "").toLowerCase() === status.toLowerCase()
      );
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      batches: paginated,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit) || 1,
    };
  },

  /* =====================================================
     GET SINGLE BATCH
  ===================================================== */
  async get(id) {
    const list = getLocalBatches();
    const found = list.find((b) => b.id === id || b.batchNumber === id);
    if (!found) throw new Error("Batch not found");
    return found;
  },

  /* =====================================================
     CREATE BATCH
  ===================================================== */
  async create(data) {
    const id = data.id || `batch-${Date.now().toString().slice(-6)}`;
    const status = calculateBatchStatus(data.expiryDate);
    const newBatch = {
      ...data,
      id,
      quantity: Number(data.quantity) || 0,
      status,
      createdAt: new Date().toISOString(),
    };

    const current = getLocalBatches();
    const updated = [newBatch, ...current.filter((b) => b.id !== id)];
    saveLocalBatches(updated);

    try {
      await setDoc(doc(db, COLLECTION_NAME, id), {
        ...newBatch,
        serverTimestamp: serverTimestamp(),
      });
    } catch (err) {
      console.debug("Firestore create batch fallback:", err.message);
    }

    return newBatch;
  },

  /* =====================================================
     UPDATE BATCH
  ===================================================== */
  async update(id, data) {
    const current = getLocalBatches();
    const index = current.findIndex((b) => b.id === id);
    const status = calculateBatchStatus(data.expiryDate);
    const updatedBatch = {
      ...(index >= 0 ? current[index] : {}),
      ...data,
      quantity: Number(data.quantity) || 0,
      status,
      id,
    };

    if (index >= 0) {
      current[index] = updatedBatch;
    } else {
      current.unshift(updatedBatch);
    }
    saveLocalBatches(current);

    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), {
        ...updatedBatch,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.debug("Firestore update batch fallback:", err.message);
    }

    return updatedBatch;
  },

  /* =====================================================
     DELETE BATCH
  ===================================================== */
  async delete(id) {
    const current = getLocalBatches();
    const updated = current.filter((b) => b.id !== id);
    saveLocalBatches(updated);

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (err) {
      console.debug("Firestore delete batch fallback:", err.message);
    }

    return { ok: true };
  },

  /* =====================================================
     STATS
  ===================================================== */
  async stats() {
    const list = getLocalBatches().map((b) => ({
      ...b,
      status: calculateBatchStatus(b.expiryDate),
    }));

    return {
      total: list.length,
      expiringSoon: list.filter((b) => b.status === "Expiring Soon").length,
      expired: list.filter((b) => b.status === "Expired").length,
      lowStock: list.filter((b) => Number(b.quantity) <= 20).length,
    };
  },
};
