import { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import { detectCategoryLocal } from "../utils/localCategoryRules";
import { detectCategoryWithAI } from "../utils/aiCategoryDetector";
import AddMedicineModal from "../components/dashboard/AddMedicineModal";
import EditStockModal from "../components/medicines/EditStockModal";
import Navbar from "../components/dashboard/Navbar";
import { medicinesAPI } from "../services/api";
import defaultMedicines from "../data/catalogMedicines.json";

console.log("🔥🔥🔥 VERSION 6 — LOCAL + AI (Add only) 🔥🔥🔥");

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
   INITIAL MEDICINES (INSTANT LOAD — NO SPINNER)
===================================================== */

function getInitialMedicines() {
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
        };
      });

    const activeCustom = custom.filter(
      (m) => !deletedIds.has(String(m.id)) && !deletedIds.has(m.name)
    );

    return [...activeCustom, ...merged];
  } catch (err) {
    console.debug("Initial medicines load fallback:", err);
    return defaultMedicines;
  }
}



/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function Medicines() {
  const [medicines, setMedicines] = useState(getInitialMedicines);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid");

  /* =====================================================
     BACKGROUND SYNC — SERVER DATABASE & UPDATES
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    const syncMedicines = async () => {
      try {
        const deletedIds = new Set();
        try {
          const savedDeleted = localStorage.getItem("meditrack_deleted_medicines");
          if (savedDeleted) {
            JSON.parse(savedDeleted).forEach((id) => deletedIds.add(String(id)));
          }
        } catch (err) {
          console.debug(err);
        }

        let overrides = {};
        try {
          const savedOverrides = localStorage.getItem("meditrack_medicine_overrides");
          if (savedOverrides) overrides = JSON.parse(savedOverrides);
        } catch (err) {
          console.debug(err);
        }

        let customMedicines = [];
        try {
          const savedCustom = localStorage.getItem("meditrack_custom_medicines");
          if (savedCustom) {
            customMedicines = JSON.parse(savedCustom).filter(
              (m) => !deletedIds.has(String(m.id)) && !deletedIds.has(m.name)
            );
          }
        } catch (err) {
          console.debug(err);
        }

        const dbMedicinesMap = {};
        try {
          const apiData = await medicinesAPI.list({ limit: 100 });
          if (apiData?.medicines) {
            apiData.medicines.forEach((m) => {
              const key = String(m.code || m._id || m.name);
              dbMedicinesMap[key] = m;
              if (m.name) dbMedicinesMap[m.name] = m;

              if (
                m.isCustom &&
                !deletedIds.has(String(m.code || m._id)) &&
                !deletedIds.has(m.name) &&
                !customMedicines.some((c) => c.id === (m.code || String(m._id)))
              ) {
                customMedicines.push({
                  id: m.code || String(m._id),
                  name: m.name || m.fullName,
                  fullName: m.fullName || m.name,
                  generic: m.generic || m.composition || "General Formulation",
                  manufacturer: m.supplierName || "In-House",
                  category: m.category || "Other",
                  aiDetected: false,
                  batch: m.batch || "BATCH-CUSTOM",
                  rack: m.rack || "R-1",
                  stock: m.stock ?? 100,
                  price: m.price ?? m.sellingPrice ?? 50,
                  schedule: m.schedule || "OTC",
                  expiry: m.expiry || DEFAULT_EXPIRY,
                });
              }
            });
          }
        } catch (apiErr) {
          console.debug("DB background sync fallback:", apiErr?.message);
        }

        if (cancelled) return;

        const updated = defaultMedicines
          .filter((med) => !deletedIds.has(String(med.id)) && !deletedIds.has(med.name))
          .map((med) => {
            const dbMatch = dbMedicinesMap[med.id] || dbMedicinesMap[med.name];
            const override = overrides[med.id] || overrides[med.name];

            const stock =
              override?.stock !== undefined
                ? override.stock
                : dbMatch?.stock !== undefined
                ? dbMatch.stock
                : med.stock;

            const batch = override?.batch || dbMatch?.batch || med.batch;
            const rack = override?.rack || dbMatch?.rack || med.rack;

            return {
              ...med,
              stock,
              batch,
              rack,
              price: typeof dbMatch?.price === "number" ? dbMatch.price : med.price,
            };
          });

        setMedicines([...customMedicines, ...updated]);
      } catch (err) {
        console.debug("Silent sync complete:", err);
      }
    };

    syncMedicines();
    return () => {
      cancelled = true;
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
    return () => {
      window.removeEventListener("meditrack_stock_updated", handleStockUpdate);
    };
  }, []);

  /* =====================================================
     SAVE STOCK TO SERVER & STATE
  ===================================================== */

  const handleSaveStock = async (medId, newStock, newBatch, newRack) => {
    const target = medicines.find((m) => m.id === medId);
    if (!target) return;

    const updatedStock = Number(newStock);
    const updatedBatch = newBatch || target.batch;
    const updatedRack = newRack || target.rack;

    // 1. Immediate UI update
    setMedicines((prev) =>
      prev.map((m) =>
        m.id === medId
          ? {
              ...m,
              stock: updatedStock,
              batch: updatedBatch,
              rack: updatedRack,
            }
          : m
      )
    );

    // 2. Persist to MongoDB Server
    try {
      await medicinesAPI.update(medId, {
        code: medId,
        name: target.name,
        fullName: target.fullName,
        brand: target.name,
        category: target.category,
        composition: target.generic,
        generic: target.generic,
        supplierName: target.manufacturer,
        stock: updatedStock,
        quantity: updatedStock,
        batch: updatedBatch,
        rack: updatedRack,
        price: target.price,
        sellingPrice: target.price,
        expiry: target.expiry,
      });
      toast.success(`Stock updated for ${target.name}: ${updatedStock} units`);
    } catch (err) {
      console.warn("Server stock update fallback:", err.message);
      toast.success(`Stock updated locally for ${target.name}`);
    }

    // 3. Persist to localStorage override
    try {
      const overrides = JSON.parse(
        localStorage.getItem("meditrack_medicine_overrides") || "{}"
      );
      overrides[medId] = {
        stock: updatedStock,
        batch: updatedBatch,
        rack: updatedRack,
      };
      if (target.name) overrides[target.name] = overrides[medId];
      localStorage.setItem(
        "meditrack_medicine_overrides",
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
    if (!window.confirm(`Are you sure you want to delete ${medName}?`)) return;

    // 1. Immediate UI removal
    setMedicines((prev) => prev.filter((m) => m.id !== medId));

    // 2. Delete on Server
    try {
      await medicinesAPI.delete(medId);
      toast.success(`${medName} deleted from server`);
    } catch (err) {
      console.warn("Server delete fallback:", err.message);
      toast.success(`${medName} removed`);
    }

    // 3. Persist to deleted IDs in localStorage
    try {
      const deleted = JSON.parse(
        localStorage.getItem("meditrack_deleted_medicines") || "[]"
      );
      if (!deleted.includes(medId)) deleted.push(medId);
      if (medName && !deleted.includes(medName)) deleted.push(medName);
      localStorage.setItem(
        "meditrack_deleted_medicines",
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

    const localCat = detectCategoryLocal(
      newMedicine.name,
      newMedicine.generic || ""
    );

    const tempItem = {
      ...newMedicine,
      id: tempId,
      fullName: newMedicine.fullName || newMedicine.name,
      category: localCat === "Other" ? "Detecting..." : localCat,
      aiDetected: localCat !== "Other",
      schedule: newMedicine.schedule || "H",
      expiry: newMedicine.expiry || DEFAULT_EXPIRY,
    };

    setMedicines((prev) => [tempItem, ...prev]);
    toast.success(`${newMedicine.name} added!`);

    // Persist to custom medicines list in localStorage
    try {
      const savedCustom = JSON.parse(
        localStorage.getItem("meditrack_custom_medicines") || "[]"
      );
      savedCustom.unshift(tempItem);
      localStorage.setItem("meditrack_custom_medicines", JSON.stringify(savedCustom));
    } catch (err) {
      console.debug(err);
    }

    // Persist to backend database
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

      return matchesSearch && matchesCategory;
    });
  }, [medicines, searchQuery, activeCategory]);

  /* =====================================================
     HELPERS
  ===================================================== */

  const isExpiringSoon = (expiryDate) => {
    const t = new Date();
    t.setMonth(t.getMonth() + 3);
    return new Date(expiryDate) <= t;
  };

  const getStockColor = (stock) => {
    if (stock < 50) return "text-rose-600 bg-rose-50";
    if (stock < 100) return "text-amber-600 bg-amber-50";
    return "text-emerald-600 bg-emerald-50";
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
            <p className="text-sm text-slate-500 mt-1">
              Manage your pharmacy inventory
            </p>
          </div>
          <button
            onClick={() => setShowAddMedicine(true)}
            className="flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-[#0369a1] transition shadow-sm"
          >
            <Plus size={16} />
            Add Medicine
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-sky-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</span>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-200/60 dark:border-sky-500/25 flex items-center justify-center">
                <Pill size={18} className="text-[#0284c7] dark:text-sky-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-sky-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Low Stock</span>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-200/60 dark:border-rose-500/25 flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">{stats.lowStock}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-sky-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Expiring</span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-500/25 flex items-center justify-center">
                <CalendarClock size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.expiring}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-sky-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Categories</span>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 dark:bg-violet-500/15 border border-violet-200/60 dark:border-violet-500/25 flex items-center justify-center">
                <Package size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.categories}</p>
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

        {/* Results */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {filtered.length}
            </span>{" "}
            {filtered.length === 1 ? "medicine" : "medicines"} found
            {activeCategory !== "All" && (
              <span className="ml-2 text-slate-400">
                in <strong className="text-slate-600">{activeCategory}</strong>
              </span>
            )}
          </p>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-16 text-center shadow-sm">
            <Pill size={40} className="text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-semibold mb-1">No medicines found</p>
            <p className="text-xs text-slate-500 mb-6">
              {activeCategory !== "All"
                ? `No ${activeCategory} medicines available`
                : "Try a different search"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((med) => (
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
                {filtered.map((med) => (
                  <tr key={med.id} className="hover:bg-sky-50 dark:hover:bg-slate-800/60 transition">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{med.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{med.generic}</p>
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
      </main>

      {showAddMedicine && (
        <AddMedicineModal
          onAdd={handleAddMedicine}
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
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
          Schedule {med.schedule}
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