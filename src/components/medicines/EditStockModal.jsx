import { useState, useEffect } from "react";
import { X, Package, MapPin, Plus, Minus, Loader2, Save, AlertCircle } from "lucide-react";

export default function EditStockModal({ medicine, isOpen, onClose, onSave }) {
  const [stock, setStock] = useState(0);
  const [batch, setBatch] = useState("");
  const [rack, setRack] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (medicine) {
        setStock(Number(medicine.stock) || 0);
        setBatch(medicine.batch || "");
        setRack(medicine.rack || "");
      }
    });
  }, [medicine]);

  if (!isOpen || !medicine) return null;

  const handleAdjust = (delta) => {
    setStock((prev) => Math.max(0, prev + delta));
  };

  const handleQuickAdd = (amount) => {
    setStock((prev) => Math.max(0, prev + amount));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave(medicine.id, stock, batch, rack);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-sky-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Update Medicine Stock
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
              {medicine.name} — {medicine.generic}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Stock Counter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Available Stock (Units)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleAdjust(-1)}
                className="w-11 h-11 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
                title="Decrease 1"
              >
                <Minus size={18} />
              </button>
              
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 h-11 text-center font-bold text-lg border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284c7] text-slate-900 dark:text-white"
                required
              />

              <button
                type="button"
                onClick={() => handleAdjust(1)}
                className="w-11 h-11 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
                title="Increase 1"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Quick Add Buttons for Incoming Stock */}
            <div className="mt-3">
              <p className="text-[11px] text-slate-400 mb-1.5">Quick add incoming shipment:</p>
              <div className="flex items-center gap-2 flex-wrap">
                {[10, 25, 50, 100, 200].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAdd(amt)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-50 text-[#0284c7] hover:bg-sky-100 transition border border-sky-200"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Batch & Rack Details */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Batch Number
              </label>
              <div className="relative">
                <Package size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  placeholder="e.g. BATCH-1001"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Rack / Shelf
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={rack}
                  onChange={(e) => setRack(e.target.value)}
                  placeholder="e.g. R-1"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                />
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
            <AlertCircle size={15} className="text-[#0284c7] shrink-0 mt-0.5" />
            <p>
              Changes are immediately synced and stored in the backend MongoDB database.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Update Stock</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
