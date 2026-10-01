import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  ChevronRight,
  Search,
  Plus,
  Clock,
  User,
  Stethoscope,
  Calendar,
  Brain,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import AddPrescriptionModal from "../components/prescriptions/AddPrescriptionModal";
import PrescriptionDetailModal from "../components/prescriptions/PrescriptionDetailModal";
import Navbar from "../components/dashboard/Navbar";
import { prescriptionsFirebaseService } from "../services/prescriptionsFirebaseService";
import { prescriptionsAPI } from "../services/api";
import { checkMedicineStock } from "../utils/inventoryDeduction";

const PAGE_SIZE = 50;

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddPrescription, setShowAddPrescription] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    dispensed: 0,
    pending: 0,
    cancelled: 0,
  });

  /* =====================================================
     FETCH STATS
  ===================================================== */
  const fetchStats = useCallback(async () => {
    try {
      const data = await prescriptionsFirebaseService.stats();
      setStats(data);
    } catch {
      try {
        const data = await prescriptionsAPI.stats();
        setStats(data);
      } catch (err) {
        console.error("Stats error:", err);
      }
    }
  }, []);

  /* =====================================================
     FETCH PRESCRIPTIONS
  ===================================================== */
  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await prescriptionsFirebaseService.list({
        page: 1,
        limit: PAGE_SIZE,
        search: searchQuery,
        status: "all",
      });
      setPrescriptions(data?.prescriptions || []);
    } catch {
      try {
        const data = await prescriptionsAPI.list({
          page: 1,
          limit: PAGE_SIZE,
          search: searchQuery,
          status: "all",
        });
        setPrescriptions(data?.prescriptions || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await prescriptionsFirebaseService.stats();
        if (!cancelled && data) setStats(data);
      } catch {
        try {
          const data = await prescriptionsAPI.stats();
          if (!cancelled && data) setStats(data);
        } catch (err) {
          console.error("Stats error:", err);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchPrescriptions(), 300);
    return () => clearTimeout(t);
  }, [fetchPrescriptions]);

  /* =====================================================
     HANDLERS
  ===================================================== */

  // ✅ Add — Firebase & backend la save aagum (PERMANENT)
  const handleAddPrescription = async (newPrescription) => {
    try {
      const created = await prescriptionsFirebaseService.create(newPrescription);
      setPrescriptions((prev) => [created, ...prev]);
      toast.success(`Prescription ${created.id} saved!`);
      setShowAddPrescription(false);
      fetchStats();
      try {
        await prescriptionsAPI.create(newPrescription);
      } catch (_) {}
    } catch (err) {
      toast.error(err.message || "Failed to save prescription");
    }
  };

  // ✅ Delete — backend & Firebase la irundhu remove aagum
  const handleDeletePrescription = async (id) => {
    try {
      await prescriptionsFirebaseService.delete(id);
      setPrescriptions((prev) => prev.filter((rx) => rx.id !== id));
      setSelectedPrescription(null);
      toast.success("Prescription deleted");
      fetchStats();
      try {
        await prescriptionsAPI.delete(id);
      } catch (_) {}
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  // ✅ Update — backend & Firebase la update aagum
  const handleUpdatePrescription = async (updatedRx) => {
    try {
      const saved = await prescriptionsFirebaseService.update(updatedRx.id, updatedRx);
      setPrescriptions((prev) =>
        prev.map((rx) => (rx.id === saved.id ? saved : rx))
      );
      setSelectedPrescription(saved);
      toast.success("Updated");
      fetchStats();
      try {
        await prescriptionsAPI.update(updatedRx.id, updatedRx);
      } catch (_) {}
    } catch (err) {
      toast.error(err.message || "Failed to update");
    }
  };

  /* =====================================================
     STYLES
  ===================================================== */
  const statusStyles = {
    dispensed:
      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40",
    pending:
      "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40",
    cancelled:
      "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/40",
  };

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar onScanClick={() => {}} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Prescriptions
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {stats.total.toLocaleString()} prescriptions in database
            </p>
          </div>
          <button
            onClick={() => setShowAddPrescription(true)}
            className="flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0369a1] transition shadow-xs"
          >
            <Plus size={16} />
            New Prescription
          </button>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Prescriptions
              </span>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-200/60 dark:border-sky-500/25 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <ClipboardList size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {stats.total.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Dispensed
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-200/60 dark:border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {stats.dispensed.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Clock size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
              {stats.pending.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 mb-4 shadow-2xs">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, patient, or doctor..."
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-[#0284c7] focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-[#0284c7]/15"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={40} className="text-[#0284c7] animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptions.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-2xs">
                <ClipboardList
                  size={32}
                  className="text-slate-300 dark:text-slate-600 mx-auto mb-3"
                />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  No prescriptions found
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {searchQuery
                    ? "Try a different search"
                    : "Add your first prescription"}
                </p>
              </div>
            ) : (
              prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  onClick={() => setSelectedPrescription(rx)}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#0284c7] dark:text-sky-400">
                          {rx.id}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            statusStyles[rx.status || "pending"]
                          }`}
                        >
                          {(rx.status || "pending").toUpperCase()}
                        </span>
                        {rx.aiAssisted && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40 inline-flex items-center gap-1">
                            <Brain size={10} />
                            Verified
                          </span>
                        )}
                        {rx.status !== "dispensed" &&
                          rx.medicines?.some((m) => {
                            const s = checkMedicineStock(m).status;
                            return s === "OUT_OF_STOCK" || s === "NOT_FOUND";
                          }) && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 inline-flex items-center gap-1">
                              <AlertCircle size={10} /> Needs Stock
                            </span>
                          )}
                      </div>

                      <div className="flex items-center gap-4 text-sm mb-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <User size={13} className="text-slate-400" />
                          <span className="font-semibold">
                            {rx.patientName || "Unknown"}
                          </span>
                          {rx.patientAge && (
                            <span className="text-slate-400 dark:text-slate-500 font-normal">
                              ({rx.patientAge}y)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Stethoscope size={13} className="text-slate-400" />
                          <span className="text-xs">
                            {rx.doctorName || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Calendar size={13} className="text-slate-400" />
                          <span className="text-xs">{rx.date || "—"}</span>
                        </div>
                      </div>

                      {Array.isArray(rx.medicines) &&
                        rx.medicines.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {rx.medicines.map((med, i) => {
                              const isOutOfStock =
                                rx.status !== "dispensed" &&
                                (() => {
                                  const s = checkMedicineStock(med).status;
                                  return s === "OUT_OF_STOCK" || s === "NOT_FOUND";
                                })();
                              return (
                                <span
                                  key={i}
                                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1.5 ${
                                    isOutOfStock
                                      ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/50"
                                      : "bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70"
                                  }`}
                                >
                                  <span>{med.name}</span>
                                  {isOutOfStock && (
                                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                                      • Low stock
                                    </span>
                                  )}
                                  {med.frequency && (
                                    <span className="text-slate-400 dark:text-slate-500">
                                      · {med.frequency}
                                    </span>
                                  )}
                                  {med.duration && (
                                    <span className="text-slate-400 dark:text-slate-500">
                                      · {med.duration}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPrescription(rx);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-[#0284c7] dark:text-sky-400 hover:underline shrink-0 pt-0.5"
                    >
                      View details
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Add Prescription Modal */}
      {showAddPrescription && (
        <AddPrescriptionModal
          onAdd={handleAddPrescription}
          onClose={() => setShowAddPrescription(false)}
        />
      )}

      {/* Prescription Detail Modal — with onUpdate */}
      {selectedPrescription && (
        <PrescriptionDetailModal
          prescription={selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
          onDelete={handleDeletePrescription}
          onUpdate={handleUpdatePrescription}
        />
      )}
    </div>
  );
}