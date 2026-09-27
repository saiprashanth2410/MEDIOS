import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Pill,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
  LogOut,
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
  CheckCircle2,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MEDICINES } from "../data/medicines";
import AddMedicineModal from "../components/dashboard/AddMedicineModal";
import Navbar from "../components/dashboard/Navbar";

/* =====================================================
   CATEGORIES
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

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function Medicines() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [medicines, setMedicines] = useState(MEDICINES);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid");

  const userName = user?.name || "Pharmacist";
  const userRole = "Chief Pharmacist";

  /* =====================================================
     HANDLERS
  ===================================================== */

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login", { replace: true });
  };

  const handleAddMedicine = (newMedicine) => {
    setMedicines((prev) => [newMedicine, ...prev]);
    toast.success(`${newMedicine.name} added to inventory!`);
  };

  /* =====================================================
     DERIVED DATA
  ===================================================== */

  const stats = useMemo(() => {
    const total = medicines.length;
    const lowStock = medicines.filter((m) => m.stock < 50).length;
    const expiring = medicines.filter((m) => {
      const expiryDate = new Date(m.expiry);
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      return expiryDate <= threeMonths;
    }).length;
    const categories = new Set(medicines.map((m) => m.category)).size;

    return { total, lowStock, expiring, categories };
  }, [medicines]);

  const filtered = useMemo(() => {
    return medicines.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.generic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.batch.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategory === "All" || m.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [medicines, searchQuery, activeCategory]);

  /* =====================================================
     HELPERS
  ===================================================== */

  const isExpiringSoon = (expiryDate) => {
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return new Date(expiryDate) <= threeMonths;
  };

  const getStockColor = (stock) => {
    if (stock < 50) return "text-rose-600 bg-rose-50";
    if (stock < 100) return "text-amber-600 bg-amber-50";
    return "text-emerald-600 bg-emerald-50";
  };

  return (
    <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 text-slate-900 dark:text-white">

      {/* =====================================================
          TOP NAVBAR — Using shared component
      ====================================================== */}

      <Navbar onScanClick={() => {}} />

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="max-w-[1400px] mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Medicines</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
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
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-rose-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Low Stock</span>
            </div>
            <p className="text-2xl font-bold text-rose-600">{stats.lowStock}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-amber-50 flex items-center justify-center">
                <CalendarClock size={18} className="text-amber-600" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Expiring</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.expiring}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-violet-50 flex items-center justify-center">
                <Package size={18} className="text-violet-600" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Categories</span>
            </div>
            <p className="text-2xl font-bold">{stats.categories}</p>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, generic, manufacturer, batch..."
                className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 text-sm outline-none transition focus:border-[#0284c7] focus:bg-white dark:bg-slate-900 focus:ring-4 focus:ring-[#0284c7]/10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <Filter size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    activeCategory === cat
                      ? "bg-[#0284c7] text-white"
                      : "bg-slate-50 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-50 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-[#0284c7]"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-[#0284c7]"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
                }`}
                aria-label="List view"
              >
                <ListIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <span className="font-semibold text-slate-800 dark:text-slate-100">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "medicine" : "medicines"} found
          </p>
        </div>

        {/* Medicines list */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-16 text-center shadow-sm">
            <Pill size={40} className="text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              No medicines found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-6">
              {searchQuery || activeCategory !== "All"
                ? "Try a different search or filter"
                : "Add your first medicine to get started"}
            </p>
            <button
              onClick={() => setShowAddMedicine(true)}
              className="inline-flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#0369a1] transition"
            >
              <Plus size={14} />
              Add Medicine
            </button>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    Medicine
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide hidden md:table-cell">
                    Batch
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide hidden lg:table-cell">
                    Rack
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((med) => (
                  <tr key={med.id} className="hover:bg-sky-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">{med.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                          {med.manufacturer}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                        {med.batch}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                        {med.rack}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-md ${getStockColor(med.stock)}`}
                      >
                        {med.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span
                        className={`text-xs ${
                          isExpiringSoon(med.expiry)
                            ? "text-rose-600 font-semibold"
                            : "text-slate-600 dark:text-slate-300"
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

      {/* Add Medicine Modal */}
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
   MEDICINE CARD
===================================================== */

function MedicineCard({ med }) {
  const isExpiringSoon = (expiryDate) => {
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return new Date(expiryDate) <= threeMonths;
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
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-md bg-sky-50 flex items-center justify-center shrink-0">
            <Pill size={18} className="text-[#0284c7]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {med.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 truncate">{med.generic}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700">
          {med.category}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:text-slate-300">
          Schedule {med.schedule}
        </span>
        {isExpiringSoon(med.expiry) && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 flex items-center gap-1">
            <CalendarClock size={10} />
            Expiring
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <Package size={11} />
          <span className="font-mono">{med.batch}</span>
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={11} />
          <span className="font-mono">{med.rack}</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
        <Building2 size={11} />
        <span className="truncate">{med.manufacturer}</span>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 my-3" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Stock</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{med.stock}</span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getStockColor(med.stock)}`}
            >
              {getStockLabel(med.stock)}
            </span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Price</p>
          <p className="text-sm font-bold text-[#0284c7]">
            ₹{med.price.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Expires</span>
        <span
          className={`font-semibold ${
            isExpiringSoon(med.expiry) ? "text-rose-600" : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {med.expiry}
        </span>
      </div>
    </div>
  );
}