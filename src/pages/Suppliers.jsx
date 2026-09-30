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
import { suppliersAPI } from "../services/api";

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
      const data = await suppliersAPI.stats();
      setStats(data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  }, []);

  const fetchSuppliers = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const data = await suppliersAPI.list({
          page: pageNum,
          limit: PAGE_SIZE,
          search: searchQuery,
          status: statusFilter,
        });

        if (append) {
          setSuppliers((prev) => [...prev, ...data.suppliers]);
        } else {
          setSuppliers(data.suppliers);
        }

        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPage(pageNum);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load suppliers");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchQuery, statusFilter]
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await suppliersAPI.stats();
        if (!cancelled && data) setStats(data);
      } catch (err) {
        console.error("Stats error:", err);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

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
      const created = await suppliersAPI.create(newSupplier);
      setSuppliers((prev) => [created, ...prev]);
      toast.success(`${created.name} added!`);
      setShowAddModal(false);
      fetchStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateSupplier = async (updated) => {
    try {
      const saved = await suppliersAPI.update(updated.code, updated);
      setSuppliers((prev) =>
        prev.map((s) => (s.code === saved.code ? saved : s))
      );
      setSelectedSupplier(saved);
      toast.success("Updated");
      fetchStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteSupplier = async (code) => {
    try {
      await suppliersAPI.delete(code);
      setSuppliers((prev) => prev.filter((s) => s.code !== code));
      setSelectedSupplier(null);
      toast.success("Deleted");
      fetchStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 text-slate-900 dark:text-white">
      <Navbar onScanClick={() => {}} />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {stats.total.toLocaleString()} suppliers from CDCI master
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-[#0369a1] transition shadow-sm"
            >
              <Plus size={16} />
              Add Supplier
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center">
                <Factory size={18} className="text-[#0284c7] dark:text-sky-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total.toLocaleString()}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Active</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.active.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center">
                <Clock size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.pending.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-violet-50 dark:bg-violet-950/60 flex items-center justify-center">
                <Package size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Products</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.totalProducts.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-4 mb-4 shadow-sm">
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
              <div className="col-span-full bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-12 text-center shadow-sm">
                <Factory size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  No suppliers found
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Try a different search or filter
                </p>
              </div>
            ) : (
              <>
                {suppliers.map((supplier) => (
                  <button
                    key={supplier.code}
                    onClick={() => setSelectedSupplier(supplier)}
                    className="text-left bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#0284c7] to-[#0369a1] flex items-center justify-center shrink-0">
                        <Factory size={18} className="text-white" />
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
                          <p className="text-[10px] text-slate-400 mb-0.5">
                            Products
                          </p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {supplier.productsCount || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 mb-0.5">
                            Orders
                          </p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {supplier.totalOrders || 0}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-slate-300 group-hover:text-[#0284c7] transition"
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