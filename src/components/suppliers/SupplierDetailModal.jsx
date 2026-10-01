import { useState } from "react";
import {
  X,
  Factory,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  Star,
  Package,
  Truck,
  Trash2,
  Edit3,
  Save,
  Calendar,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

export default function SupplierDetailModal({
  supplier: initialSupplier,
  onClose,
  onUpdate,
  onDelete,
}) {
  const [supplier, setSupplier] = useState(initialSupplier);
  const [editing, setEditing] = useState(false);

  if (!supplier) return null;

  const statusConfig = {
    active: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200/60 dark:border-emerald-800/40",
      icon: CheckCircle2,
      label: "ACTIVE",
    },
    pending: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200/60 dark:border-amber-800/40",
      icon: Clock,
      label: "PENDING",
    },
    inactive: {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-600 dark:text-slate-300",
      border: "border-slate-200/60 dark:border-slate-700",
      icon: Clock,
      label: "INACTIVE",
    },
  };

  const status = statusConfig[supplier.status] || statusConfig.inactive;
  const StatusIcon = status.icon;

  const handleChange = (field, value) => {
    setSupplier((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setEditing(false);
    onUpdate?.(supplier);
    toast.success("Supplier updated successfully!");
  };

  const handleDelete = () => {
    if (window.confirm(`Delete ${supplier.name}?`)) {
      onDelete?.(supplier.id);
      toast.success("Supplier deleted");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/50 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0284c7] flex items-center justify-center shrink-0 shadow-2xs">
              <Factory size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {supplier.name}
                </h2>
                <span
                  className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${status.bg} ${status.text} ${status.border}`}
                >
                  <StatusIcon size={10} />
                  {status.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {supplier.id} · {supplier.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Actions */}
        <div className="px-6 py-3 flex items-center gap-2 flex-wrap border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 bg-[#0284c7] text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-[#0369a1] transition"
            >
              <Edit3 size={13} />
              Edit
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
            >
              <Save size={13} />
              Save
            </button>
          )}
          <button
            onClick={() => toast.success("Order form coming soon")}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
          >
            <Truck size={13} />
            New Order
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition ml-auto"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Contact Info */}
          <Section icon={User} title="Contact Information">
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow
                icon={User}
                label="Contact Person"
                value={supplier.contactPerson}
                editing={editing}
                onChange={(v) => handleChange("contactPerson", v)}
              />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={supplier.phone}
                editing={editing}
                onChange={(v) => handleChange("phone", v)}
              />
              <InfoRow
                icon={Mail}
                label="Email"
                value={supplier.email}
                editing={editing}
                onChange={(v) => handleChange("email", v)}
              />
              <InfoRow
                icon={MapPin}
                label="Address"
                value={supplier.address}
                editing={editing}
                onChange={(v) => handleChange("address", v)}
              />
            </div>
          </Section>

          {/* Business Details */}
          <Section icon={Building2} title="Business Details">
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow
                icon={FileText}
                label="GST Number"
                value={supplier.gst}
                editing={editing}
                onChange={(v) => handleChange("gst", v.toUpperCase())}
              />
              <InfoRow
                icon={FileText}
                label="Drug License"
                value={supplier.license}
                editing={editing}
                onChange={(v) => handleChange("license", v)}
              />
              <InfoRow
                icon={CreditCard}
                label="Payment Terms"
                value={supplier.paymentTerms}
                editing={editing}
                onChange={(v) => handleChange("paymentTerms", v)}
              />
              <InfoRow
                icon={Calendar}
                label="Joined"
                value={supplier.joinedDate}
                editing={false}
              />
            </div>
          </Section>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={Package}
              label="Products"
              value={supplier.productsCount || 0}
              color="sky"
            />
            <StatCard
              icon={Truck}
              label="Orders"
              value={supplier.totalOrders || 0}
              color="violet"
            />
            <StatCard
              icon={Star}
              label="Rating"
              value={`${supplier.rating || 0}/5`}
              color="amber"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          {Icon && <Icon size={14} className="text-[#0284c7] dark:text-sky-400" />}
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, editing, onChange }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} className="text-slate-400" />
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </p>
      </div>
      {editing && onChange ? (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/10"
        />
      ) : (
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = "sky" }) {
  const colors = {
    sky: "bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-400 border-sky-200/60 dark:border-sky-800/40",
    violet: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200/60 dark:border-violet-800/40",
    amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40",
    emerald: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40",
  };

  return (
    <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 border ${
          colors[color] || colors.sky
        }`}
      >
        <Icon size={14} />
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
      <p className="text-base font-bold text-slate-800 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}