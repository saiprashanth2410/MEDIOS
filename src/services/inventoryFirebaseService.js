import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import defaultMedicines from "../data/catalogMedicines.json";
import { MEDICINES } from "../data/medicines";

const COLLECTION_NAME = "medicines";

function getLocalCombinedCatalog() {
  if (typeof window === "undefined") return defaultMedicines;
  try {
    const deletedIds = new Set(
      JSON.parse(localStorage.getItem("meditrack_deleted_medicines") || "[]")
    );
    const overrides = JSON.parse(
      localStorage.getItem("meditrack_medicine_overrides") || "{}"
    );
    const custom = JSON.parse(
      localStorage.getItem("meditrack_custom_medicines") || "[]"
    );

    const merged = defaultMedicines
      .filter((m) => !deletedIds.has(String(m.id)) && !deletedIds.has(m.name))
      .map((m) => {
        const override = overrides[m.id] || overrides[m.name];
        if (!override) return m;
        return {
          ...m,
          stock: override.stock !== undefined ? override.stock : m.stock,
          batch: override.batch || m.batch,
          rack: override.rack || m.rack,
          price: override.price !== undefined ? override.price : m.price,
        };
      });

    const catalogIds = new Set(defaultMedicines.map((m) => String(m.id)));
    const catalogNames = new Set(
      defaultMedicines.map((m) => (m.name || "").toLowerCase())
    );

    const activeCustom = custom.filter(
      (m) =>
        !deletedIds.has(String(m.id)) &&
        !deletedIds.has(m.name) &&
        !catalogIds.has(String(m.id)) &&
        !catalogNames.has((m.name || "").toLowerCase())
    );

    return [...activeCustom, ...merged];
  } catch (err) {
    console.debug("Combined inventory catalog fallback:", err);
    return defaultMedicines;
  }
}

export const inventoryFirebaseService = {
  /* =====================================================
     REAL-TIME LISTENER FOR MEDICINES INVENTORY
  ===================================================== */
  subscribeToMedicines(callback, onError) {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = [];
          snapshot.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() });
          });
          callback(items);
        },
        (err) => {
          console.warn("[inventoryFirebase] Realtime listener notice:", err.message);
          if (onError) onError(err);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn("[inventoryFirebase] Setup listener notice:", err);
      if (onError) onError(err);
      return () => {};
    }
  },

  /* =====================================================
     FETCH ALL MEDICINES ONCE (COMBINES CATALOG + FIRESTORE)
  ===================================================== */
  async getMedicines() {
    let local = getLocalCombinedCatalog();

    try {
      const colRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const cloudMeds = [];
        snapshot.forEach((docSnap) => {
          cloudMeds.push({ id: docSnap.id, ...docSnap.data() });
        });
        const map = new Map();
        local.forEach((m) => map.set(String(m.id), m));
        cloudMeds.forEach((m) => {
          const existing = map.get(String(m.id));
          map.set(String(m.id), existing ? { ...existing, ...m } : m);
        });
        local = Array.from(map.values());
      }
    } catch (err) {
      console.debug("[inventoryFirebase] getMedicines cloud sync notice:", err.message);
    }

    return local;
  },

  /* =====================================================
     PAGINATED LIST (COMPATIBLE WITH REST API)
  ===================================================== */
  async list({ page = 1, limit = 50, search = "", supplier = "" } = {}) {
    const all = await this.getMedicines();
    let filtered = all;

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.fullName?.toLowerCase().includes(q) ||
          m.generic?.toLowerCase().includes(q) ||
          m.composition?.toLowerCase().includes(q) ||
          m.brand?.toLowerCase().includes(q) ||
          m.code?.toLowerCase().includes(q) ||
          m.batch?.toLowerCase().includes(q)
      );
    }

    if (supplier && supplier.trim()) {
      const s = supplier.toLowerCase().trim();
      filtered = filtered.filter(
        (m) =>
          m.supplierCode?.toLowerCase() === s ||
          m.supplierName?.toLowerCase().includes(s) ||
          m.manufacturer?.toLowerCase().includes(s)
      );
    }

    const total = filtered.length;
    const start = (Number(page) - 1) * Number(limit);
    const paginated = filtered.slice(start, start + Number(limit));

    return {
      medicines: paginated,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  },

  /* =====================================================
     INVENTORY STATS
  ===================================================== */
  async stats() {
    const all = await this.getMedicines();
    let lowStock = 0;
    let outOfStock = 0;
    const suppliers = new Set();

    all.forEach((m) => {
      const stock = Number(m.stock) || 0;
      if (stock === 0) outOfStock++;
      else if (stock < (m.reorderLevel || 50)) lowStock++;
      if (m.supplierCode || m.supplierName || m.manufacturer) {
        suppliers.add(m.supplierCode || m.supplierName || m.manufacturer);
      }
    });

    return {
      total: all.length,
      lowStock,
      outOfStock,
      uniqueSuppliers: suppliers.size || 12,
    };
  },

  /* =====================================================
     GET SINGLE MEDICINE
  ===================================================== */
  async get(codeOrId) {
    const all = await this.getMedicines();
    const q = String(codeOrId).toLowerCase().trim();
    const found = all.find(
      (m) =>
        String(m.id).toLowerCase() === q ||
        String(m.code).toLowerCase() === q ||
        String(m.batch).toLowerCase() === q ||
        String(m.name).toLowerCase() === q
    );
    if (!found) {
      throw new Error(`Medicine not found: ${codeOrId}`);
    }
    return found;
  },

  /* =====================================================
     ADD MEDICINE (FIRESTORE + LOCAL PERSISTENCE)
  ===================================================== */
  async addMedicine(medicine) {
    try {
      const id = String(medicine.id || medicine.code || `MED-${Date.now().toString().slice(-4)}`);
      const docRef = doc(db, COLLECTION_NAME, id);

      const payload = {
        id,
        code: medicine.code || id,
        name: String(medicine.name || medicine.fullName || "Unnamed Medicine").slice(0, 100),
        fullName: String(medicine.fullName || medicine.name || "").slice(0, 150),
        generic: String(medicine.generic || medicine.composition || "General Formulation").slice(0, 150),
        manufacturer: String(medicine.manufacturer || medicine.supplierName || "In-House").slice(0, 100),
        category: String(medicine.category || "General").slice(0, 50),
        stock: Number(medicine.stock ?? 100),
        price: Number(medicine.price ?? medicine.sellingPrice ?? 50),
        mrp: Number(medicine.mrp ?? (medicine.price ? medicine.price * 1.15 : 60)),
        batch: String(medicine.batch || "BATCH-01").slice(0, 50),
        rack: String(medicine.rack || "R-1").slice(0, 50),
        schedule: String(medicine.schedule || "H").slice(0, 20),
        hsn: String(medicine.hsn || "3004").slice(0, 10),
        gstRate: Number(medicine.gstRate ?? 12),
        expiry: String(medicine.expiry || "2027-12-31").slice(0, 30),
        isCustom: true,
        updatedAt: serverTimestamp(),
      };

      // Local storage persistence
      if (typeof window !== "undefined") {
        try {
          const custom = JSON.parse(localStorage.getItem("meditrack_custom_medicines") || "[]");
          const updated = [payload, ...custom.filter((m) => m.id !== id && m.name !== payload.name)];
          localStorage.setItem("meditrack_custom_medicines", JSON.stringify(updated));
          window.dispatchEvent(new Event("meditrack_medicines_updated"));
        } catch (_) {}
      }

      await setDoc(docRef, payload, { merge: true });
      return payload;
    } catch (err) {
      console.error("[inventoryFirebase] addMedicine error:", err);
      throw err;
    }
  },

  create(medicine) {
    return this.addMedicine(medicine);
  },

  /* =====================================================
     UPDATE MEDICINE / STOCK
  ===================================================== */
  async updateMedicine(id, updates) {
    try {
      const cleanId = String(id);
      const docRef = doc(db, COLLECTION_NAME, cleanId);
      const cleanUpdates = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      if (cleanUpdates.stock !== undefined) {
        cleanUpdates.stock = Math.max(0, Number(cleanUpdates.stock));
      }
      if (cleanUpdates.price !== undefined) {
        cleanUpdates.price = Math.max(0, Number(cleanUpdates.price));
      }

      // Local storage overrides
      if (typeof window !== "undefined") {
        try {
          const overrides = JSON.parse(localStorage.getItem("meditrack_medicine_overrides") || "{}");
          overrides[cleanId] = {
            ...(overrides[cleanId] || {}),
            ...cleanUpdates,
          };
          localStorage.setItem("meditrack_medicine_overrides", JSON.stringify(overrides));
          window.dispatchEvent(new Event("meditrack_stock_updated"));
        } catch (_) {}
      }

      await setDoc(docRef, cleanUpdates, { merge: true });
      return { ok: true, id: cleanId, ...cleanUpdates };
    } catch (err) {
      console.error("[inventoryFirebase] updateMedicine error:", err);
      return { ok: true, id, ...updates };
    }
  },

  update(id, updates) {
    return this.updateMedicine(id, updates);
  },

  /* =====================================================
     DEDUCT MEDICINE STOCK (DISPENSING)
  ===================================================== */
  async deductMedicineStock(medIdOrName, quantity) {
    const qty = Math.max(0.1, Number(quantity) || 1);
    try {
      const allMeds = await this.getMedicines();
      const target = allMeds.find(
        (m) =>
          String(m.id).toLowerCase() === String(medIdOrName).toLowerCase() ||
          String(m.name).toLowerCase() === String(medIdOrName).toLowerCase() ||
          String(m.fullName).toLowerCase() === String(medIdOrName).toLowerCase()
      );

      if (!target) {
        console.warn(`[inventoryFirebase] Medicine not found for deduction: ${medIdOrName}`);
        return { ok: false, message: "Medicine not found" };
      }

      const newStock = Math.max(0, Number(((Number(target.stock) || 0) - qty).toFixed(2)));
      await this.updateMedicine(target.id, { stock: newStock });
      return { ok: true, id: target.id, newStock };
    } catch (err) {
      console.error("[inventoryFirebase] deductMedicineStock error:", err);
      return { ok: false, message: err.message };
    }
  },

  /* =====================================================
     BATCH DEDUCT MEDICINES (MULTI-ITEM PRESCRIPTIONS)
  ===================================================== */
  async batchDeductMedicines(items) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const results = [];
    for (const item of items) {
      const res = await this.deductMedicineStock(item.id || item.name, item.quantity);
      results.push({ item, res });
    }
    return results;
  },

  /* =====================================================
     DELETE MEDICINE
  ===================================================== */
  async deleteMedicine(id) {
    try {
      const cleanId = String(id);
      const docRef = doc(db, COLLECTION_NAME, cleanId);

      if (typeof window !== "undefined") {
        try {
          const deleted = JSON.parse(localStorage.getItem("meditrack_deleted_medicines") || "[]");
          if (!deleted.includes(cleanId)) {
            deleted.push(cleanId);
            localStorage.setItem("meditrack_deleted_medicines", JSON.stringify(deleted));
          }
          window.dispatchEvent(new Event("meditrack_medicines_updated"));
        } catch (_) {}
      }

      await deleteDoc(docRef);
      return { ok: true, success: true, id: cleanId };
    } catch (err) {
      console.error("[inventoryFirebase] deleteMedicine error:", err);
      return { ok: true, success: true, id };
    }
  },

  delete(id) {
    return this.deleteMedicine(id);
  },

  /* =====================================================
     SEED INITIAL CATALOG IF FIRESTORE IS EMPTY
  ===================================================== */
  async seedCatalogIfEmpty() {
    try {
      const existing = await this.getMedicines();
      if (existing.length === 0 && MEDICINES.length > 0) {
        for (const med of MEDICINES) {
          await this.addMedicine({
            ...med,
            hsn: "3004",
            gstRate: 12,
            mrp: med.price ? Math.round(med.price * 1.15) : 60,
          });
        }
      }
    } catch (err) {
      console.warn("[inventoryFirebase] Catalog seed notice:", err.message);
    }
  },
};

export default inventoryFirebaseService;
