import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Pill,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ClipboardList,
  ChevronRight,
  Search,
  Plus,
  FileText,
  Clock,
  User,
  Stethoscope,
  Calendar,
  Brain,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AddPrescriptionModal from "../components/prescriptions/AddPrescriptionModal";
import Navbar from "../components/dashboard/Navbar";

const SAMPLE_PRESCRIPTIONS = [
  {
    id: "RX-4821",
    patientName: "John Doe",
    patientAge: "45",
    doctorName: "Dr. Rajesh Kumar",
    doctorReg: "TN/12345/2020",
    date: "2026-09-25",
    diagnosis: "Viral Fever",
    medicines: [
      { name: "Paracetamol 650mg", dosage: "650mg", frequency: "1-0-1", duration: "5 days" },
      { name: "Cetirizine 10mg", dosage: "10mg", frequency: "0-0-1", duration: "3 days" },
    ],
    aiAssisted: true,
    status: "dispensed",
  },
  {
    id: "RX-4820",
    patientName: "Priya Sharma",
    patientAge: "32",
    doctorName: "Dr. Anita Menon",
    doctorReg: "TN/67890/2019",
    date: "2026-09-24",
    diagnosis: "Bacterial Infection",
    medicines: [
      { name: "Amoxicillin 500mg", dosage: "500mg", frequency: "1-1-1", duration: "7 days" },
    ],
    aiAssisted: false,
    status: "pending",
  },
  {
    id: "RX-4819",
    patientName: "Karthik R",
    patientAge: "58",
    doctorName: "Dr. Suresh Babu",
    doctorReg: "TN/11111/2018",
    date: "2026-09-23",
    diagnosis: "Type 2 Diabetes",
    medicines: [
      { name: "Metformin 500mg", dosage: "500mg", frequency: "1-0-1", duration: "30 days" },
      { name: "Glimepiride 2mg", dosage: "2mg", frequency: "1-0-0", duration: "30 days" },
    ],
    aiAssisted: true,
    status: "dispensed",
  },
];

export default function Prescriptions() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [prescriptions, setPrescriptions] = useState(SAMPLE_PRESCRIPTIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddPrescription, setShowAddPrescription] = useState(false);

  const userName = user?.name || "Pharmacist";
  const userRole = "Chief Pharmacist";

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login", { replace: true });
  };

  const handleAddPrescription = (newPrescription) => {
    console.log("[Prescriptions] Adding:", newPrescription);

    const safePrescription = {
      id: newPrescription.id || `RX-${Date.now().toString().slice(-6)}`,
      patientName: newPrescription.patientName || "Unknown Patient",
      patientAge: newPrescription.patientAge || "",
      patientGender: newPrescription.patientGender || "",
      doctorName: newPrescription.doctorName || "Unknown Doctor",
      doctorReg: newPrescription.doctorReg || "",
      date: newPrescription.date || new Date().toISOString().split("T")[0],
      diagnosis: newPrescription.diagnosis || "",
      notes: newPrescription.notes || "",
      medicines: Array.isArray(newPrescription.medicines)
        ? newPrescription.medicines
        : [],
      aiAssisted: newPrescription.aiAssisted || false,
      status: newPrescription.status || "pending",
      createdAt: newPrescription.createdAt || new Date().toISOString(),
    };

    setPrescriptions((prev) => [safePrescription, ...prev]);
    toast.success(`Prescription ${safePrescription.id} added!`);
    setShowAddPrescription(false);
  };

  const filtered = prescriptions.filter(
    (rx) =>
      rx.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.doctorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusStyles = {
    dispensed: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    cancelled: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 text-slate-900 dark:text-white">

      {/* =====================================================
          TOP NAVBAR — Using shared component
      ====================================================== */}

      <Navbar onScanClick={() => {}} />

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prescriptions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
              Manage all patient prescriptions
            </p>
          </div>

          <button
            onClick={() => setShowAddPrescription(true)}
            className="flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-[#0369a1] transition shadow-sm"
          >
            <Plus size={16} />
            New Prescription
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-sky-50 flex items-center justify-center">
                <ClipboardList size={18} className="text-[#0284c7]" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Total</span>
            </div>
            <p className="text-2xl font-bold">{prescriptions.length}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-emerald-50 flex items-center justify-center">
                <FileText size={18} className="text-emerald-600" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Dispensed</span>
            </div>
            <p className="text-2xl font-bold">
              {prescriptions.filter((p) => p.status === "dispensed").length}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-amber-50 flex items-center justify-center">
                <Clock size={18} className="text-amber-600" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Pending</span>
            </div>
            <p className="text-2xl font-bold">
              {prescriptions.filter((p) => p.status === "pending").length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-4 mb-4 shadow-sm">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, patient, or doctor..."
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 text-sm outline-none transition focus:border-[#0284c7] focus:bg-white dark:bg-slate-900 focus:ring-4 focus:ring-[#0284c7]/10"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-12 text-center shadow-sm">
              <ClipboardList size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                No prescriptions found
              </p>
            </div>
          ) : (
            filtered.map((rx) => (
              <div
                key={rx.id}
                className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#0284c7]">
                        {rx.id}
                      </span>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          statusStyles[rx.status || "pending"]
                        }`}
                      >
                        {(rx.status || "pending").toUpperCase()}
                      </span>

                      {rx.aiAssisted && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 flex items-center gap-1">
                          <Brain size={10} />
                          AI
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm mb-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-400 dark:text-slate-500" />
                        <span className="font-semibold">
                          {rx.patientName || "Unknown"}
                        </span>
                        {rx.patientAge && (
                          <span className="text-slate-400 dark:text-slate-500">
                            ({rx.patientAge})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        <Stethoscope size={13} />
                        <span className="text-xs">
                          {rx.doctorName || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <Calendar size={13} />
                        <span className="text-xs">{rx.date || "—"}</span>
                      </div>
                    </div>

                    {Array.isArray(rx.medicines) && rx.medicines.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {rx.medicines.map((med, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-1 rounded-md bg-sky-50 text-sky-800 font-medium"
                          >
                            {med.name}
                            {med.frequency && ` · ${med.frequency}`}
                            {med.duration && ` · ${med.duration}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className="flex items-center gap-1 text-xs font-medium text-[#0284c7] hover:underline shrink-0">
                    View
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {showAddPrescription && (
        <AddPrescriptionModal
          onAdd={handleAddPrescription}
          onClose={() => setShowAddPrescription(false)}
        />
      )}
    </div>
  );
}