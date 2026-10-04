import axios from "axios";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../config/firebase";

const LOCAL_KEY = "meditrack_recycle_bin";
const FIRESTORE_COLLECTION = "recycle_bin";
const API_URL = import.meta.env.VITE_API_URL || "/api";

function getLocalRecycleBin() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRecycleBin(items) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("meditrack_recycle_bin_updated", { detail: items }));
  } catch (err) {
    console.debug("[recycleBinService] Local save note:", err);
  }
}

export const recycleBinService = {
  /**
   * Get all deleted items sorted date-wise (newest first)
   */
  async list() {
    // 1. Try backend server
    try {
      const res = await axios.get(`${API_URL}/recycle-bin`, { timeout: 3500 });
      if (res.data?.items && Array.isArray(res.data.items)) {
        saveLocalRecycleBin(res.data.items);
        return res.data.items;
      }
    } catch {
      // Backend offline or running purely on frontend / Vercel
    }

    // 2. Try Cloud Firestore
    try {
      if (db) {
        const q = query(
          collection(db, FIRESTORE_COLLECTION),
          orderBy("deletedAt", "desc"),
          limit(100)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          saveLocalRecycleBin(items);
          return items;
        }
      }
    } catch (fbErr) {
      console.debug("[recycleBinService] Firestore read fallback:", fbErr.message);
    }

    // 3. Fallback to LocalStorage
    return getLocalRecycleBin();
  },

  /**
   * Move an item to the recycle bin (Soft Delete + Audit Log)
   */
  async moveToTrash(item, reason = "Removed from active inventory", deletedBy = "Pharmacist Admin") {
    if (!item) return null;

    const trashId = `trash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();

    const trashEntry = {
      id: trashId,
      originalId: item.id || item._id || `item-${Date.now()}`,
      itemType: item.itemType || "expiry_item",
      medicineName: item.medicineName || item.name || "Unknown Medicine",
      batchNumber: item.batchNumber || item.batch || "N/A",
      quantity: Number(item.quantity || item.stock) || 0,
      price: Number(item.price) || 0,
      atRiskValue: (Number(item.quantity || item.stock) || 0) * (Number(item.price) || 0),
      expiryDate: item.expiryDate || item.expiry || "",
      daysLeft: typeof item.daysLeft === "number" ? item.daysLeft : 0,
      supplier: item.supplier || item.manufacturer || "Standard Supplier",
      location: item.location || item.rack || "Shelf",
      status: item.status || "Expired",
      deletedAt: now.toISOString(),
      deletedAtFormatted: now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      deletedBy,
      deletionReason: reason,
      originalItem: { ...item },
    };

    // 1. Save locally first (instant UI responsiveness)
    const local = getLocalRecycleBin();
    const updated = [trashEntry, ...local.filter((t) => t.id !== trashId)].slice(0, 100);
    saveLocalRecycleBin(updated);

    // 2. Persist to Backend Server
    try {
      axios.post(`${API_URL}/recycle-bin`, trashEntry, { timeout: 3500 }).catch(() => {});
    } catch {
      // safe fallback
    }

    // 3. Persist to Cloud Firestore
    try {
      if (db) {
        setDoc(doc(db, FIRESTORE_COLLECTION, trashId), trashEntry).catch(() => {});
      }
    } catch (fbErr) {
      console.debug("[recycleBinService] Firestore write note:", fbErr.message);
    }

    return trashEntry;
  },

  /**
   * Restore an item back to active inventory / expiry list
   */
  async restore(trashId) {
    const local = getLocalRecycleBin();
    const target = local.find((t) => t.id === trashId || t._id === trashId);
    const restoredItem = target?.originalItem || target;

    // 1. Remove from local storage
    const remaining = local.filter((t) => t.id !== trashId && t._id !== trashId);
    saveLocalRecycleBin(remaining);

    // 2. Remove from Backend Server
    try {
      axios.post(`${API_URL}/recycle-bin/${trashId}/restore`, {}, { timeout: 3500 }).catch(() => {});
    } catch {
      // safe fallback
    }

    // 3. Remove from Cloud Firestore
    try {
      if (db) {
        deleteDoc(doc(db, FIRESTORE_COLLECTION, trashId)).catch(() => {});
      }
    } catch {
      // safe fallback
    }

    return restoredItem;
  },

  /**
   * Permanently delete an item from the recycle bin
   */
  async deleteForever(trashId) {
    const local = getLocalRecycleBin();
    const remaining = local.filter((t) => t.id !== trashId && t._id !== trashId);
    saveLocalRecycleBin(remaining);

    try {
      axios.delete(`${API_URL}/recycle-bin/${trashId}`, { timeout: 3500 }).catch(() => {});
    } catch {
      // safe fallback
    }

    try {
      if (db) {
        deleteDoc(doc(db, FIRESTORE_COLLECTION, trashId)).catch(() => {});
      }
    } catch {
      // safe fallback
    }

    return true;
  },

  /**
   * Empty the entire recycle bin
   */
  async emptyTrash() {
    saveLocalRecycleBin([]);

    try {
      axios.delete(`${API_URL}/recycle-bin`, { timeout: 3500 }).catch(() => {});
    } catch {
      // safe fallback
    }

    try {
      if (db) {
        const q = query(collection(db, FIRESTORE_COLLECTION), limit(100));
        const snap = await getDocs(q);
        snap.forEach((d) => deleteDoc(d.ref).catch(() => {}));
      }
    } catch {
      // safe fallback
    }

    return true;
  },
};
