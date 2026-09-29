import { useState } from "react";
import { X, Factory, Phone, Mail, MapPin, User, FileText, Save } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Pharmaceutical",
  "Distributor",
  "Wholesaler",
  "Medical Equipment",
  "Other",
];

const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "COD", "Advance"];

export default function AddSupplierModal({ onAdd, onClose }) {
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    gst: "",
    license: "",
    category: "Pharmaceutical",
    status: "active",
    paymentTerms: "Net 30",
    productsCount: 0,
    totalOrders: 0,
    rating: 0,
    joinedDate: new Date().toISOString().split("T")[0],
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }

    onAdd(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0284c7] flex items-center justify-center shrink-0">
              <Factory size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Add New Supplier
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fill in the supplier details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Supplier Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Factory
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Cipla Ltd"
                className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
              />
            </div>
          </div>

          {/* Contact + Phone */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Person
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={form.contactPerson}
                  onChange={(e) => handleChange("contactPerson", e.target.value)}
                  placeholder="Full name"
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="orders@supplier.com"
                className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Address
            </label>
            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="City, State"
                className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
              />
            </div>
          </div>

          {/* GST + License */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                GST Number
              </label>
              <div className="relative">
                <FileText
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={form.gst}
                  onChange={(e) => handleChange("gst", e.target.value.toUpperCase())}
                  placeholder="27AAACC1234F1Z5"
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Drug License
              </label>
              <div className="relative">
                <FileText
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={form.license}
                  onChange={(e) => handleChange("license", e.target.value)}
                  placeholder="MH/DL/2020/1234"
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
                />
              </div>
            </div>
          </div>

          {/* Category + Payment Terms */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Terms
              </label>
              <select
                value={form.paymentTerms}
                onChange={(e) => handleChange("paymentTerms", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
              >
                {PAYMENT_TERMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Status
            </label>
            <div className="flex items-center gap-2">
              {["active", "pending", "inactive"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleChange("status", s)}
                  className={`flex-1 h-10 rounded-lg text-xs font-semibold capitalize transition ${
                    form.status === s
                      ? "bg-[#0284c7] text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-lg bg-[#0284c7] text-white text-sm font-semibold hover:bg-[#0369a1] transition flex items-center justify-center gap-2"
            >
              <Save size={14} />
              Add Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}