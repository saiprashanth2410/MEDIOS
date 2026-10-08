import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getScopedKey, getUserCollectionRef, getUserDocRef } from "../utils/userScope";

const COLLECTION_NAME = "pharmacists";
const LOCAL_KEY = "meditrack_pharmacists";

function getActiveLoggedInPharmacist() {
  if (typeof window !== "undefined") {
    try {
      const rawUser = localStorage.getItem("meditrack_user");
      const pharmDetails = localStorage.getItem("meditrack_pharmacy_details");
      const user = rawUser ? JSON.parse(rawUser) : null;
      const details = pharmDetails ? JSON.parse(pharmDetails) : null;

      if (user?.name || details?.license) {
        return [
          {
            id: "PH-001",
            name: user?.name || "Pharmacist",
            email: user?.email || "",
            phone: user?.phone || "",
            license: details?.license || user?.license || "Reg. Pharmacist",
            role: user?.role || "Chief Pharmacist",
            shift: "General Shift",
            status: "active",
            joinDate: user?.joinDate || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          },
        ];
      }
    } catch (_) {}
  }
  return [];
}

function getLocalPharmacists() {
  if (typeof window === "undefined") return getActiveLoggedInPharmacist();
  const scopedKey = getScopedKey(LOCAL_KEY);
  try {
    const raw = localStorage.getItem(scopedKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  const fallback = getActiveLoggedInPharmacist();
  try {
    localStorage.setItem(scopedKey, JSON.stringify(fallback));
  } catch (_) {}
  return fallback;
}

function saveLocalPharmacists(list) {
  if (typeof window === "undefined") return;
  const scopedKey = getScopedKey(LOCAL_KEY);
  try {
    localStorage.setItem(scopedKey, JSON.stringify(list));
    window.dispatchEvent(new Event("meditrack_pharmacists_updated"));
  } catch (e) {
    console.debug("Local pharmacists save error:", e);
  }
}

export const pharmacistsFirebaseService = {
  async list() {
    let local = getLocalPharmacists();
    try {
      const colRef = getUserCollectionRef(db, COLLECTION_NAME);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const firestoreItems = [];
        snap.forEach((d) => firestoreItems.push({ id: d.id, ...d.data() }));
        const map = new Map();
        local.forEach((p) => map.set(p.id, p));
        firestoreItems.forEach((p) => map.set(p.id, p));
        local = Array.from(map.values());
        saveLocalPharmacists(local);
      }
    } catch (err) {
      console.debug("[pharmacistsFirebase] list fallback:", err.message);
    }
    return local;
  },

  async create(pharmacist) {
    const id = String(pharmacist.id || `PH-${Date.now().toString().slice(-4)}`);
    const payload = {
      ...pharmacist,
      id,
      status: pharmacist.status || "active",
      createdAt: new Date().toISOString(),
    };

    const current = getLocalPharmacists();
    const updated = [payload, ...current.filter((p) => p.id !== id)];
    saveLocalPharmacists(updated);

    try {
      const docRef = getUserDocRef(db, COLLECTION_NAME, id);
      await setDoc(docRef, {
        ...payload,
        serverTimestamp: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.debug("[pharmacistsFirebase] save note:", e.message);
    }

    return payload;
  },

  async update(id, updates) {
    const current = getLocalPharmacists();
    const index = current.findIndex((p) => p.id === id);
    const updated = { ...(index >= 0 ? current[index] : {}), ...updates, id };

    if (index >= 0) {
      current[index] = updated;
    } else {
      current.unshift(updated);
    }
    saveLocalPharmacists(current);

    try {
      const docRef = getUserDocRef(db, COLLECTION_NAME, String(id));
      await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    } catch (e) {
      console.debug("[pharmacistsFirebase] update note:", e.message);
    }
    return { ok: true, id };
  },

  async delete(id) {
    const current = getLocalPharmacists();
    const updated = current.filter((p) => p.id !== id);
    saveLocalPharmacists(updated);

    try {
      const docRef = getUserDocRef(db, COLLECTION_NAME, String(id));
      await deleteDoc(docRef);
    } catch (e) {
      console.debug("[pharmacistsFirebase] delete note:", e.message);
    }
    return { ok: true, id };
  },

  async stats() {
    const list = await this.list();
    return {
      total: list.length,
      active: list.filter((p) => p.status === "active").length,
      onLeave: list.filter((p) => p.status === "on-leave").length,
      inactive: list.filter((p) => p.status === "inactive").length,
    };
  },

  async get(id) {
    const list = await this.list();
    const found = list.find((p) => p.id === id);
    if (!found) throw new Error("Pharmacist not found");
    return found;
  },
};

export default pharmacistsFirebaseService;
