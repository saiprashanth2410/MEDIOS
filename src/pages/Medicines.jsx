import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Pill,
  Search,
  Plus,
  AlertTriangle,
  CalendarClock,
  Package,
  MapPin,
  Building2,
  Filter,
  LayoutGrid,
  List as ListIcon,
  X,
  Edit3,
  Trash2,
  FileUp,
} from "lucide-react";
import { detectCategoryLocal } from "../utils/localCategoryRules";
import { detectCategoryWithAI } from "../utils/aiCategoryDetector";
import AddMedicineModal from "../components/dashboard/AddMedicineModal";
import EditStockModal from "../components/medicines/EditStockModal";
import Navbar from "../components/dashboard/Navbar";
import { medicinesAPI } from "../services/api";
import { inventoryFirebaseService } from "../services/inventoryFirebaseService";
import { recycleBinService } from "../services/recycleBinService";
import { getScopedKey } from "../utils/userScope";
import { addExpiryItem } from "../utils/expiryStore";
import { suppliersFirebaseService } from "../services/suppliersFirebaseService";

/* =====================================================
   CONSTANTS
===================================================== */

const CATEGORIES = [
  "All",
  "Antibiotic",
  "Analgesic",
  "Antidiabetic",
  "Antihistamine",
  "Antiseptic",
  "Cardiac",
  "Other",
];

const DEFAULT_EXPIRY = "2027-12-31";

/* =====================================================
   INITIAL MEDICINES (PER-USER ISOLATED LOAD)
===================================================== */

function getInitialMedicines() {
  if (typeof window === "undefined") return [];
  try {
    const deletedIds = new Set(
      JSON.parse(localStorage.getItem(getScopedKey("meditrack_deleted_medicines")) || "[]")
    );
    const overrides = JSON.parse(
      localStorage.getItem(getScopedKey("meditrack_medicine_overrides")) || "{}"
    );
    const custom = JSON.parse(
      localStorage.getItem(getScopedKey("meditrack_custom_medicines")) || "[]"
    );

    // Each user account starts with only their own added medicines
    return custom
      .filter((m) => !deletedIds.has(String(m.id)) && !deletedIds.has(m.name))
      .map((m) => {
        const override = overrides[m.id] || overrides[m.name];
        return override ? { ...m, ...override } : m;
      });
  } catch (err) {
    console.debug("Initial medicines load fallback:", err);
    return [];
  }
}



/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function Medicines() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [medicines, setMedicines] = useState(getInitialMedicines);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [addModalTab, setAddModalTab] = useState("manual");
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  const [filterType, setFilterType] = useState(() => {
    const f = searchParams.get("filter");
    if (f === "low_stock" || f === "lowStock" || f === "low-stock") return "low_stock";
    if (f === "expiring" || f === "expired") return "expiring";
    return "all";
  });

  useEffect(() => {
    const f = searchParams.get("filter");
    if (f === "low_stock" || f === "lowStock" || f === "low-stock") {
      setFilterType("low_stock");
    } else if (f === "expiring" || f === "expired") {
      setFilterType("expiring");
    } else if (!f || f === "all") {
      setFilterType("all");
    }
  }, [searchParams]);

  useEffect(() => {
    // Sync existing medicines to Suppliers directory on mount
    if (medicines && medicines.length > 0) {
      medicines.forEach((med) => {
        suppliersFirebaseService.syncWithMedicineAdded(med).catch(() => {});
      });
    }
  }, []);

  const handleFilterCardClick = (type) => {
    if (filterType === type) {
      setFilterType("all");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("filter");
        return next;
      });
    } else {
      setFilterType(type);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (type === "all") {
          next.delete("filter");
        } else {
          next.set("filter", type);
        }
        return next;
      });
    }
  };

  /* =====================================================
     BACKGROUND SYNC — SERVER DATABASE & UPDATES
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    // Real-time Firestore sync: updates stock/batch/rack in place without count flickering
    const unsubFirestore = inventoryFirebaseService.subscribeToMedicines((fbMeds) => {
      if (!cancelled && Array.isArray(fbMeds) && fbMeds.length > 0) {
        setMedicines((prev) => {
          const map = new Map();
          prev.forEach((p) => map.set(String(p.id), p));

          fbMeds.forEach((m) => {
            const existing = map.get(String(m.id));
            if (existing) {
              map.set(String(m.id), { ...existing, ...m });
            } else if (m.isCustom) {
              map.set(String(m.id), m);
            }
          });

          return Array.from(map.values());
        });
      }
    });

    return () => {
      cancelled = true;
      if (typeof unsubFirestore === "function") unsubFirestore();
    };
  }, []);

  /* =====================================================
     LIVE UPDATE ON DISPENSE (REFRESH STOCK INSTANTLY)
  ===================================================== */
  useEffect(() => {
    const handleStockUpdate = () => {
      setMedicines(getInitialMedicines());
    };
    window.addEventListener("meditrack_stock_updated", handleStockUpdate);
    window.addEventListener("meditrack_medicines_updated", handleStockUpdate);
    return () => {
      window.removeEventListener("meditrack_stock_updated", handleStockUpdate);
      window.removeEventListener("meditrack_medicines_updated", handleStockUpdate);
    };
  }, []);

  /* =====================================================
     SAVE STOCK TO SERVER & STATE
  ===================================================== */

  const handleSaveStock = async (
    medId,
    newStock,
    newBatch,
    newRack,
    newPrice,
    newExpiry,
    newManufacturer
  ) => {
    const target = medicines.find((m) => m.id === medId);
    if (!target) return;

    const updatedStock = Number(newStock);
    const updatedBatch = newBatch || target.batch;
    const updatedRack = newRack || target.rack;
    const updatedPrice = newPrice !== undefined ? Number(newPrice) : target.price;
    const updatedExpiry = newExpiry || target.expiry;
    const updatedManufacturer = newManufacturer || target.manufacturer;

    // 1. Immediate UI update
    setMedicines((prev) =>
      prev.map((m) =>
        m.id === medId
          ? {
              ...m,
              stock: updatedStock,
              batch: updatedBatch,
              rack: updatedRack,
              price: updatedPrice,
              expiry: updatedExpiry,
              manufacturer: updatedManufacturer,
            }
          : m
      )
    );

    // 2. Persist to Firestore & Server
    try {
      await inventoryFirebaseService.updateMedicine(medId, {
        stock: updatedStock,
        batch: updatedBatch,
        rack: updatedRack,
        price: updatedPrice,
        expiry: updatedExpiry,
        manufacturer: updatedManufacturer,
      });
    } catch (fbErr) {
      console.warn("Firestore stock update warning:", fbErr.message);
    }

    try {
      await medicinesAPI.update(medId, {
        code: medId,
        name: target.name,
        fullName: target.fullName,
        brand: target.name,
        category: target.category,
        composition: target.generic,
        generic: target.generic,
        supplierName: updatedManufacturer,
        manufacturer: updatedManufacturer,
        stock: updatedStock,
        quantity: updatedStock,
        batch: updatedBatch,
        rack: updatedRack,
        price: updatedPrice,
        sellingPrice: updatedPrice,
        expiry: updatedExpiry,
      });
      toast.success(`Medicine details updated for ${target.name}`);
    } catch (err) {
      console.warn("Server stock update fallback:", err.message);
      toast.success(`Medicine details updated for ${target.name}`);
    }

    // 3. Persist to localStorage override
    try {
      const overridesKey = getScopedKey("meditrack_medicine_overrides");
      const overrides = JSON.parse(
        localStorage.getItem(overridesKey) || "{}"
      );
      overrides[medId] = {
        stock: updatedStock,
        batch: updatedBatch,
        rack: updatedRack,
        price: updatedPrice,
        expiry: updatedExpiry,
        manufacturer: updatedManufacturer,
      };
      if (target.name) overrides[target.name] = overrides[medId];
      localStorage.setItem(
        overridesKey,
        JSON.stringify(overrides)
      );
    } catch (err) {
      console.debug("Overrides save error:", err);
    }
  };

  /* =====================================================
     DELETE MEDICINE FROM SERVER & STATE
  ===================================================== */

  const handleDeleteMedicine = async (medId, medName) => {
    const targetMed = medicines.find((m) => m.id === medId);

    // 1. Immediate UI removal & log to Recycle Bin
    setMedicines((prev) => prev.filter((m) => m.id !== medId));

    if (targetMed) {
      recycleBinService.moveToTrash(
        {
          ...targetMed,
          itemType: "medicine",
          medicineName: targetMed.name || medName,
          batchNumber: targetMed.batch || "BATCH-01",
          quantity: Number(targetMed.stock) || 0,
          price: Number(targetMed.price) || 0,
        },
        "Deleted from Medicines Catalog",
        "Pharmacist Admin"
      );
    }

    // 2. Delete on Firestore & Server
    try {
      await inventoryFirebaseService.deleteMedicine(medId);
    } catch (fbErr) {
      console.warn("Firestore delete warning:", fbErr.message);
    }

    // Auto-sync with Suppliers Directory (Delete supplier if no other medicine from them exists)
    if (targetMed) {
      const remaining = medicines.filter((m) => m.id !== medId);
      suppliersFirebaseService.syncWithMedicineDeleted(targetMed, remaining).catch(console.debug);
    }

    try {
      await medicinesAPI.delete(medId);
      toast.success(`${medName} moved to Recycle Bin (Recoverable in Expiry page)`, { icon: "🗑️" });
    } catch (err) {
      console.warn("Server delete fallback:", err.message);
      toast.success(`${medName} removed`);
    }

    // 3. Persist to deleted IDs in localStorage
    try {
      const deletedKey = getScopedKey("meditrack_deleted_medicines");
      const deleted = JSON.parse(
        localStorage.getItem(deletedKey) || "[]"
      );
      if (!deleted.includes(medId)) deleted.push(medId);
      if (medName && !deleted.includes(medName)) deleted.push(medName);
      localStorage.setItem(
        deletedKey,
        JSON.stringify(deleted)
      );
    } catch (err) {
      console.debug("Deleted save error:", err);
    }
  };

  /* =====================================================
     HANDLE ADD MEDICINE
  ===================================================== */

  const handleAddMedicine = async (newMedicine) => {
    const tempId = newMedicine.id || `med-${Date.now()}`;
    const commonName = String(newMedicine.name || newMedicine.brandName || "").trim();
    const genericComp = String(newMedicine.generic || "").trim();

    const localCat = detectCategoryLocal(
      commonName,
      genericComp
    );

    const tempItem = {
      ...newMedicine,
      id: tempId,
      name: commonName,
      brandName: commonName,
      generic: genericComp,
      fullName: newMedicine.fullName || (genericComp ? `${commonName} (${genericComp})` : commonName),
      category: localCat === "Other" ? "Pharmaceutical" : localCat,
      schedule: newMedicine.schedule || "H",
      expiry: newMedicine.expiry || DEFAULT_EXPIRY,
    };

    setMedicines((prev) => [tempItem, ...prev]);
    toast.success(`${commonName} added!`);

    // Auto-sync with FEFO Expiry Tracking
    if (tempItem.expiry) {
      try {
        addExpiryItem({
          id: tempItem.id,
          medicineName: tempItem.name,
          batchNumber: tempItem.batch || "BATCH-01",
          quantity: tempItem.stock || tempItem.quantity || 100,
          price: tempItem.price || tempItem.sellingPrice || 50,
          expiryDate: tempItem.expiry,
          supplier: tempItem.manufacturer || "In-House",
          location: tempItem.rack || "Shelf A-1",
        });
      } catch (_) {}
    }

    // Persist to custom medicines list in localStorage
    try {
      const customKey = getScopedKey("meditrack_custom_medicines");
      const savedCustom = JSON.parse(
        localStorage.getItem(customKey) || "[]"
      );
      savedCustom.unshift(tempItem);
      localStorage.setItem(customKey, JSON.stringify(savedCustom));
    } catch (err) {
      console.debug(err);
    }

    // Notify all active tabs and POS Billing counter
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("meditrack_medicines_updated"));
      window.dispatchEvent(new Event("meditrack_stock_updated"));
    }

    // Auto-sync with Suppliers Directory
    try {
      await suppliersFirebaseService.syncWithMedicineAdded(tempItem);
    } catch (suppErr) {
      console.debug("Supplier auto-sync note:", suppErr);
    }

    // Persist to Firestore & backend database
    try {
      await inventoryFirebaseService.addMedicine({
        id: tempId,
        name: commonName,
        fullName: tempItem.fullName,
        category: tempItem.category,
        generic: genericComp,
        manufacturer: newMedicine.manufacturer || "Standard Pharma",
        stock: Number(newMedicine.quantity || newMedicine.stock) || 100,
        price: Number(newMedicine.sellingPrice || newMedicine.unitPrice || newMedicine.price) || 50,
        batch: newMedicine.batch || `BATCH-${Date.now().toString().slice(-4)}`,
        rack: newMedicine.rack || "R-1",
        schedule: newMedicine.schedule || "H",
        expiry: newMedicine.expiry || DEFAULT_EXPIRY,
        isCustom: true,
      });
    } catch (fbErr) {
      console.warn("Firestore add medicine warning:", fbErr.message);
    }

    try {
      await medicinesAPI.create({
        code: tempId,
        name: newMedicine.name,
        fullName: newMedicine.fullName || newMedicine.name,
        brand: newMedicine.brandName || newMedicine.name,
        category: localCat !== "Other" ? localCat : "Pharmaceutical",
        composition: newMedicine.generic || "",
        generic: newMedicine.generic || "",
        supplierName: newMedicine.manufacturer || "",
        supplierCode: newMedicine.manufacturerCode || "",
        stock: Number(newMedicine.quantity) || 100,
        quantity: Number(newMedicine.quantity) || 100,
        sellingPrice: Number(newMedicine.sellingPrice || newMedicine.unitPrice) || 50,
        price: Number(newMedicine.sellingPrice || newMedicine.unitPrice) || 50,
        mrp: Number(newMedicine.unitPrice) || 60,
        reorderLevel: Number(newMedicine.minStock) || 10,
        batch: newMedicine.batch || `BATCH-${Date.now().toString().slice(-4)}`,
        rack: newMedicine.rack || "R-1",
        schedule: newMedicine.schedule || "H",
        expiry: newMedicine.expiry || DEFAULT_EXPIRY,
        isCustom: true,
      });
    } catch (saveErr) {
      console.warn("Could not save medicine to DB:", saveErr.message);
    }

    if (localCat === "Other") {
      console.log(`🤖 AI detecting: "${newMedicine.name}"...`);
      try {
        const category = await detectCategoryWithAI(
          newMedicine.name,
          newMedicine.generic || ""
        );

        setMedicines((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, category, aiDetected: true } : m
          )
        );

        toast.success(`${newMedicine.name} → ${category}`, { icon: "🤖" });
      } catch (err) {
        console.error("AI failed:", err);
        setMedicines((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, category: "Other", aiDetected: false } : m
          )
        );
      }
    }
  };

  /* =====================================================
     STATS
  ===================================================== */

  const stats = useMemo(() => {
    const total = medicines.length;
    const lowStock = medicines.filter((m) => m.stock < 50).length;
    const expiring = medicines.filter((m) => {
      const d = new Date(m.expiry);
      const t = new Date();
      t.setMonth(t.getMonth() + 3);
      return d <= t;
    }).length;
    const categories = new Set(
      medicines
        .map((m) => m.category)
        .filter((c) => c !== "Other" && c !== "Detecting...")
    ).size;

    return { total, lowStock, expiring, categories };
  }, [medicines]);

  /* =====================================================
     CATEGORY COUNTS
  ===================================================== */

  const categoryCounts = useMemo(() => {
    const counts = { All: medicines.length };
    CATEGORIES.forEach((cat) => {
      if (cat !== "All") {
        counts[cat] = medicines.filter((m) => m.category === cat).length;
      }
    });
    return counts;
  }, [medicines]);

  /* =====================================================
     FILTERED
  ===================================================== */

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return medicines.filter((m) => {
      const name = String(m.name || "").toLowerCase();
      const fullName = String(m.fullName || "").toLowerCase();
      const generic = String(m.generic || "").toLowerCase();
      const manufacturer = String(m.manufacturer || "").toLowerCase();
      const batch = String(m.batch || "").toLowerCase();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        fullName.includes(q) ||
        generic.includes(q) ||
        manufacturer.includes(q) ||
        batch.includes(q);

      const matchesCategory =
        activeCategory === "All" || m.category === activeCategory;

      if (!matchesSearch || !matchesCategory) return false;

      // Filter by Low Stock
      if (filterType === "low_stock") {
        return Number(m.stock) < 50 || Number(m.stock) <= Number(m.minStock || 20);
      }

      // Filter by Expiring Soon (within 90 days or expired)
      if (filterType === "expiring") {
        if (!m.expiry) return false;
        const d = new Date(m.expiry);
        const t = new Date();
        t.setMonth(t.getMonth() + 3);
        return !isNaN(d.getTime()) && d <= t;
      }

      return true;
    });
  }, [medicines, searchQuery, activeCategory, filterType]);

  // Reset page when filter, search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  /* =====================================================
     HELPERS
  ===================================================== */

  const isExpiringSoon = (expiryDate) => {
    const t = new Date();
    t.setMonth(t.getMonth() + 3);
    return new Date(expiryDate) <= t;
  };

  const getStockColor = (stock) => {
    if (stock < 50) return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60";
    if (stock < 100) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60";
    return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60";
  };



  /* =====================================================
     MAIN RENDER
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 text-slate-900 dark:text-white">
      <Navbar onScanClick={() => {}} />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Medicines</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage your pharmacy inventory
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setAddModalTab("pdf");
                setShowAddMedicine(true);
              }}
              className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-2.5 rounded-md text-sm font-semibold transition shadow-2xs"
              title="Upload PDF, wholesale invoice or medicine list to bulk add & update stock"
            >
              <FileUp size={16} className="text-[#0284c7] dark:text-sky-400" />
              <span>Import via PDF / Bill</span>
            </button>

            <button
              onClick={() => {
                setAddModalTab("manual");
                setShowAddMedicine(true);
              }}
              className="flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-[#0369a1] transition shadow-sm"
            >
              <Plus size={16} />
              <span>Add Medicine</span>
            </button>
          </div>
        </div>

        {/* Stats / Interactive Filter Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total card */}
          <button
            type="button"
            onClick={() => handleFilterCardClick("all")}
            className={`text-left bg-white dark:bg-slate-900 rounded-xl p-5 border transition-all cursor-pointer ${
              filterType === "all"
                ? "border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/30 bg-sky-50/20 dark:bg-sky-950/20 shadow-md"
                : "border-sky-100 dark:border-slate-800 shadow-xs hover:border-sky-200 hover:shadow-sm"
            }`}
            title="Click to view all medicines"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</span>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-200/60 dark:border-sky-500/25 flex items-center justify-center">
                <Pill size={18} className="text-[#0284c7] dark:text-sky-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {filterType === "all" ? "Showing all medicines" : "Click to show all"}
            </p>
          </button>

          {/* Low Stock card */}
          <button
            type="button"
            onClick={() => handleFilterCardClick("low_stock")}
            className={`text-left bg-white dark:bg-slate-900 rounded-xl p-5 border transition-all cursor-pointer ${
              filterType === "low_stock"
                ? "border-rose-400 dark:border-rose-500 ring-2 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/30 shadow-md"
                : "border-sky-100 dark:border-slate-800 shadow-xs hover:border-rose-300 hover:shadow-sm"
            }`}
            title="Click to filter low stock medicines"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Low Stock</span>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-200/60 dark:border-rose-500/25 flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">{stats.lowStock}</p>
            <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-1">
              {filterType === "low_stock" ? "✓ Active Filter (Stock < 50)" : "Click to view low stock"}
            </p>
          </button>

          {/* Expiring card */}
          <button
            type="button"
            onClick={() => handleFilterCardClick("expiring")}
            className={`text-left bg-white dark:bg-slate-900 rounded-xl p-5 border transition-all cursor-pointer ${
              filterType === "expiring"
                ? "border-amber-400 dark:border-amber-500 ring-2 ring-amber-500 bg-amber-50/40 dark:bg-amber-950/30 shadow-md"
                : "border-sky-100 dark:border-slate-800 shadow-xs hover:border-amber-300 hover:shadow-sm"
            }`}
            title="Click to filter expiring medicines"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Expiring</span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-500/25 flex items-center justify-center">
                <CalendarClock size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.expiring}</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
              {filterType === "expiring" ? "✓ Active Filter (< 90 days)" : "Click to view expiring"}
            </p>
          </button>

          {/* Categories card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-sky-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Categories</span>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 dark:bg-violet-500/15 border border-violet-200/60 dark:border-violet-500/25 flex items-center justify-center">
                <Package size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.categories}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Active classifications</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, generic, manufacturer..."
                className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#0284c7] focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#0284c7]/10 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <Filter size={14} className="text-slate-400 shrink-0" />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                    activeCategory === cat
                      ? "bg-[#0284c7] text-white shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      activeCategory === cat
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {categoryCounts[cat] || 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-50 dark:bg-slate-800 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 shadow-sm text-[#0284c7] dark:text-sky-300"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-700 shadow-sm text-[#0284c7] dark:text-sky-300"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                aria-label="List view"
              >
                <ListIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Banner */}
        {filterType !== "all" && (
          <div className="flex items-center justify-between bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl px-4 py-3 mb-5 text-sm shadow-xs">
            <div className="flex items-center gap-2.5">
              {filterType === "low_stock" ? (
                <>
                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={15} />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Filtering by: <span className="text-rose-600 dark:text-rose-400">Low Stock</span>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                      ({filtered.length} medicines with stock &lt; 50 or below reorder level)
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <CalendarClock size={15} />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Filtering by: <span className="text-amber-600 dark:text-amber-400">Expiring Soon</span>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                      ({filtered.length} medicines expiring within 90 days or already expired)
                    </span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => handleFilterCardClick("all")}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer"
            >
              <X size={13} />
              <span>Reset Filter</span>
            </button>
          </div>
        )}

        {/* Results */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {filtered.length}
            </span>{" "}
            {filtered.length === 1 ? "medicine" : "medicines"} found
            {activeCategory !== "All" && (
              <span className="ml-2 text-slate-400 dark:text-slate-500">
                in <strong className="text-slate-600 dark:text-slate-300">{activeCategory}</strong>
              </span>
            )}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-16 text-center shadow-sm max-w-lg mx-auto">
            <Pill size={44} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            {medicines.length === 0 ? (
              <>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  No Medicines in Inventory (0 Items)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Your pharmacy inventory is clean. Add medicines manually, or import from wholesale invoices and bills.
                </p>
                <div className="flex items-center justify-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => {
                      setAddModalTab("manual");
                      setShowAddMedicine(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>+ Add Medicine</span>
                  </button>
                  <button
                    onClick={() => {
                      setAddModalTab("pdf");
                      setShowAddMedicine(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-semibold transition cursor-pointer"
                  >
                    <FileUp size={14} className="text-[#0284c7] dark:text-sky-400" />
                    <span>Import via PDF / Bill</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">No medicines match filter</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  {filterType !== "all"
                    ? `No medicines match "${filterType === "low_stock" ? "Low Stock" : "Expiring Soon"}" filter.`
                    : activeCategory !== "All"
                    ? `No ${activeCategory} medicines available.`
                    : "Try a different search term or select All categories."}
                </p>
                {filterType !== "all" && (
                  <button
                    onClick={() => handleFilterCardClick("all")}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#0284c7] text-white hover:bg-[#0369a1] transition shadow-xs cursor-pointer"
                  >
                    Show All Medicines
                  </button>
                )}
              </>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedMedicines.map((med) => (
              <MedicineCard
                key={med.id}
                med={med}
                onEdit={() => setEditingMedicine(med)}
                onDelete={() => handleDeleteMedicine(med.id, med.name)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    Medicine
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    Stock
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide hidden sm:table-cell">
                    Expiry
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    Price
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedMedicines.map((med) => (
                  <tr key={med.id} className="hover:bg-sky-50 dark:hover:bg-slate-800/60 transition">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{med.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{med.generic}</span>
                        {med.schedule && med.schedule !== "OTC" ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60">
                            Rx · Sched {med.schedule}
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60">
                            OTC
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                          HSN:{med.hsn || "3004"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <CategoryBadge category={med.category} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-md ${getStockColor(
                          med.stock
                        )}`}
                      >
                        {med.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span
                        className={`text-xs ${
                          isExpiringSoon(med.expiry)
                            ? "text-rose-600 dark:text-rose-400 font-semibold"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {med.expiry}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-[#0284c7] dark:text-sky-400">
                        ₹{Number(med.price || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingMedicine(med)}
                          className="p-1.5 text-slate-400 hover:text-[#0284c7] hover:bg-sky-100 dark:hover:bg-slate-800 rounded-md transition"
                          title="Edit Stock"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(med.id, med.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition"
                          title="Delete Medicine"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-1 flex-wrap gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {Math.min(currentPage * pageSize, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {filtered.length}
              </span>{" "}
              medicines
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
              >
                Previous
              </button>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 px-1">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {showAddMedicine && (
        <AddMedicineModal
          initialTab={addModalTab}
          onAdd={(result) => {
            setMedicines(getInitialMedicines());
            if (result && result.name) {
              handleAddMedicine(result);
            }
          }}
          onClose={() => setShowAddMedicine(false)}
        />
      )}

      {editingMedicine && (
        <EditStockModal
          medicine={editingMedicine}
          isOpen={!!editingMedicine}
          onClose={() => setEditingMedicine(null)}
          onSave={handleSaveStock}
        />
      )}
    </div>
  );
}

/* =====================================================
   CATEGORY BADGE
===================================================== */

function CategoryBadge({ category }) {
  const colors = {
    Antibiotic: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50",
    Analgesic: "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200/50 dark:border-orange-900/50",
    Antidiabetic: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-900/50",
    Antihistamine: "bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200/50 dark:border-pink-900/50",
    Antiseptic: "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-900/50",
    Cardiac: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-900/50",
    Other: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50",
    "Detecting...": "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-900/50",
  };

  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
        colors[category] || colors.Other
      }`}
    >
      {category}
    </span>
  );
}

/* =====================================================
   MEDICINE CARD
===================================================== */

function MedicineCard({ med, onEdit, onDelete }) {
  const isExpiringSoon = (expiryDate) => {
    const t = new Date();
    t.setMonth(t.getMonth() + 3);
    return new Date(expiryDate) <= t;
  };

  const getStockColor = (stock) => {
    if (stock < 50) return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60";
    if (stock < 100) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60";
    return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60";
  };

  const getStockLabel = (stock) => {
    if (stock < 50) return "Low Stock";
    if (stock < 100) return "Medium";
    return "In Stock";
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-md bg-sky-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
          <Pill size={18} className="text-[#0284c7] dark:text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate"
            title={med.fullName}
          >
            {med.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {med.generic}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-[#0284c7] hover:bg-sky-50 dark:hover:bg-slate-800 rounded-md transition"
            title="Edit Stock"
          >
            <Edit3 size={15} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-md transition"
            title="Delete Medicine"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <CategoryBadge category={med.category} />
        {med.schedule && med.schedule !== "OTC" ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 flex items-center gap-1" title="Schedule H drug - requires valid registered medical practitioner prescription">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Rx · Sched {med.schedule}
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
            OTC
          </span>
        )}
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
          HSN: {med.hsn || "3004"}
        </span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
          GST: {med.gstRate || 12}%
        </span>
        {isExpiringSoon(med.expiry) && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/50 flex items-center gap-1">
            <CalendarClock size={10} />
            Expiring
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Package size={11} />
          <span className="font-mono">{med.batch}</span>
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={11} />
          <span className="font-mono">{med.rack}</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-500 dark:text-slate-400">
        <Building2 size={11} />
        <span className="truncate">{med.manufacturer}</span>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 my-3" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Stock</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{med.stock}</span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getStockColor(
                med.stock
              )}`}
            >
              {getStockLabel(med.stock)}
            </span>
            <button
              type="button"
              onClick={onEdit}
              className="text-[11px] font-semibold text-[#0284c7] dark:text-sky-400 hover:text-[#0369a1] hover:underline cursor-pointer ml-1"
            >
              Edit
            </button>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Price</p>
          <p className="text-sm font-bold text-[#0284c7] dark:text-sky-400">
            ₹{Number(med.price || 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Expires</span>
        <span
          className={`font-semibold ${
            isExpiringSoon(med.expiry)
              ? "text-rose-600 dark:text-rose-400"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {med.expiry}
        </span>
      </div>
    </div>
  );
}