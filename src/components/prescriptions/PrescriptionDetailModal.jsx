import { useState } from "react";
import {
  X,
  User,
  Stethoscope,
  Pill,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  Download,
  Share2,
  Trash2,
  FileText,
  Phone,
  Mail,
  MapPin,
  Building2,
  ShieldCheck,
  Info,
} from "lucide-react";
import { toast } from "sonner";

/* =====================================================
   MAIN MODAL COMPONENT
===================================================== */

export default function PrescriptionDetailModal({
  prescription: initialPrescription,
  onClose,
  onDelete,
  onUpdate, // ✅ NEW — notify parent
}) {
  const [prescription, setPrescription] = useState(initialPrescription);

  if (!prescription) return null;

  /* =====================================================
     HANDLERS
  ===================================================== */

  const handleDispense = () => {
    const updated = { ...prescription, status: "dispensed" };
    setPrescription(updated);
    onUpdate?.(updated); // ✅ Notify parent to update list
    toast.success("Prescription dispensed successfully!");
  };

  const handlePrint = () => toast.success("Printing prescription...");
  const handleShare = () => toast.success("Share link copied!");
  const handleDownload = () => toast.success("Downloading PDF...");

  const handleDelete = () => {
    if (window.confirm("Delete this prescription?")) {
      toast.success("Prescription deleted");
      onDelete?.(prescription.id);
      onClose();
    }
  };

  /* =====================================================
     STATUS CONFIG
  ===================================================== */

  const statusConfig = {
    dispensed: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: CheckCircle2,
      label: "DISPENSED",
    },
    pending: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-700 dark:text-amber-400",
      icon: Clock,
      label: "PENDING",
    },
    cancelled: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      text: "text-rose-700 dark:text-rose-400",
      icon: AlertCircle,
      label: "CANCELLED",
    },
  };

  const status = statusConfig[prescription.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0284c7] flex items-center justify-center shrink-0">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {prescription.id}
                </h2>
                {prescription.aiAssisted && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 flex items-center gap-1">
                    <ShieldCheck size={10} />
                    AI Assisted
                  </span>
                )}
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${status.bg} ${status.text}`}
                >
                  <StatusIcon size={10} />
                  {status.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Prescription Details
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* ACTION BAR */}
        <div className="px-6 py-3 flex items-center gap-2 flex-wrap border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          {prescription.status === "pending" && (
            <button
              onClick={handleDispense}
              className="flex items-center gap-2 bg-[#0284c7] text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-[#0369a1] transition"
            >
              <CheckCircle2 size={13} />
              Mark as Dispensed
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
          >
            <Printer size={13} />
            Print
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
          >
            <Download size={13} />
            Download
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
          >
            <Share2 size={13} />
            Share
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition ml-auto"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* LEFT */}
            <div className="lg:col-span-2 space-y-5">
              {/* Patient */}
              <Section icon={User} title="Patient Information">
                <div className="grid sm:grid-cols-2 gap-4">
                  <InfoRow icon={User} label="Name" value={prescription.patientName} />
                  <InfoRow
                    icon={Info}
                    label="Age / Gender"
                    value={`${prescription.patientAge || "—"} · ${prescription.patientGender || "—"}`}
                  />
                  <InfoRow icon={Phone} label="Phone" value={prescription.patientPhone || "—"} />
                  <InfoRow icon={Mail} label="Email" value={prescription.patientEmail || "—"} />
                  <InfoRow
                    icon={MapPin}
                    label="Address"
                    value={prescription.patientAddress || "—"}
                    className="sm:col-span-2"
                  />
                </div>
              </Section>

              {/* Doctor */}
              <Section icon={Stethoscope} title="Prescribed By">
                <div className="grid sm:grid-cols-2 gap-4">
                  <InfoRow icon={Stethoscope} label="Doctor" value={prescription.doctorName} />
                  <InfoRow
                    icon={ShieldCheck}
                    label="Specialization"
                    value={prescription.doctorSpecialization || "—"}
                  />
                  <InfoRow icon={Building2} label="Hospital" value={prescription.hospital || "—"} />
                  <InfoRow
                    icon={ShieldCheck}
                    label="License"
                    value={prescription.doctorReg || "—"}
                  />
                </div>
              </Section>

              {/* Medicines */}
              <Section
                icon={Pill}
                title="Prescribed Medicines"
                badge={`${prescription.medicines?.length || 0} items`}
              >
                <div className="space-y-3">
                  {prescription.medicines?.map((med, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Pill size={15} className="text-[#0284c7]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {med.name}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {med.frequency && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                              {med.frequency}
                            </span>
                          )}
                          {med.duration && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                              {med.duration}
                            </span>
                          )}
                          {med.instructions && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                              {med.instructions}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Notes */}
              {prescription.notes && (
                <Section icon={FileText} title="Doctor's Notes">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {prescription.notes}
                  </p>
                </Section>
              )}
            </div>

            {/* RIGHT — Summary */}
            <div className="space-y-5">
              <Section title="Summary">
                <div className="space-y-3">
                  <SummaryRow label="Prescription ID" value={prescription.id} />
                  <SummaryRow label="Date" value={prescription.date} />
                  <SummaryRow label="Diagnosis" value={prescription.diagnosis || "—"} />
                  <SummaryRow
                    label="Total Medicines"
                    value={prescription.medicines?.length || 0}
                  />
                  <SummaryRow
                    label="Status"
                    badge={
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${status.bg} ${status.text}`}
                      >
                        {status.label}
                      </span>
                    }
                  />
                </div>
              </Section>

              <Section title="Verification">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>
                    {prescription.aiAssisted
                      ? "AI verified prescription"
                      : "Manually entered"}
                  </span>
                </div>
              </Section>
            </div>
          </div>
        </div>

        {/* FOOTER */}
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
   SECTION
===================================================== */

function Section({ icon: Icon, title, badge, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          {Icon && <Icon size={14} className="text-[#0284c7]" />}
          {title}
        </h3>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-[#0284c7]">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* =====================================================
   INFO ROW
===================================================== */

function InfoRow({ icon: Icon, label, value, className = "" }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} className="text-slate-400" />
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
        {value}
      </p>
    </div>
  );
}

/* =====================================================
   SUMMARY ROW
===================================================== */

function SummaryRow({ label, value, badge }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      {badge ? (
        badge
      ) : (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
          {value}
        </span>
      )}
    </div>
  );
}