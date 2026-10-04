import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getScopedKey, getUserCollectionRef, getUserDocRef } from "../utils/userScope";

const COLLECTION_NAME = "prescriptions";
const LOCAL_PRESCRIPTIONS_KEY = "meditrack_prescriptions";

function getLocalPrescriptions() {
  if (typeof window === "undefined") return [];
  try {
    const scopedKey = getScopedKey(LOCAL_PRESCRIPTIONS_KEY);
    const raw = localStorage.getItem(scopedKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPrescriptions(list) {
  if (typeof window === "undefined") return;
  try {
    const scopedKey = getScopedKey(LOCAL_PRESCRIPTIONS_KEY);
    localStorage.setItem(scopedKey, JSON.stringify(list));
    window.dispatchEvent(new Event("meditrack_prescriptions_updated"));
  } catch (e) {
    console.debug("Local prescriptions save error:", e);
  }
}

export const prescriptionsFirebaseService = {
  /* =====================================================
     LIST PRESCRIPTIONS
  ===================================================== */
  async list({ page = 1, limit = 50, search = "", status = "all" } = {}) {
    let all = getLocalPrescriptions();

    try {
      const snap = await getDocs(getUserCollectionRef(db, COLLECTION_NAME));
      if (!snap.empty) {
        const firestoreList = [];
        snap.forEach((d) => {
          firestoreList.push({ id: d.id, ...d.data() });
        });
        // Merge with local list by id
        const map = new Map();
        all.forEach((p) => map.set(p.id, p));
        firestoreList.forEach((p) => map.set(p.id, p));
        all = Array.from(map.values());
        saveLocalPrescriptions(all);
      }
    } catch (err) {
      console.debug("Firestore prescriptions fetch fallback:", err.message);
    }

    // Filter by search and status
    let filtered = all;
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.id?.toLowerCase().includes(q) ||
          p.patientName?.toLowerCase().includes(q) ||
          p.doctorName?.toLowerCase().includes(q) ||
          p.patient?.name?.toLowerCase().includes(q)
      );
    }
    if (status && status !== "all") {
      filtered = filtered.filter(
        (p) => (p.status || "pending").toLowerCase() === status.toLowerCase()
      );
    }

    // Sort descending by date/id
    filtered.sort((a, b) => {
      const da = new Date(a.date || a.createdAt || 0).getTime();
      const db = new Date(b.date || b.createdAt || 0).getTime();
      return db - da;
    });

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      prescriptions: paginated,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit) || 1,
    };
  },

  /* =====================================================
     GET SINGLE PRESCRIPTION
  ===================================================== */
  async get(id) {
    const local = getLocalPrescriptions().find((p) => p.id === id);
    try {
      const docRef = getUserDocRef(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
    } catch (err) {
      console.debug("Firestore get prescription fallback:", err.message);
    }
    return local || null;
  },

  /* =====================================================
     CREATE PRESCRIPTION
  ===================================================== */
  async create(data) {
    const rxId = data.id || `RX-${Date.now().toString().slice(-4)}`;
    const newRx = {
      ...data,
      id: rxId,
      status: data.status || "pending",
      date: data.date || new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };

    // Save locally
    const current = getLocalPrescriptions();
    const updated = [newRx, ...current.filter((p) => p.id !== rxId)];
    saveLocalPrescriptions(updated);

    // Save to Firestore in background
    try {
      await setDoc(getUserDocRef(db, COLLECTION_NAME, rxId), {
        ...newRx,
        serverTimestamp: serverTimestamp(),
      });
    } catch (err) {
      console.debug("Firestore create prescription fallback:", err.message);
    }

    return newRx;
  },

  /* =====================================================
     UPDATE PRESCRIPTION
  ===================================================== */
  async update(id, data) {
    const current = getLocalPrescriptions();
    const index = current.findIndex((p) => p.id === id);
    const updatedRx = { ...(index >= 0 ? current[index] : {}), ...data, id };

    if (index >= 0) {
      current[index] = updatedRx;
    } else {
      current.unshift(updatedRx);
    }
    saveLocalPrescriptions(current);

    try {
      await updateDoc(getUserDocRef(db, COLLECTION_NAME, id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.debug("Firestore update prescription fallback:", err.message);
    }

    return updatedRx;
  },

  /* =====================================================
     DELETE PRESCRIPTION
  ===================================================== */
  async delete(id) {
    const current = getLocalPrescriptions();
    const updated = current.filter((p) => p.id !== id);
    saveLocalPrescriptions(updated);

    try {
      await deleteDoc(getUserDocRef(db, COLLECTION_NAME, id));
    } catch (err) {
      console.debug("Firestore delete prescription fallback:", err.message);
    }

    return { ok: true };
  },

  /* =====================================================
     STATS
  ===================================================== */
  async stats() {
    const list = getLocalPrescriptions();
    return {
      total: list.length,
      dispensed: list.filter((p) => (p.status || "").toLowerCase() === "dispensed").length,
      pending: list.filter((p) => (p.status || "").toLowerCase() === "pending").length,
      cancelled: list.filter((p) => (p.status || "").toLowerCase() === "cancelled").length,
    };
  },
};
