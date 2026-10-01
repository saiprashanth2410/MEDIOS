import { useState, useMemo } from "react";
import { Pill, CheckCircle2, AlertTriangle, XCircle, ArrowRightLeft, PlusCircle, Check, Sparkles } from "lucide-react";
import { checkMedicineStock, findSubstitutes, addMedicineToReorder } from "../../utils/inventoryDeduction";
import { toast } from "sonner";

export default function PrescriptionMedicineRow({
  med,
  index,
  isDispensed = false,
  onSwap,
}) {
  const [reordered, setReordered] = useState(false);

  // Compute live stock information
  const stockInfo = useMemo(() => {
    return checkMedicineStock(med);
  }, [med]);

  // Compute substitutes if unavailable
  const substitutes = useMemo(() => {
    if (stockInfo.status === "OUT_OF_STOCK" || stockInfo.status === "NOT_FOUND") {
      return findSubstitutes(med, 2);
    }
    return [];
  }, [med, stockInfo.status]);

  const handleReorder = () => {
    const success = addMedicineToReorder(med.name, stockInfo.requestedQty);
    if (success) {
      setReordered(true);
      toast.success(`Added "${med.name}" to pharmacy reorder list!`);
    } else {
      toast.error("Failed to add to reorder list");
    }
  };

  const getStatusBadge = () => {
    switch (stockInfo.status) {
      case "IN_STOCK":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={12} />
            In Stock ({stockInfo.availableStock} available)
          </span>
        );
      case "LOW_STOCK":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={12} />
            Low Stock ({stockInfo.availableStock} left · needs {stockInfo.requestedQty})
          </span>
        );
      case "OUT_OF_STOCK":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <XCircle size={12} />
            Out of Stock
          </span>
        );
      case "NOT_FOUND":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <XCircle size={12} />
            Not in Inventory
          </span>
        );
    }
  };

  const isUnavailable =
    stockInfo.status === "OUT_OF_STOCK" || stockInfo.status === "NOT_FOUND";

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        isUnavailable && !isDispensed
          ? "bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/80 dark:border-rose-900/50"
          : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isUnavailable && !isDispensed
                ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600"
                : "bg-sky-50 dark:bg-sky-950/40 text-[#0284c7]"
            }`}
          >
            <Pill size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {med.name}
              </p>
              {med.substituted && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                  <ArrowRightLeft size={10} /> Substituted
                </span>
              )}
            </div>

            {med.originalPrescribed && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Originally prescribed: <span className="font-medium line-through">{med.originalPrescribed}</span>
              </p>
            )}

            {/* Dosage & Duration details */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {med.dosage && (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                  Dosage: {med.dosage}
                </span>
              )}
              {med.frequency && (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40">
                  {med.frequency}
                </span>
              )}
              {med.duration && (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                  {med.duration}
                </span>
              )}
              {med.instructions && (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                  {med.instructions}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {getStatusBadge()}
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Req: {stockInfo.requestedQty} units
          </span>
        </div>
      </div>

      {/* Out of Stock Actions & Substitute Suggestions */}
      {isUnavailable && !isDispensed && (
        <div className="mt-3 pt-3 border-t border-rose-100 dark:border-rose-900/40 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              Prescribed brand is unavailable in current inventory
            </span>

            <button
              type="button"
              onClick={handleReorder}
              disabled={reordered}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 shadow-2xs ${
                reordered
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-50"
              }`}
            >
              {reordered ? (
                <>
                  <Check size={12} /> Reordered (+{Math.max(50, stockInfo.requestedQty * 2)})
                </>
              ) : (
                <>
                  <PlusCircle size={12} /> + Add to Reorder
                </>
              )}
            </button>
          </div>

          {/* Substitute Recommendation Card */}
          {substitutes.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500 shrink-0" />
                In-Stock Generic / Salt Substitutes Available:
              </p>
              {substitutes.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-sky-50/50 dark:bg-slate-800/60 border border-sky-100/80 dark:border-slate-700/80 gap-2 flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {sub.name}{" "}
                      <span className="font-normal text-slate-500 text-[11px]">
                        ({sub.generic || sub.category})
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Stock: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{sub.stock}</span> · Rack:{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{sub.rack}</span> · ₹{sub.price} ·{" "}
                      <span className="text-sky-600 dark:text-sky-400">{sub.matchReason}</span>
                    </p>
                  </div>
                  {onSwap && (
                    <button
                      type="button"
                      onClick={() => onSwap(index, sub)}
                      className="shrink-0 bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition shadow-2xs flex items-center gap-1"
                    >
                      <ArrowRightLeft size={11} />
                      Swap Medicine
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

