import { useState, useEffect, useMemo } from "react";
import {
  Trash2,
  RotateCcw,
  Clock,
  Calendar,
  AlertTriangle,
  Search,
  RefreshCw,
  Package,
  History,
  ShieldCheck,
  Building2,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { recycleBinService } from "../../services/recycleBinService";

export default function RecycleBinSection({ onRestoreItem }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchRecycleBin = async () => {
    try {
      setLoading(true);
      const list = await recycleBinService.list();
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      console.debug("Failed fetching recycle bin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecycleBin();

    const handleUpdate = () => {
      fetchRecycleBin();
    };

    window.addEventListener("meditrack_recycle_bin_updated", handleUpdate);
    return () => {
      window.removeEventListener("meditrack_recycle_bin_updated", handleUpdate);
    };
  }, []);

  const handleRestore = async (item) => {
    try {
      setRestoringId(item.id);
      const restored = await recycleBinService.restore(item.id);
      if (restored) {
        onRestoreItem?.(restored);
        toast.success(
          `Restored: ${item.medicineName} (${item.batchNumber}) back to active inventory!`
        );
      }
      fetchRecycleBin();
    } catch (err) {
      console.error("Restore failed:", err);
      toast.error("Failed to restore item.");
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteForever = async (trashId, name) => {
    if (
      !window.confirm(
        `Permanently delete "${name}" from audit log? This action CANNOT be undone.`
      )
    ) {
      return;
    }
    try {
      await recycleBinService.deleteForever(trashId);
      toast.success("Record permanently removed.");
      fetchRecycleBin();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed.");
    }
  };

  const handleEmptyTrash = async () => {
    if (items.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to permanently clear all ${items.length} deleted records from the Recycle Bin?`
      )
    ) {
      return;
    }
    try {
      await recycleBinService.emptyTrash();
      toast.success("Recycle Bin emptied.");
      fetchRecycleBin();
    } catch (err) {
      console.error(err);
      toast.error("Failed to empty recycle bin.");
    }
  };

  // Filtered & grouped items
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.medicineName?.toLowerCase().includes(q) ||
        i.batchNumber?.toLowerCase().includes(q) ||
        i.supplier?.toLowerCase().includes(q)
    );
  }, [items, search]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups = {};
    filteredItems.forEach((item) => {
      const d = item.deletedAt ? new Date(item.deletedAt) : new Date();
      const dateKey = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  }, [filteredItems]);

  return (
    <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      {/* Header bar */}
      <div className="px-6 py-4.5 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800/40 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <History size={19} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Recycle Bin & Deletion Audit Log
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
                {items.length} {items.length === 1 ? "deleted item" : "deleted items"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Accidentally removed a batch or medicine? Recover it instantly with full stock & FEFO history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleEmptyTrash}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              title="Permanently remove all deleted records"
            >
              Empty Bin
            </button>
          )}

          <button
            type="button"
            onClick={fetchRecycleBin}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Refresh recycle bin"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((o) => !o)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-6">
          {/* Search bar & info */}
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search deleted medicines, batches, or suppliers..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>

            <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Database protected: Restore brings batch back with original price & location</span>
            </div>
          </div>

          {/* List or Empty State */}
          {items.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Recycle Bin is Clean
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                No deleted medicines or batches. Any record removed from the expiry tracking list will be logged here for 1-click recovery.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No deleted items match "{search}".
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([dateLabel, groupItems]) => (
                <div key={dateLabel} className="space-y-2.5">
                  {/* Date badge */}
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Deleted on {dateLabel}
                    </span>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 ml-2" />
                  </div>

                  {/* Table/Cards */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/70 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    {groupItems.map((item) => {
                      const isRestoring = restoringId === item.id;
                      const timeStr = item.deletedAt
                        ? new Date(item.deletedAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "";

                      return (
                        <div
                          key={item.id}
                          className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition flex-wrap sm:flex-nowrap"
                        >
                          {/* Medicine Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                {item.medicineName}
                              </p>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                                {item.batchNumber || "No Batch"}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/50">
                                {item.status || "Expired"}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                              <span>
                                Qty: <strong className="text-slate-700 dark:text-slate-200">{item.quantity} units</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Value: <strong className="text-[#0284c7] dark:text-sky-400">₹{(item.atRiskValue || 0).toLocaleString("en-IN")}</strong>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                <span>Expires: {item.expiryDate || "N/A"}</span>
                              </span>
                              {item.supplier && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Building2 size={11} />
                                    <span className="truncate max-w-[150px]">{item.supplier}</span>
                                  </span>
                                </>
                              )}
                              {item.location && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 font-mono text-[11px]">
                                    <MapPin size={11} />
                                    <span>{item.location}</span>
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                              <span>Deleted at {timeStr}</span>
                              <span>•</span>
                              <span>By: {item.deletedBy || "Pharmacist"}</span>
                              {item.deletionReason && (
                                <>
                                  <span>•</span>
                                  <span className="italic">"{item.deletionReason}"</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Recover / Restore Button */}
                            <button
                              type="button"
                              onClick={() => handleRestore(item)}
                              disabled={isRestoring}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                              title="Restore back to active inventory"
                            >
                              <RotateCcw
                                size={14}
                                className={isRestoring ? "animate-spin" : ""}
                              />
                              <span>{isRestoring ? "Restoring..." : "Restore"}</span>
                            </button>

                            {/* Delete Forever Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteForever(item.id, item.medicineName)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                              title="Delete permanently"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
