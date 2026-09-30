import { useState, useEffect, useId } from "react";
import { toast } from "sonner";
import {
  X,
  ClipboardList,
  User,
  Stethoscope,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Brain,
} from "lucide-react";
import PrescriptionScanner from "./PrescriptionScanner";

const FIELD_BASE =
  "w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white outline-none transition focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 placeholder:text-slate-400 dark:placeholder:text-slate-500";

const LABEL_BASE = "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5";

export default function AddPrescriptionModal({ onClose, onAdd }) {
  const [showScanner, setShowScanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  const [form, setForm] = useState({
    patientName: "",
    patientAge: "",
    patientGender: "male",
    doctorName: "",
    doctorReg: "",
    date: new Date().toISOString().split("T")[0],
    diagnosis: "",
    notes: "",
    medicines: [
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ],
  });

  const [errors, setErrors] = useState({});

  const patientNameId = useId();
  const patientAgeId = useId();
  const doctorNameId = useId();
  const doctorRegId = useId();
  const dateId = useId();
  const diagnosisId = useId();
  const notesId = useId();

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

  /* =====================================================
     AI RESULT HANDLER
  ===================================================== */
  const handleAIResult = (data) => {
    const patient = data.patient || {};
    const doctor = data.doctor || {};
    const rx = data.prescription || {};

    setForm({
      patientName: patient.name || "",
      patientAge: patient.age || "",
      patientGender: patient.gender || "male",
      doctorName: doctor.name || "",
      doctorReg: doctor.registration || "",
      date: rx.date || new Date().toISOString().split("T")[0],
      diagnosis: rx.diagnosis || "",
      notes: rx.notes || "",
      medicines:
        rx.medicines?.length > 0
          ? rx.medicines.map((m) => ({
              name: m.name || "",
              dosage: m.dosage || "",
              frequency: m.frequency || "",
              duration: m.duration || "",
              instructions: m.instructions || "",
            }))
          : [
              {
                name: "",
                dosage: "",
                frequency: "",
                duration: "",
                instructions: "",
              },
            ],
    });

    setAiFilled(true);
    toast.success("AI filled the form — review and edit if needed");
  };

  /* =====================================================
     MEDICINE ROW HANDLERS
  ===================================================== */
  const updateMedicine = (index, key, value) => {
    setForm((f) => ({
      ...f,
      medicines: f.medicines.map((m, i) =>
        i === index ? { ...m, [key]: value } : m
      ),
    }));
  };

  const addMedicineRow = () => {
    setForm((f) => ({
      ...f,
      medicines: [
        ...f.medicines,
        { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
      ],
    }));
  };

  const removeMedicineRow = (index) => {
    if (form.medicines.length === 1) return;
    setForm((f) => ({
      ...f,
      medicines: f.medicines.filter((_, i) => i !== index),
    }));
  };

  /* =====================================================
     VALIDATE + SUBMIT
  ===================================================== */
  const validate = () => {
    const e = {};
    if (!form.patientName.trim()) e.patientName = "Patient name required";
    if (!form.doctorName.trim()) e.doctorName = "Doctor name required";
    if (
      form.medicines.some((m) => !m.name.trim())
    )
      e.medicines = "All medicines need a name";
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

      const prescription = {
        id: `RX-${Date.now().toString().slice(-6)}`,
        ...form,
        createdAt: new Date().toISOString(),
        aiAssisted: aiFilled,
      };

      onAdd?.(prescription);
      toast.success("Prescription added successfully!");
      onClose?.();
    } catch {
      toast.error("Failed to add prescription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl my-8 shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-500/15 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center">
                <ClipboardList size={20} className="text-[#0284c7] dark:text-sky-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  New Prescription
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manually fill or scan with AI
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* AI BANNER */}
          <div className="px-6 pt-5">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 border border-violet-200 dark:border-violet-800/50 hover:from-violet-100 hover:to-purple-100 dark:hover:from-violet-900/40 dark:hover:to-purple-900/40 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                  <Brain size={18} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Scan Prescription with AI
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Snap a photo — AI reads handwriting & fills the form
                  </p>
                </div>
              </div>
              <Sparkles
                size={20}
                className="text-violet-600 dark:text-violet-400 group-hover:scale-110 transition"
              />
            </button>

            {aiFilled && (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50 px-3 py-2 rounded-lg">
                <CheckCircle2 size={13} />
                AI filled the form — please review before saving
              </div>
            )}
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid sm:grid-cols-2 gap-4">

              {/* Patient section */}
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <User size={14} className="text-slate-500 dark:text-slate-400 dark:text-slate-500" />
                  <h3 className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Patient
                  </h3>
                </div>
              </div>

              <div>
                <label htmlFor={patientNameId} className={LABEL_BASE}>
                  Patient Name *
                </label>
                <input
                  id={patientNameId}
                  type="text"
                  value={form.patientName}
                  onChange={(e) =>
                    setForm({ ...form, patientName: e.target.value })
                  }
                  placeholder=""
                  className={`${FIELD_BASE} ${
                    errors.patientName ? "border-rose-300" : ""
                  }`}
                />
                {errors.patientName && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.patientName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={patientAgeId} className={LABEL_BASE}>
                  Age
                </label>
                <input
                  id={patientAgeId}
                  type="text"
                  value={form.patientAge}
                  onChange={(e) =>
                    setForm({ ...form, patientAge: e.target.value })
                  }
                  placeholder="45"
                  className={FIELD_BASE}
                />
              </div>

              {/* Doctor section */}
              <div className="sm:col-span-2 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Stethoscope size={14} className="text-slate-500 dark:text-slate-400 dark:text-slate-500" />
                  <h3 className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Doctor
                  </h3>
                </div>
              </div>

              <div>
                <label htmlFor={doctorNameId} className={LABEL_BASE}>
                  Doctor Name *
                </label>
                <input
                  id={doctorNameId}
                  type="text"
                  value={form.doctorName}
                  onChange={(e) =>
                    setForm({ ...form, doctorName: e.target.value })
                  }
                  placeholder="Dr. Smith"
                  className={`${FIELD_BASE} ${
                    errors.doctorName ? "border-rose-300" : ""
                  }`}
                />
                {errors.doctorName && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.doctorName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={doctorRegId} className={LABEL_BASE}>
                  Registration No.
                </label>
                <input
                  id={doctorRegId}
                  type="text"
                  value={form.doctorReg}
                  onChange={(e) =>
                    setForm({ ...form, doctorReg: e.target.value })
                  }
                  placeholder="TN/12345/2020"
                  className={FIELD_BASE}
                />
              </div>

              <div>
                <label htmlFor={dateId} className={LABEL_BASE}>
                  Date
                </label>
                <div className="relative">
                  <Calendar
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                  />
                  <input
                    id={dateId}
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value })
                    }
                    className={`${FIELD_BASE} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor={diagnosisId} className={LABEL_BASE}>
                  Diagnosis
                </label>
                <input
                  id={diagnosisId}
                  type="text"
                  value={form.diagnosis}
                  onChange={(e) =>
                    setForm({ ...form, diagnosis: e.target.value })
                  }
                  placeholder="Viral fever"
                  className={FIELD_BASE}
                />
              </div>

              {/* Medicines */}
              <div className="sm:col-span-2 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
                    Medicines
                  </h3>
                  <button
                    type="button"
                    onClick={addMedicineRow}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#0284c7] hover:text-[#0369a1] dark:text-sky-400 dark:hover:text-sky-300 transition"
                  >
                    <Plus size={13} />
                    Add row
                  </button>
                </div>

                {/* Desktop column header labels */}
                <div className="hidden sm:grid sm:grid-cols-[minmax(150px,2fr)_90px_80px_90px_minmax(140px,1.6fr)_36px] gap-2 px-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  <span>Medicine Name *</span>
                  <span>Dosage</span>
                  <span>Frequency</span>
                  <span>Duration</span>
                  <span>Instructions</span>
                  <span></span>
                </div>

                <div className="space-y-3">
                  {form.medicines.map((med, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 sm:grid-cols-[minmax(150px,2fr)_90px_80px_90px_minmax(140px,1.6fr)_36px] gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 items-center transition"
                    >
                      <input
                        placeholder="Medicine name *"
                        value={med.name}
                        onChange={(e) =>
                          updateMedicine(i, "name", e.target.value)
                        }
                        className={`${FIELD_BASE} col-span-12 sm:col-auto`}
                      />
                      <input
                        placeholder="Dosage"
                        value={med.dosage}
                        onChange={(e) =>
                          updateMedicine(i, "dosage", e.target.value)
                        }
                        className={`${FIELD_BASE} col-span-4 sm:col-auto`}
                      />
                      <input
                        placeholder="1-0-1"
                        value={med.frequency}
                        onChange={(e) =>
                          updateMedicine(i, "frequency", e.target.value)
                        }
                        className={`${FIELD_BASE} col-span-4 sm:col-auto`}
                      />
                      <input
                        placeholder="5 days"
                        value={med.duration}
                        onChange={(e) =>
                          updateMedicine(i, "duration", e.target.value)
                        }
                        className={`${FIELD_BASE} col-span-4 sm:col-auto`}
                      />
                      <input
                        placeholder="Instructions (e.g. After food)"
                        value={med.instructions}
                        onChange={(e) =>
                          updateMedicine(i, "instructions", e.target.value)
                        }
                        className={`${FIELD_BASE} col-span-10 sm:col-auto`}
                      />
                      <button
                        type="button"
                        onClick={() => removeMedicineRow(i)}
                        disabled={form.medicines.length === 1}
                        className="col-span-2 sm:col-auto h-11 w-full sm:w-9 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition"
                        title="Remove medicine"
                        aria-label="Remove medicine"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                {errors.medicines && (
                  <p className="mt-2 text-xs text-rose-600">
                    {errors.medicines}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor={notesId} className={LABEL_BASE}>
                  Notes
                </label>
                <textarea
                  id={notesId}
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  placeholder="Any additional notes..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none transition focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-12 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <ClipboardList size={16} />
                    Save Prescription
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* AI Scanner */}
      {showScanner && (
        <PrescriptionScanner
          onResult={handleAIResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
