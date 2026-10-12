import {
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getUserCollectionRef, getUserDocRef, getUserScopeId } from "../utils/userScope";

const COLLECTION_NAME = "suppliers";

let memorySuppliers = null;
let currentScopeId = null; // track whose data is cached
const firestoreOverrides = new Map();
const deletedCodes = new Set();
let isInitialized = false;

// Reset cache when user changes (different pharmacy account)
function ensureCorrectUserScope() {
  const scopeId = getUserScopeId();
  if (scopeId !== currentScopeId) {
    memorySuppliers = null;
    firestoreOverrides.clear();
    deletedCodes.clear();
    isInitialized = false;
    currentScopeId = scopeId;
  }
}

const DEFAULT_TOP_SUPPLIERS = [
  {
    code: "SUP-001",
    name: "Cipla Pharmaceuticals Ltd",
    contactPerson: "Ramesh Sharma",
    email: "orders@cipla.com",
    phone: "+91 22 2482 6000",
    city: "Mumbai",
    state: "Maharashtra",
    rating: 4.8,
    status: "active",
    deliveryTime: "24-48 hrs",
    productsCount: 142,
    totalOrders: 28,
    category: "Pharmaceutical",
  },
  {
    code: "SUP-002",
    name: "Sun Pharma Laboratories",
    contactPerson: "Dr. Ananya Roy",
    email: "distribution@sunpharma.com",
    phone: "+91 22 4324 4324",
    city: "Vadodara",
    state: "Gujarat",
    rating: 4.7,
    status: "active",
    deliveryTime: "24-72 hrs",
    productsCount: 98,
    totalOrders: 19,
    category: "Pharmaceutical",
  },
  {
    code: "SUP-003",
    name: "Dr. Reddy's Laboratories",
    contactPerson: "K. Sridhar",
    email: "supply@drreddys.com",
    phone: "+91 40 4900 2900",
    city: "Hyderabad",
    state: "Telangana",
    rating: 4.9,
    status: "active",
    deliveryTime: "24 hrs",
    productsCount: 115,
    totalOrders: 34,
    category: "Pharmaceutical",
  },
  {
    code: "SUP-004",
    name: "Alkem Laboratories",
    contactPerson: "Vikas Patel",
    email: "support@alkem.com",
    phone: "+91 22 3982 9999",
    city: "Mumbai",
    state: "Maharashtra",
    rating: 4.5,
    status: "active",
    deliveryTime: "48-72 hrs",
    productsCount: 64,
    totalOrders: 12,
    category: "Pharmaceutical",
  },
  {
    code: "SUP-005",
    name: "Torrent Pharmaceuticals",
    contactPerson: "Preeti Mehta",
    email: "institutional@torrentpharma.com",
    phone: "+91 79 2659 9000",
    city: "Ahmedabad",
    state: "Gujarat",
    rating: 4.6,
    status: "active",
    deliveryTime: "48 hrs",
    productsCount: 52,
    totalOrders: 15,
    category: "Pharmaceutical",
  },
];

async function loadMasterCatalog() {
  // Suppliers master catalog is used only as a SEARCH REFERENCE, not pre-loaded per user
  // Each user's Firestore subcollection holds THEIR own added suppliers (starts empty)
  if (memorySuppliers && memorySuppliers.length > 0) return memorySuppliers;
  try {
    const res = await fetch("/data/suppliersCatalog.json");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        memorySuppliers = data;
        return memorySuppliers;
      }
    }
  } catch (err) {
    console.debug("[suppliers] Catalog fetch fallback:", err);
  }
  // Return empty — no default suppliers for any user account
  memorySuppliers = [];
  return memorySuppliers;
}

async function syncFirestore() {
  try {
    const colRef = getUserCollectionRef(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    firestoreOverrides.clear();
    deletedCodes.clear();
    snap.forEach((d) => {
      const data = d.data();
      if (data._deleted) {
        deletedCodes.add(d.id);
      } else {
        firestoreOverrides.set(d.id, { ...data, code: data.code || d.id });
      }
    });
    isInitialized = true;
  } catch (err) {
    console.debug("[suppliers] Firestore sync note:", err?.message || err);
    isInitialized = true;
  }
}

async function getAllSuppliers() {
  ensureCorrectUserScope();
  if (!isInitialized) {
    await syncFirestore();
  }

  // Return only this user's created/saved suppliers
  const userSuppliers = [];
  firestoreOverrides.forEach((val) => {
    if (!deletedCodes.has(val.code)) {
      userSuppliers.push(val);
    }
  });

  return userSuppliers;
}

export const suppliersFirebaseService = {
  async list({ page = 1, limit = 50, search = "", status = "all" } = {}) {
    const all = await getAllSuppliers();
    let filtered = all;

    if (search) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.code && s.code.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.city && s.city.toLowerCase().includes(q)) ||
          (s.state && s.state.toLowerCase().includes(q))
      );
    }

    if (status !== "all") {
      filtered = filtered.filter((s) => s.status === status);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return {
      suppliers: paged,
      total,
      page,
      totalPages,
    };
  },

  async stats() {
    try {
      const all = await getAllSuppliers();
      const total = all.length;
      const active = all.filter((s) => s.status === "active").length;
      const pending = all.filter((s) => s.status === "pending").length;
      const totalProducts = all.reduce((sum, s) => sum + (Number(s.productsCount) || 0), 0);
      return { total, active, pending, totalProducts };
    } catch {
      return { total: 0, active: 0, pending: 0, totalProducts: 0 };
    }
  },

  async create(supplier) {
    const code = String(supplier.code || `SUP-${Date.now().toString().slice(-4)}`);
    const docRef = getUserDocRef(db, COLLECTION_NAME, code);
    const payload = {
      ...supplier,
      code,
      status: supplier.status || "active",
      productsCount: Number(supplier.productsCount || 0),
      medicineIds: Array.isArray(supplier.medicineIds) ? supplier.medicineIds : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(docRef, payload, { merge: true });
    } catch (e) {
      console.warn("Firestore save failed, preserving in session cache:", e);
    }
    firestoreOverrides.set(code, payload);
    return payload;
  },

  async update(code, updates) {
    const docRef = getUserDocRef(db, COLLECTION_NAME, String(code));
    const merged = { ...updates, updatedAt: serverTimestamp() };
    try {
      await setDoc(docRef, merged, { merge: true });
    } catch (e) {
      console.warn("Firestore update note:", e);
    }
    const existing = firestoreOverrides.get(code) || {};
    firestoreOverrides.set(code, { ...existing, ...updates });
    return { ok: true, code };
  },

  async delete(code) {
    const docRef = getUserDocRef(db, COLLECTION_NAME, String(code));
    try {
      await setDoc(docRef, { _deleted: true, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn("Firestore delete note:", e);
    }
    deletedCodes.add(code);
    firestoreOverrides.delete(code);
    return { ok: true, code };
  },

  // Automatically register or increment supplier when a medicine is added
  async syncWithMedicineAdded(medicine) {
    if (!medicine) return null;
    const rawName = String(
      medicine.manufacturer ||
      medicine.supplierName ||
      medicine.supplier ||
      ""
    ).trim();

    if (!rawName || rawName === "In-House" || rawName.toLowerCase() === "standard pharma") {
      return null;
    }

    await getAllSuppliers();

    // Check if supplier already exists (case-insensitive name check)
    const existing = Array.from(firestoreOverrides.values()).find(
      (s) =>
        !deletedCodes.has(s.code) &&
        s.name &&
        s.name.toLowerCase().trim() === rawName.toLowerCase()
    );

    const medId = String(medicine.id || medicine.name || Date.now());

    if (existing) {
      const currentMedIds = Array.isArray(existing.medicineIds) ? existing.medicineIds : [];
      if (!currentMedIds.includes(medId)) {
        const nextIds = [...currentMedIds, medId];
        const nextProductsCount = (Number(existing.productsCount) || 0) + 1;
        await this.update(existing.code, {
          productsCount: nextProductsCount,
          medicineIds: nextIds,
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("meditrack_suppliers_updated"));
        }
      }
      return existing;
    }

    // Try finding template details from standard pharma catalog
    const template = DEFAULT_TOP_SUPPLIERS.find(
      (t) =>
        t.name.toLowerCase().includes(rawName.toLowerCase()) ||
        rawName.toLowerCase().includes(t.name.toLowerCase())
    );

    const cleanSlug = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const code = template?.code || `SUP-${Date.now().toString().slice(-4)}`;

    const newSupplier = {
      code,
      name: rawName,
      contactPerson: template?.contactPerson || `${rawName} Distribution Rep`,
      email: template?.email || `orders@${cleanSlug || "pharma"}.com`,
      phone: template?.phone || "+91 22 2482 6000",
      city: template?.city || "Mumbai",
      state: template?.state || "Maharashtra",
      rating: template?.rating || 4.8,
      status: "active",
      deliveryTime: template?.deliveryTime || "24-48 hrs",
      productsCount: 1,
      totalOrders: 1,
      medicineIds: [medId],
      category: template?.category || "Pharmaceutical",
      autoCreated: true,
    };

    const created = await this.create(newSupplier);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("meditrack_suppliers_updated"));
    }
    return created;
  },

  // Automatically delete supplier if no remaining medicines are associated with them
  async syncWithMedicineDeleted(deletedMedicine, remainingMedicines = []) {
    if (!deletedMedicine) return;
    const rawName = String(
      deletedMedicine.manufacturer ||
      deletedMedicine.supplierName ||
      deletedMedicine.supplier ||
      ""
    ).trim();
    if (!rawName) return;

    await getAllSuppliers();

    const existing = Array.from(firestoreOverrides.values()).find(
      (s) =>
        !deletedCodes.has(s.code) &&
        s.name &&
        s.name.toLowerCase().trim() === rawName.toLowerCase()
    );

    if (!existing) return;

    // Check if ANY remaining medicine in inventory still has this supplier
    const stillHasMedicines = (remainingMedicines || []).some((m) => {
      const medSupplier = String(
        m.manufacturer ||
        m.supplierName ||
        m.supplier ||
        ""
      ).trim();
      return medSupplier && medSupplier.toLowerCase() === rawName.toLowerCase();
    });

    if (!stillHasMedicines) {
      // No other medicines from this supplier -> Delete supplier automatically
      await this.delete(existing.code);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("meditrack_suppliers_updated"));
      }
    }
    // Per user instruction: "products la -1 mattum theva illa"
    // If other medicines still remain, we do NOT decrement productsCount. The supplier remains intact.
  },

  async seedIfEmpty() {
    return true;
  },

  // Search national catalog (not pre-loaded, just for reference/search)
  async searchNationalCatalog(query = "") {
    const q = query.toLowerCase().trim();
    if (!q || q.length < 2) return [];
    const master = await loadMasterCatalog();
    return master
      .filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.city && s.city.toLowerCase().includes(q))
      )
      .slice(0, 10);
  },
};

export default suppliersFirebaseService;
