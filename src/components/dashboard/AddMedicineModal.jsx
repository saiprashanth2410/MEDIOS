import { useState, useEffect, useId } from "react";
import { toast } from "sonner";
import {
  X,
  Pill,
  Building2,
  Package,
  Calendar,
  Hash,
  IndianRupee,
  Tag,
  MapPin,
  CheckCircle2,
} from "lucide-react";

const FIELD_BASE =
  "w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none transition focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 placeholder:text-slate-400 dark:text-slate-500";

const LABEL_BASE = "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5";

export default function AddMedicineModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: "",
    generic: "",
    manufacturer: "",
    batch: "",
    expiry: "",
    stock: "",
    price: "",
    category: "Antibiotic",
    schedule: "OTC",
    rack: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const nameId = useId();
  const genericId = useId();
  const manufacturerId = useId();
  const batchId = useId();
  const expiryId = useId();
  const stockId = useId();
  const priceId = useId();
  const categoryId = useId();
  const scheduleId = useId();
  const rackId = useId();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Medicine name is required";
    if (!form.generic.trim()) e.generic = "Generic name is required";
    if (!form.manufacturer.trim()) e.manufacturer = "Manufacturer is required";
    if (!form.batch.trim()) e.batch = "Batch number is required";
    if (!form.expiry) e.expiry = "Expiry date is required";
    if (!form.stock || Number(form.stock) <= 0)
      e.stock = "Stock must be greater than 0";
    if (!form.price || Number(form.price) <= 0)
      e.price = "Price must be greater than 0";
    if (!form.rack.trim()) e.rack = "Rack location is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the errors below");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const newMedicine = {
        id: `MED-${Date.now().toString().slice(-6)}`,
        barcode: `890${Date.now().toString().slice(-10)}`,
        name: form.name.trim(),
        generic: form.generic.trim(),
        manufacturer: form.manufacturer.trim(),
        batch: form.batch.trim(),
        expiry: form.expiry,
        stock: Number(form.stock),
        price: Number(form.price),
        category: form.category,
        schedule: form.schedule,
        rack: form.rack.trim(),
      };
      onAdd?.(newMedicine);
      toast.success(`${newMedicine.name} added successfully!`);
      onClose?.();
    } catch {
      toast.error("Failed to add medicine. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl my-8 shadow-2xl">

        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center">
              <Pill size={20} className="text-[#0284c7]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Add New Medicine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Fill in the details below
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X size={18} className="text-slate-500 dark:text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2">
              <label htmlFor={nameId} className={LABEL_BASE}>
                Medicine Name *
              </label>
              <div className="relative">
                <Pill
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  id={nameId}
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Amoxicillin 500mg"
                  className={`${FIELD_BASE} pl-11 ${
                    errors.name ? "border-rose-300" : ""
                  }`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor={genericId} className={LABEL_BASE}>
                Generic Name *
              </label>
              <input
                id={genericId}
                type="text"
                value={form.generic}
                onChange={(e) => update("generic", e.target.value)}
                placeholder="Amoxicillin"
                className={`${FIELD_BASE} ${
                  errors.generic ? "border-rose-300" : ""
                }`}
              />
              {errors.generic && (
                <p className="mt-1 text-xs text-rose-600">{errors.generic}</p>
              )}
            </div>

            <div>
              <label htmlFor={manufacturerId} className={LABEL_BASE}>
                Manufacturer *
              </label>
              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  id={manufacturerId}
                  type="text"
                  value={form.manufacturer}
                  onChange={(e) => update("manufacturer", e.target.value)}
                  placeholder="Cipla Ltd"
                  className={`${FIELD_BASE} pl-11 ${
                    errors.manufacturer ? "border-rose-300" : ""
                  }`}
                />
              </div>
              {errors.manufacturer && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.manufacturer}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={batchId} className={LABEL_BASE}>
                Batch Number *
              </label>
              <div className="relative">
                <Hash
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  id={batchId}
                  type="text"
                  value={form.batch}
                  onChange={(e) => update("batch", e.target.value)}
                  placeholder="AMX-2026-042"
                  className={`${FIELD_BASE} pl-11 ${
                    errors.batch ? "border-rose-300" : ""
                  }`}
                />
              </div>
              {errors.batch && (
                <p className="mt-1 text-xs text-rose-600">{errors.batch}</p>
              )}
            </div>

            <div>
              <label htmlFor={expiryId} className={LABEL_BASE}>
                Expiry Date *
              </label>
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                />
                <input
                  id={expiryId}
                  type="date"
                  value={form.expiry}
                  onChange={(e) => update("expiry", e.target.value)}
                  className={`${FIELD_BASE} pl-11 ${
                    errors.expiry ? "border-rose-300" : ""
                  }`}
                />
              </div>
              {errors.expiry && (
                <p className="mt-1 text-xs text-rose-600">{errors.expiry}</p>
              )}
            </div>

            <div>
              <label htmlFor={stockId} className={LABEL_BASE}>
                Stock Quantity *
              </label>
              <div className="relative">
                <Package
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  id={stockId}
                  type="number"
                  value={form.stock}
                  onChange={(e) => update("stock", e.target.value)}
                  placeholder="240"
                  min="1"
                  className={`${FIELD_BASE} pl-11 ${
                    errors.stock ? "border-rose-300" : ""
                  }`}
                />
              </div>
              {errors.stock && (
                <p className="mt-1 text-xs text-rose-600">{errors.stock}</p>
              )}
            </div>

            <div>
              <label htmlFor={priceId} className={LABEL_BASE}>
                Unit Price (₹) *
              </label>
              <div className="relative">
                <IndianRupee
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  id={priceId}
                  type="number"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  placeholder="45.00"
                  step="0.01"
                  min="0"
                  className={`${FIELD_BASE} pl-11 ${
                    errors.price ? "border-rose-300" : ""
                  }`}
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-xs text-rose-600">{errors.price}</p>
              )}
            </div>

            <div>
              <label htmlFor={categoryId} className={LABEL_BASE}>
                Category
              </label>
              <div className="relative">
                <Tag
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                />
                <select
                  id={categoryId}
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className={`${FIELD_BASE} pl-11 appearance-none cursor-pointer`}
                >
                  <option>Antibiotic</option>
                  <option>Analgesic</option>
                  <option>Antidiabetic</option>
                  <option>Antihistamine</option>
                  <option>Antiseptic</option>
                  <option>Cardiac</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor={scheduleId} className={LABEL_BASE}>
                Drug Schedule
              </label>
              <select
                id={scheduleId}
                value={form.schedule}
                onChange={(e) => update("schedule", e.target.value)}
                className={`${FIELD_BASE} appearance-none cursor-pointer`}
              >
                <option value="OTC">OTC (Over the counter)</option>
                <option value="H">Schedule H</option>
                <option value="H1">Schedule H1</option>
                <option value="X">Schedule X</option>
              </select>
            </div>

            <div>
              <label htmlFor={rackId} className={LABEL_BASE}>
                Rack Location *
              </label>
              <div className="relative">
                <MapPin
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  id={rackId}
                  type="text"
                  value={form.rack}
                  onChange={(e) => update("rack", e.target.value)}
                  placeholder="A-12"
                  className={`${FIELD_BASE} pl-11 ${
                    errors.rack ? "border-rose-300" : ""
                  }`}
                />
              </div>
              {errors.rack && (
                <p className="mt-1 text-xs text-rose-600">{errors.rack}</p>
              )}
            </div>

          </div>

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-sky-50 border border-sky-100 dark:border-slate-800 px-4 py-3">
            <CheckCircle2
              size={14}
              className="text-[#0284c7] mt-0.5 shrink-0"
            />
            <p className="text-xs text-sky-800">
              Barcode will be auto-generated for this medicine.
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-12 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Pill size={16} />
                  Add Medicine
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}