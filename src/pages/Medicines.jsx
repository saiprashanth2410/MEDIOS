import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Papa from "papaparse";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { detectCategoryLocal } from "../utils/localCategoryRules";
import { detectCategoryWithAI } from "../utils/aiCategoryDetector";
import AddMedicineModal from "../components/dashboard/AddMedicineModal";
import Navbar from "../components/dashboard/Navbar";

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
const MAX_ITEMS = 500;

/* =====================================================
   BRAND NAME EXTRACTOR — FIXED
===================================================== */

function extractBrandName(fullName) {
  if (!fullName) return "";

  let name = String(fullName).trim();

  // 1. Remove round brackets (generic name)
  name = name.replace(/\s*\([^)]*\)/g, "");

  // 2. Remove strength + dosage patterns
  //    Handles: "5 million unit/1 vial", "200 mg tablet", "50 mcg/1 actuation", "400 mg/5 ml"
  name = name.replace(
    /\s+\d+(\.\d+)?\s*(million|thousand|billion)?\s*(unit|units|mg|mcg|g|ml|mL|IU|%|w\/v|w\/w)?(\s*\/\s*\d*\s*(unit|units|mg|mcg|g|ml|mL))?.*$/i,
    ""
  );

  name = name.trim();

  // 3. Fallback — if name too long (> 30 chars), take first 2 words
  if (name.length > 30) {
    const words = name.split(/\s+/);
    name = words.slice(0, 2).join(" ");
  }

  // 4. If empty, take first word of full name
  if (!name) {
    name = String(fullName).split(/\s+/)[0];
  }

  return name;
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function Medicines() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid");

  /* =====================================================
     FETCH 500 MEDICINES — LOCAL CATEGORIES ONLY
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    const loadMedicines = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔥 Loading BrandMaster.tsv...");
        const response = await fetch("/data/BrandMaster.tsv");
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const tsvText = await response.text();

        Papa.parse(tsvText, {
          header: true,
          skipEmptyLines: true,
          delimiter: "\t",
          complete: (results) => {
            if (cancelled) return;

            const rows = (results.data || []).slice(0, MAX_ITEMS);
            console.log(`📊 Total rows: ${rows.length}`);

            const parsed = rows
              .map((row, index) => {
                const fullName = String(row["Brand Name"] || "").trim();
                if (!fullName) return null;

                // ✅ FIXED: extract short brand name
                const brandName = extractBrandName(fullName);
                const generic = String(row["Generic Identifier"] || "N/A").trim();

                // ⚡ LOCAL DETECTION — Use fullName
                const category = detectCategoryLocal(fullName, brandName);

                return {
                  id: String(row["Identifier"] || `med-${index}`),
                  name: brandName,
                  fullName,
                  generic,
                  manufacturer: String(row["Supplier Identifier"] || "Unknown").trim(),
                  category,
                  aiDetected: false,
                  batch: `BATCH-${1000 + index}`,
                  rack: `R-${(index % 20) + 1}`,
                  stock: 50 + ((index * 7) % 200),
                  price: 10 + ((index * 13) % 490),
                  schedule: "H",
                  expiry: DEFAULT_EXPIRY,
                };
              })
              .filter(Boolean);

            // Stats
            const categoryStats = {};
            parsed.forEach((m) => {
              categoryStats[m.category] = (categoryStats[m.category] || 0) + 1;
            });

            console.log("📊 Category breakdown:");
            Object.entries(categoryStats).forEach(([cat, count]) => {
              console.log(`   ${cat}: ${count}`);
            });
            console.log("🔴 AI NOT USED for 500 medicines (local keywords only)");

            setMedicines(parsed);
            setLoading(false);
          },
          error: (err) => {
            console.error(err);
            setError("Parse failed");
            setLoading(false);
          },
        });
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadMedicines();
    return () => {
      cancelled = true;
    };
  }, []);

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
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.fullName.toLowerCase().includes(q) ||
        m.generic.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q) ||
        m.batch.toLowerCase().includes(q);

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
     LOADING / ERROR
  ===================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-600">Loading medicines...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 flex items-center justify-center px-6">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-rose-200 p-8 max-w-md text-center">
          <AlertTriangle size={40} className="text-rose-500 mx-auto mb-4" />
          <p className="text-sm font-semibold mb-2">Failed to load</p>
          <p className="text-xs text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#0284c7] text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#0369a1]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-sky-50 flex items-center justify-center">
                <Pill size={18} className="text-[#0284c7]" />
              </div>
              <span className="text-xs text-slate-500">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-rose-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <span className="text-xs text-slate-500">Low Stock</span>
            </div>
            <p className="text-2xl font-bold text-rose-600">{stats.lowStock}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-amber-50 flex items-center justify-center">
                <CalendarClock size={18} className="text-amber-600" />
              </div>
              <span className="text-xs text-slate-500">Expiring</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.expiring}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-violet-50 flex items-center justify-center">
                <Package size={18} className="text-violet-600" />
              </div>
              <span className="text-xs text-slate-500">Categories</span>
            </div>
            <p className="text-2xl font-bold">{stats.categories}</p>
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
                className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 text-sm outline-none focus:border-[#0284c7] focus:bg-white focus:ring-4 focus:ring-[#0284c7]/10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
                      ? "bg-[#0284c7] text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      activeCategory === cat
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {categoryCounts[cat] || 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-50 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition ${
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-[#0284c7]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition ${
                  viewMode === "list"
                    ? "bg-white shadow-sm text-[#0284c7]"
                    : "text-slate-400 hover:text-slate-600"
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
              <MedicineCard key={med.id} med={med} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Medicine
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Stock
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide hidden sm:table-cell">
                    Expiry
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((med) => (
                  <tr key={med.id} className="hover:bg-sky-50 transition">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">{med.name}</p>
                      <p className="text-xs text-slate-500">{med.generic}</p>
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
                            ? "text-rose-600 font-semibold"
                            : "text-slate-600"
                        }`}
                      >
                        {med.expiry}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-[#0284c7]">
                        ₹{med.price.toFixed(2)}
                      </span>
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
    </div>
  );
}

/* =====================================================
   CATEGORY BADGE
===================================================== */

function CategoryBadge({ category }) {
  const colors = {
    Antibiotic: "bg-blue-50 text-blue-700",
    Analgesic: "bg-orange-50 text-orange-700",
    Antidiabetic: "bg-purple-50 text-purple-700",
    Antihistamine: "bg-pink-50 text-pink-700",
    Antiseptic: "bg-teal-50 text-teal-700",
    Cardiac: "bg-red-50 text-red-700",
    Other: "bg-slate-100 text-slate-600",
    "Detecting...": "bg-violet-50 text-violet-700",
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

function MedicineCard({ med }) {
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

  const getStockLabel = (stock) => {
    if (stock < 50) return "Low Stock";
    if (stock < 100) return "Medium";
    return "In Stock";
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-md bg-sky-50 flex items-center justify-center shrink-0">
          <Pill size={18} className="text-[#0284c7]" />
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
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <CategoryBadge category={med.category} />
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
          Schedule {med.schedule}
        </span>
        {isExpiringSoon(med.expiry) && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 flex items-center gap-1">
            <CalendarClock size={10} />
            Expiring
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Package size={11} />
          <span className="font-mono">{med.batch}</span>
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={11} />
          <span className="font-mono">{med.rack}</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-500">
        <Building2 size={11} />
        <span className="truncate">{med.manufacturer}</span>
      </div>

      <div className="border-t border-slate-100 my-3" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 mb-0.5">Stock</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{med.stock}</span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getStockColor(
                med.stock
              )}`}
            >
              {getStockLabel(med.stock)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 mb-0.5">Price</p>
          <p className="text-sm font-bold text-[#0284c7]">
            ₹{med.price.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500">Expires</span>
        <span
          className={`font-semibold ${
            isExpiringSoon(med.expiry)
              ? "text-rose-600"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {med.expiry}
        </span>
      </div>
    </div>
  );
}