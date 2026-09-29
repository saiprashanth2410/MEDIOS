import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  ChevronRight,
  Search,
  Plus,
  FileText,
  Clock,
  User,
  Stethoscope,
  Calendar,
  Brain,
  Loader2,
} from "lucide-react";
import AddPrescriptionModal from "../components/prescriptions/AddPrescriptionModal";
import PrescriptionDetailModal from "../components/prescriptions/PrescriptionDetailModal";
import Navbar from "../components/dashboard/Navbar";
import { prescriptionsAPI } from "../services/api";

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
      const data = await prescriptionsAPI.stats();
      setStats(data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  }, []);

  /* =====================================================
     FETCH PRESCRIPTIONS
  ===================================================== */
  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await prescriptionsAPI.list({
        page: 1,
        limit: PAGE_SIZE,
        search: searchQuery,
        status: "all",
      });
      setPrescriptions(data.prescriptions);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await prescriptionsAPI.stats();
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
    const t = setTimeout(() => fetchPrescriptions(), 300);
    return () => clearTimeout(t);
  }, [fetchPrescriptions]);

  /* =====================================================
     HANDLERS
  ===================================================== */

  // ✅ Add — backend la save aagum (PERMANENT)
  const handleAddPrescription = async (newPrescription) => {
    try {
      const created = await prescriptionsAPI.create(newPrescription);
      setPrescriptions((prev) => [created, ...prev]);
      toast.success(`Prescription ${created.id} saved!`);
      setShowAddPrescription(false);
      fetchStats();
    } catch (err) {
      toast.error(err.message || "Failed to save prescription");
    }
  };

  // ✅ Delete — backend la irundhu remove aagum
  const handleDeletePrescription = async (id) => {
    try {
      await prescriptionsAPI.delete(id);
      setPrescriptions((prev) => prev.filter((rx) => rx.id !== id));
      setSelectedPrescription(null);
      toast.success("Prescription deleted");
      fetchStats();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  // ✅ Update — backend la update aagum
  const handleUpdatePrescription = async (updatedRx) => {
    try {
      const saved = await prescriptionsAPI.update(updatedRx.id, updatedRx);
      setPrescriptions((prev) =>
        prev.map((rx) => (rx.id === saved.id ? saved : rx))
      );
      setSelectedPrescription(saved);
      toast.success("Updated");
      fetchStats();
    } catch (err) {
      toast.error(err.message || "Failed to update");
    }
  };

  /* =====================================================
     STYLES
  ===================================================== */
  const statusStyles = {
    dispensed: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    cancelled: "bg-rose-50 text-rose-700",
  };

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 text-slate-900 dark:text-white">
      <Navbar onScanClick={() => {}} />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prescriptions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {stats.total.toLocaleString()} prescriptions in database
            </p>
          </div>
          <button
            onClick={() => setShowAddPrescription(true)}
            className="flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-[#0369a1] transition shadow-sm"
          >
            <Plus size={16} />
            New Prescription
          </button>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-sky-50 flex items-center justify-center">
                <ClipboardList size={18} className="text-[#0284c7]" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total
              </span>
            </div>
            <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-emerald-50 flex items-center justify-center">
                <FileText size={18} className="text-emerald-600" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Dispensed
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {stats.dispensed.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-amber-50 flex items-center justify-center">
                <Clock size={18} className="text-amber-600" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Pending
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {stats.pending.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-4 mb-4 shadow-sm">
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
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 text-sm outline-none transition focus:border-[#0284c7] focus:bg-white dark:bg-slate-900 focus:ring-4 focus:ring-[#0284c7]/10"
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
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-12 text-center shadow-sm">
                <ClipboardList
                  size={32}
                  className="text-slate-300 mx-auto mb-3"
                />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                  className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#0284c7]">
                          {rx.id}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            statusStyles[rx.status || "pending"]
                          }`}
                        >
                          {(rx.status || "pending").toUpperCase()}
                        </span>
                        {rx.aiAssisted && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 flex items-center gap-1">
                            <Brain size={10} />
                            AI
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm mb-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span className="font-semibold">
                            {rx.patientName || "Unknown"}
                          </span>
                          {rx.patientAge && (
                            <span className="text-slate-400">
                              ({rx.patientAge})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Stethoscope size={13} />
                          <span className="text-xs">
                            {rx.doctorName || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar size={13} />
                          <span className="text-xs">{rx.date || "—"}</span>
                        </div>
                      </div>

                      {Array.isArray(rx.medicines) &&
                        rx.medicines.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {rx.medicines.map((med, i) => (
                              <span
                                key={i}
                                className="text-[11px] px-2 py-1 rounded-md bg-sky-50 text-sky-800 font-medium"
                              >
                                {med.name}
                                {med.frequency && ` · ${med.frequency}`}
                                {med.duration && ` · ${med.duration}`}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPrescription(rx);
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-[#0284c7] hover:underline shrink-0"
                    >
                      View
                      <ChevronRight size={12} />
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