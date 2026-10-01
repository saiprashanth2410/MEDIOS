import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Stethoscope,
  Pill,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  Share2,
  Trash2,
  FileText,
  Phone,
  Mail,
  MapPin,
  Building2,
  ShieldCheck,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "../components/dashboard/Navbar";
import { prescriptionsFirebaseService } from "../services/prescriptionsFirebaseService";
import { prescriptionsAPI } from "../services/api";
import { deductPrescriptionInventory, checkMedicineStock } from "../utils/inventoryDeduction";
import PrescriptionMedicineRow from "../components/prescriptions/PrescriptionMedicineRow";

/* =====================================================
   MAIN COMPONENT
===================================================== */

function normalizePrescription(rx) {
  if (!rx) return null;
  return {
    ...rx,
    id: rx.id || "",
    status: (rx.status || "PENDING").toUpperCase(),
    aiGenerated: rx.aiGenerated || rx.aiAssisted || false,
    patient: rx.patient || {
      name: rx.patientName || "",
      age: rx.patientAge || "",
      gender: rx.patientGender || "",
      phone: rx.patientPhone || "",
      email: rx.patientEmail || "",
      address: rx.patientAddress || "",
    },
    doctor: rx.doctor || {
      name: rx.doctorName || "",
      specialization: rx.doctorSpecialization || "General Physician",
      license: rx.doctorReg || "",
      hospital: rx.hospital || "",
    },
    date: rx.date || rx.createdAt?.split("T")[0] || "",
    medicines: rx.medicines || [],
    notes: rx.notes || rx.diagnosis || "",
  };
}

export default function PrescriptionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPrescription = async () => {
      try {
        setLoading(true);
        let data = await prescriptionsFirebaseService.get(id);
        if (!data) {
          try {
            data = await prescriptionsAPI.get(id);
          } catch (_) {}
        }
        if (!cancelled && data) {
          setPrescription(normalizePrescription(data));
        }
      } catch (err) {
        console.debug("Prescription detail load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPrescription();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* =====================================================
     HANDLERS
  ===================================================== */

  const handleSwapMedicine = async (index, substitute) => {
    const oldName = prescription.medicines[index]?.name || "Medicine";
    const updatedMeds = prescription.medicines.map((m, i) =>
      i === index
        ? {
            ...m,
            name: substitute.name,
            generic: substitute.generic,
            substituted: true,
            originalPrescribed: oldName,
          }
        : m
    );
    const updatedRx = { ...prescription, medicines: updatedMeds };
    setPrescription(updatedRx);
    try {
      await prescriptionsAPI.update(prescription.id, updatedRx);
    } catch (e) {
      console.debug("Prescription update error:", e);
    }
    toast.success(`Swapped "${oldName}" with in-stock substitute "${substitute.name}"!`);
  };

  const handleDispense = async () => {
    const unstocked = (prescription.medicines || []).filter((m) => {
      const info = checkMedicineStock(m);
      return info.status === "OUT_OF_STOCK" || info.status === "NOT_FOUND";
    });

    if (unstocked.length > 0) {
      const names = unstocked.map((m) => `• ${m.name}`).join("\n");
      const confirmPartial = window.confirm(
        `Inventory Alert:\nThe following medicine(s) are OUT OF STOCK or not stocked in your pharmacy:\n\n${names}\n\nDo you want to proceed with PARTIAL DISPENSE (dispensing available items only)?`
      );
      if (!confirmPartial) return;
    }

    try {
      const updated = { ...prescription, status: "dispensed" };
      await prescriptionsFirebaseService.update(prescription.id, updated);
      try {
        await prescriptionsAPI.update(prescription.id, updated);
      } catch (_) {}
      setPrescription((prev) => ({ ...prev, status: "DISPENSED" }));
      const deducted = deductPrescriptionInventory(updated);
      if (deducted.length > 0) {
        const summary = deducted.map((d) => `${d.name} (-${d.deducted})`).join(", ");
        toast.success(`Prescription dispensed! Stock deducted: ${summary}`);
      } else {
        toast.success("Prescription dispensed & inventory updated!");
      }
    } catch {
      setPrescription((prev) => ({ ...prev, status: "DISPENSED" }));
      deductPrescriptionInventory(prescription);
      toast.success("Prescription dispensed!");
    }
  };

  const handlePrint = () => {
    toast.success("Printing prescription...");
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Share link copied to clipboard!");
  };

  const handleDelete = async () => {
    if (window.confirm("Delete this prescription?")) {
      try {
        await prescriptionsFirebaseService.delete(prescription.id);
      } catch (e) {
        console.debug("Firebase delete error:", e);
      }
      try {
        await prescriptionsAPI.delete(prescription.id);
      } catch (e) {
        console.debug("Delete error:", e);
      }
      toast.success("Prescription deleted");
      navigate("/prescriptions");
    }
  };

  /* =====================================================
     LOADING / NOT FOUND
  ===================================================== */

  if (loading && !prescription) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Navbar onScanClick={() => {}} />
        <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
          <Loader2 size={24} className="animate-spin text-[#0284c7]" />
          <span>Loading prescription...</span>
        </div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Navbar onScanClick={() => {}} />
        <div className="max-w-3xl mx-auto px-8 py-12 text-center">
          <AlertCircle size={48} className="text-rose-400 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Prescription not found</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            The prescription <strong>{id}</strong> could not be found.
          </p>
          <button
            onClick={() => navigate("/prescriptions")}
            className="bg-[#0284c7] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0369a1] shadow-2xs transition"
          >
            Back to Prescriptions
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     STATUS COLORS
  ===================================================== */

  const statusConfig = {
    DISPENSED: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200/60 dark:border-emerald-800/40",
      icon: CheckCircle2,
    },
    PENDING: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200/60 dark:border-amber-800/40",
      icon: Clock,
    },
  };

  const status = statusConfig[prescription.status] || statusConfig.PENDING;
  const StatusIcon = status.icon;

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar onScanClick={() => {}} />

      <div className="max-w-5xl mx-auto px-8 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate("/prescriptions")}
          className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition mb-4 shadow-2xs"
          aria-label="Back"
        >
          <ArrowLeft size={18} className="text-slate-600 dark:text-slate-300" />
        </button>

        {/* Header Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs mb-6">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#0284c7] flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">{prescription.id}</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Prescription Details
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {prescription.aiGenerated && (
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40 flex items-center gap-1.5">
                    <ShieldCheck size={11} />
                    AI Generated
                  </span>
                )}
                <span
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${status.bg} ${status.text} ${status.border}`}
                >
                  <StatusIcon size={11} />
                  {prescription.status}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 flex items-center gap-2 flex-wrap">
            {prescription.status === "PENDING" && (
              <button
                onClick={handleDispense}
                className="flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0369a1] shadow-2xs transition"
              >
                <CheckCircle2 size={14} />
                Mark as Dispensed
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
            >
              <Printer size={14} />
              Print
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
            >
              <Share2 size={14} />
              Share
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-rose-200/80 dark:border-rose-900/50 px-4 py-2 rounded-lg text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 shadow-2xs transition ml-auto"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT — Main info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Patient Info */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <User size={16} className="text-[#0284c7] dark:text-sky-400" />
                  Patient Information
                </h2>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-4">
                <InfoRow icon={User} label="Name" value={prescription.patient.name} />
                <InfoRow icon={Info} label="Age / Gender" value={`${prescription.patient.age} · ${prescription.patient.gender}`} />
                <InfoRow icon={Phone} label="Phone" value={prescription.patient.phone} />
                <InfoRow icon={Mail} label="Email" value={prescription.patient.email} />
                <InfoRow icon={MapPin} label="Address" value={prescription.patient.address} className="sm:col-span-2" />
              </div>
            </div>

            {/* Doctor Info */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Stethoscope size={16} className="text-[#0284c7] dark:text-sky-400" />
                  Prescribed By
                </h2>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-4">
                <InfoRow icon={Stethoscope} label="Doctor" value={prescription.doctor.name} />
                <InfoRow icon={ShieldCheck} label="Specialization" value={prescription.doctor.specialization} />
                <InfoRow icon={Building2} label="Hospital" value={prescription.doctor.hospital} />
                <InfoRow icon={ShieldCheck} label="License" value={prescription.doctor.license} />
              </div>
            </div>

            {/* Medicines */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Pill size={16} className="text-[#0284c7] dark:text-sky-400" />
                  Prescribed Medicines
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40">
                  {prescription.medicines.length} items
                </span>
              </div>
              <div className="p-4 space-y-3">
                {prescription.medicines.map((med, idx) => (
                  <PrescriptionMedicineRow
                    key={idx}
                    med={med}
                    index={idx}
                    isDispensed={prescription.status === "DISPENSED" || prescription.status === "dispensed"}
                    onSwap={handleSwapMedicine}
                  />
                ))}
              </div>
            </div>

            {/* Notes */}
            {prescription.notes && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <FileText size={16} className="text-[#0284c7] dark:text-sky-400" />
                    Doctor's Notes
                  </h2>
                </div>
                <div className="p-6">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {prescription.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Summary */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs lg:sticky lg:top-24">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Summary</h2>
              </div>
              <div className="p-6 space-y-4">
                <SummaryRow label="Prescription ID" value={prescription.id} />
                <SummaryRow label="Date" value={prescription.date} />
                <SummaryRow label="Total Medicines" value={prescription.medicines.length} />
                <SummaryRow
                  label="Status"
                  value={prescription.status}
                  badge={
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${status.bg} ${status.text} ${status.border}`}
                    >
                      {prescription.status}
                    </span>
                  }
                />

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span>
                      {prescription.aiGenerated
                        ? "AI verified prescription"
                        : "Manually entered"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   INFO ROW
===================================================== */

function InfoRow({ icon: Icon, label, value, className = "" }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className="text-slate-400" />
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
      {badge ? badge : (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
          {value}
        </span>
      )}
    </div>
  );
}