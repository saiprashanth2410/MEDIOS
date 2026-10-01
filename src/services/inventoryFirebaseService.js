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
import { MEDICINES } from "../data/medicines";

const COLLECTION_NAME = "medicines";

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
          console.warn("[inventoryFirebase] Realtime listener error:", err.message);
          if (onError) onError(err);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn("[inventoryFirebase] Setup listener failed:", err);
      if (onError) onError(err);
      return () => {};
    }
  },

  /* =====================================================
     FETCH ALL MEDICINES ONCE
  ===================================================== */
  async getMedicines() {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(colRef);
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      return items;
    } catch (err) {
      console.error("[inventoryFirebase] getMedicines error:", err);
      return [];
    }
  },

  /* =====================================================
     ADD MEDICINE
  ===================================================== */
  async addMedicine(medicine) {
    try {
      const id = String(medicine.id || medicine.code || `MED-${Date.now().toString().slice(-4)}`);
      const docRef = doc(db, COLLECTION_NAME, id);

      const payload = {
        name: String(medicine.name || medicine.fullName || "Unnamed Medicine").slice(0, 100),
        fullName: String(medicine.fullName || medicine.name || "").slice(0, 150),
        generic: String(medicine.generic || medicine.composition || "General Formulation").slice(0, 150),
        manufacturer: String(medicine.manufacturer || medicine.supplierName || "In-House").slice(0, 100),
        category: String(medicine.category || "General").slice(0, 50),
        stock: Number(medicine.stock ?? 100),
        price: Number(medicine.price ?? medicine.sellingPrice ?? 50),
        batch: String(medicine.batch || "BATCH-01").slice(0, 50),
        rack: String(medicine.rack || "R-1").slice(0, 50),
        schedule: String(medicine.schedule || "OTC").slice(0, 20),
        expiry: String(medicine.expiry || "2027-12-31").slice(0, 30),
        isCustom: Boolean(medicine.isCustom),
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, payload, { merge: true });
      return { ok: true, id, data: payload };
    } catch (err) {
      console.error("[inventoryFirebase] addMedicine error:", err);
      throw err;
    }
  },

  /* =====================================================
     UPDATE MEDICINE / STOCK
  ===================================================== */
  async updateMedicine(id, updates) {
    try {
      const docRef = doc(db, COLLECTION_NAME, String(id));
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

      await updateDoc(docRef, cleanUpdates);
      return { ok: true, id };
    } catch (err) {
      console.error("[inventoryFirebase] updateMedicine error:", err);
      throw err;
    }
  },

  /* =====================================================
     DELETE MEDICINE
  ===================================================== */
  async deleteMedicine(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, String(id));
      await deleteDoc(docRef);
      return { ok: true, id };
    } catch (err) {
      console.error("[inventoryFirebase] deleteMedicine error:", err);
      throw err;
    }
  },

  /* =====================================================
     SEED INITIAL CATALOG IF FIRESTORE IS EMPTY
  ===================================================== */
  async seedCatalogIfEmpty() {
    try {
      const existing = await this.getMedicines();
      if (existing.length === 0 && MEDICINES.length > 0) {
        console.log("[inventoryFirebase] Seeding initial medical catalog to Firestore...");
        for (const med of MEDICINES) {
          await this.addMedicine(med);
        }
        console.log(`[inventoryFirebase] Successfully seeded ${MEDICINES.length} medicines.`);
      }
    } catch (err) {
      console.warn("[inventoryFirebase] Catalog seed notice:", err.message);
    }
  },
};

export default inventoryFirebaseService;
