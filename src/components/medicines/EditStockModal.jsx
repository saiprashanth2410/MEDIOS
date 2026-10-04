import { useState, useEffect } from "react";
import {
  X,
  Package,
  MapPin,
  Plus,
  Minus,
  Loader2,
  Save,
  AlertCircle,
  Pill,
  IndianRupee,
  Calendar,
  Building2,
} from "lucide-react";

export default function EditStockModal({ medicine, isOpen, onClose, onSave }) {
  const [stock, setStock] = useState(() => Number(medicine?.stock) || 0);
  const [batch, setBatch] = useState(() => medicine?.batch || "");
  const [rack, setRack] = useState(() => medicine?.rack || "");
  const [price, setPrice] = useState(() => Number(medicine?.price) || 0);
  const [expiry, setExpiry] = useState(() => medicine?.expiry || "");
  const [manufacturer, setManufacturer] = useState(() => medicine?.manufacturer || "");
  const [saving, setSaving] = useState(false);

  // Synchronize state when medicine changes
  useEffect(() => {
    if (medicine) {
      setStock(Number(medicine.stock) || 0);
      setBatch(medicine.batch || "");
      setRack(medicine.rack || "");
      setPrice(Number(medicine.price) || 0);
      setExpiry(medicine.expiry || "");
      setManufacturer(medicine.manufacturer || "");
    }
  }, [medicine]);

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
      await onSave(
        medicine.id,
        stock,
        batch,
        rack,
        price,
        expiry,
        manufacturer
      );
      onClose();
    } catch (err) {
      console.error("Save stock error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-medicine-title"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden my-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 text-[#0284c7] dark:text-sky-400 flex items-center justify-center shrink-0">
              <Pill size={18} />
            </div>
            <div>
              <h3 id="edit-medicine-title" className="text-base font-bold text-slate-800 dark:text-slate-100">
                Edit Medicine & Inventory
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                {medicine.name} {medicine.generic ? `— ${medicine.generic}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close modal (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Stock Counter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Available Stock (Units)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleAdjust(-1)}
                className="w-11 h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer shadow-xs"
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
                className="w-11 h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer shadow-xs"
                title="Increase 1"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Quick Add Buttons for Incoming Stock */}
            <div className="mt-2.5">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-1.5">
                Quick add shipment received:
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[10, 25, 50, 100, 200].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAdd(amt)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition border border-sky-200 dark:border-sky-800/60 cursor-pointer shadow-2xs"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Price & Expiry Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Selling Price / MRP (₹)
              </label>
              <div className="relative">
                <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0284c7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Expiry Date
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0284c7]"
                />
              </div>
            </div>
          </div>

          {/* Batch & Rack Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#0284c7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Rack / Shelf Location
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={rack}
                  onChange={(e) => setRack(e.target.value)}
                  placeholder="e.g. A-01"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#0284c7]"
                />
              </div>
            </div>
          </div>

          {/* Manufacturer / Supplier */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Manufacturer / Brand
            </label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Micro Labs Ltd"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>
          </div>

          {/* Info note */}
          <div className="bg-sky-50/70 dark:bg-sky-950/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40">
            <AlertCircle size={15} className="text-[#0284c7] dark:text-sky-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Updates sync immediately across Retail POS billing, inventory counts, and expiry tracking.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-semibold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Update Medicine</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
