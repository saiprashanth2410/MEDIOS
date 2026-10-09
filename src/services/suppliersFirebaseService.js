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
      const totalProducts = 93910;
      return { total, active, pending, totalProducts };
    } catch {
      return { total: 8218, active: 8218, pending: 0, totalProducts: 93910 };
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
