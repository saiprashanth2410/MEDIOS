import {
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getScopedKey, getUserCollectionRef, getUserDocRef } from "../utils/userScope";
import { addExpiryItem } from "../utils/expiryStore";

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

function getLocalBatches() {
  if (typeof window === "undefined") return [];
  const scopedKey = getScopedKey(LOCAL_BATCHES_KEY);
  try {
    const raw = localStorage.getItem(scopedKey);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  // Real user accounts start with 0 batches!
  try {
    localStorage.setItem(scopedKey, JSON.stringify([]));
  } catch {}
  return [];
}

function saveLocalBatches(list) {
  if (typeof window === "undefined") return;
  const scopedKey = getScopedKey(LOCAL_BATCHES_KEY);
  try {
    localStorage.setItem(scopedKey, JSON.stringify(list));
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
      const snap = await getDocs(getUserCollectionRef(db, COLLECTION_NAME));
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

    // Automatically sync with FEFO Expiry Tracking
    if (newBatch.expiryDate) {
      try {
        addExpiryItem({
          id: newBatch.id,
          medicineName: newBatch.medicineName,
          batchNumber: newBatch.batchNumber,
          quantity: newBatch.quantity,
          price: data.price || 50,
          expiryDate: newBatch.expiryDate,
          supplier: newBatch.supplier,
          location: data.location || "Shelf A-1",
        });
      } catch (err) {
        console.debug("Expiry auto-sync note:", err);
      }
    }

    try {
      await setDoc(getUserDocRef(db, COLLECTION_NAME, id), {
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
      await updateDoc(getUserDocRef(db, COLLECTION_NAME, id), {
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
      await deleteDoc(getUserDocRef(db, COLLECTION_NAME, id));
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
