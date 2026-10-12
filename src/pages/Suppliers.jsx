import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Factory,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  ChevronRight,
  Package,
  Loader2,
  RefreshCw,
} from "lucide-react";
import AddSupplierModal from "../components/suppliers/AddSupplierModal";
import SupplierDetailModal from "../components/suppliers/SupplierDetailModal";
import Navbar from "../components/dashboard/Navbar";
import { suppliersFirebaseService } from "../services/suppliersFirebaseService";
import { suppliersAPI } from "../services/api";
import { getScopedKey } from "../utils/userScope";

const PAGE_SIZE = 50;

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const observerTarget = useRef(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    totalProducts: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const data = await suppliersFirebaseService.stats();
      setStats(data);
    } catch {
      try {
        const data = await suppliersAPI.stats();
        setStats(data);
      } catch (err) {
        console.error("Stats error:", err);
      }
    }
  }, []);

  const fetchSuppliers = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        let data;
        try {
          data = await suppliersFirebaseService.list({
            page: pageNum,
            limit: PAGE_SIZE,
            search: searchQuery,
            status: statusFilter,
          });
        } catch {
          data = await suppliersAPI.list({
            page: pageNum,
            limit: PAGE_SIZE,
            search: searchQuery,
            status: statusFilter,
          });
        }

        // If empty on initial load, auto-check if existing medicines have suppliers to register
        if (!append && (!data.suppliers || data.suppliers.length === 0)) {
          try {
            const customKey = getScopedKey("meditrack_custom_medicines");
            const savedCustom = JSON.parse(localStorage.getItem(customKey) || "[]");
            if (savedCustom.length > 0) {
              for (const med of savedCustom) {
                await suppliersFirebaseService.syncWithMedicineAdded(med);
              }
              data = await suppliersFirebaseService.list({
                page: pageNum,
                limit: PAGE_SIZE,
                search: searchQuery,
                status: statusFilter,
              });
              fetchStats();
            }
          } catch (_) {}
        }

        if (append) {
          setSuppliers((prev) => [...prev, ...(data.suppliers || [])]);
        } else {
          setSuppliers(data.suppliers || []);
        }

        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(pageNum);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load suppliers");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchQuery, statusFilter, fetchStats]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Live real-time sync when medicines are added or deleted anywhere in the app
  useEffect(() => {
    const handleLiveSync = () => {
      fetchSuppliers(1, false);
      fetchStats();
    };
    window.addEventListener("meditrack_suppliers_updated", handleLiveSync);
    return () => window.removeEventListener("meditrack_suppliers_updated", handleLiveSync);
  }, [fetchSuppliers, fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers(1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSuppliers]);

  const handleLoadMore = useCallback(() => {
    if (page < totalPages && !loading && !loadingMore) {
      fetchSuppliers(page + 1, true);
    }
  }, [page, totalPages, loading, loadingMore, fetchSuppliers]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "300px", threshold: 0.1 }
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [handleLoadMore]);

  const handleRefresh = async () => {
    if (!window.confirm("Refresh suppliers?")) return;
    await fetchSuppliers(1, false);
    await fetchStats();
    toast.success("Refreshed");
  };

  const handleAddSupplier = async (newSupplier) => {
    try {
      const created = await suppliersFirebaseService.create(newSupplier);
      setSuppliers((prev) => [created, ...prev]);
      toast.success(`${created.name} added!`);
      setShowAddModal(false);
      fetchStats();
    } catch (err) {
      try {
        const created = await suppliersAPI.create(newSupplier);
        setSuppliers((prev) => [created, ...prev]);
        setShowAddModal(false);
      } catch (e) {
        toast.error(err.message || e.message);
      }
    }
  };

  const handleUpdateSupplier = async (updated) => {
    try {
      await suppliersFirebaseService.update(updated.code, updated);
      setSuppliers((prev) =>
        prev.map((s) => (s.code === updated.code ? updated : s))
      );
      setSelectedSupplier(updated);
      toast.success("Updated");
      fetchStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteSupplier = async (code) => {
    try {
      await suppliersFirebaseService.delete(code);
      setSuppliers((prev) => prev.filter((s) => s.code !== code));
      setSelectedSupplier(null);
      toast.success("Deleted");
      fetchStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar onScanClick={() => {}} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Suppliers</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {stats.total > 0
                ? `${stats.total.toLocaleString()} registered pharmacy ${stats.total === 1 ? "supplier" : "suppliers"}`
                : "Manage verified drug manufacturers & distributors"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0369a1] transition shadow-xs"
            >
              <Plus size={16} />
              Add Supplier
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</span>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-200/60 dark:border-sky-500/25 flex items-center justify-center">
                <Factory size={18} className="text-[#0284c7] dark:text-sky-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{stats.total.toLocaleString()}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-200/60 dark:border-emerald-500/25 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {stats.active.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending</span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-500/25 flex items-center justify-center">
                <Clock size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
              {stats.pending.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Products</span>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 dark:bg-violet-500/15 border border-violet-200/60 dark:border-violet-500/25 flex items-center justify-center">
                <Package size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {stats.totalProducts.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 mb-4 shadow-2xs">
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
                placeholder="Search suppliers..."
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#0284c7] focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#0284c7]/10 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {["all", "active", "pending", "inactive"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition capitalize ${
                    statusFilter === status
                      ? "bg-[#0284c7] text-white shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {total.toLocaleString()}
            </span>{" "}
            {total === 1 ? "supplier" : "suppliers"} found
          </p>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={40} className="text-[#0284c7] animate-spin" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-2xs">
                <Factory size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  No suppliers registered yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
                  Adding medicines with manufacturer details automatically registers suppliers here. You can also add a supplier manually.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#0369a1] transition shadow-xs"
                >
                  <Plus size={14} /> Add Supplier
                </button>
              </div>
            ) : (
              <>
                {suppliers.map((supplier) => (
                  <button
                    key={supplier.code}
                    onClick={() => setSelectedSupplier(supplier)}
                    className="text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-400 flex items-center justify-center shrink-0">
                        <Factory size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {supplier.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {supplier.code} · {supplier.category}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {supplier.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Phone size={11} className="shrink-0" />
                          <span className="truncate">{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Mail size={11} className="shrink-0" />
                          <span className="truncate">{supplier.email}</span>
                        </div>
                      )}
                      {supplier.address && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{supplier.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">
                            Products
                          </p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {supplier.productsCount || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">
                            Orders
                          </p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {supplier.totalOrders || 0}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-slate-300 dark:text-slate-600 group-hover:text-[#0284c7] dark:group-hover:text-sky-400 transition"
                      />
                    </div>
                  </button>
                ))}

                {/* Infinite Scroll Sentinel & Loader */}
                <div
                  ref={observerTarget}
                  className="col-span-full flex flex-col items-center justify-center py-6"
                >
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-sm text-[#0284c7] font-medium py-3">
                      <Loader2 size={22} className="animate-spin text-[#0284c7]" />
                      <span>Loading more suppliers...</span>
                    </div>
                  )}
                  {!loadingMore && page >= totalPages && suppliers.length > 0 && (
                    <p className="text-xs text-slate-400 py-3">
                      All {total.toLocaleString()} suppliers loaded
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddSupplierModal
          onAdd={handleAddSupplier}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {selectedSupplier && (
        <SupplierDetailModal
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onUpdate={handleUpdateSupplier}
          onDelete={handleDeleteSupplier}
        />
      )}
    </div>
  );
}