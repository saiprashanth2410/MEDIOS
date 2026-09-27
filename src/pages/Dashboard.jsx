import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Pill,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ClipboardList,
  CalendarClock,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Clock,
  ChevronRight,
  ShieldCheck,
  Activity,
  FileText,
  Bell,
  MapPin,
  Gauge,
  Calendar,
  AlertTriangle,
  Stethoscope,
  Building2,
  BadgeCheck,
  ScanLine,
  CheckCircle2,
  Brain,
  TrendingDown,
  Truck,
  Thermometer,
  Droplets,
  Factory,
  ShoppingCart,
  Boxes,
  Sparkles,
  Menu,
  X,
  ChevronDown,
  Info,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BarcodeScanner from "../components/scanner/BarcodeScanner";
import AddMedicineModal from "../components/dashboard/AddMedicineModal";
import AddPrescriptionModal from "../components/prescriptions/AddPrescriptionModal";
import Navbar from "../components/dashboard/Navbar";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

/* =====================================================
   DATA
===================================================== */

const KPI_METRICS = [
  { label: "Demand Forecast Error", before: "18-27%", after: "3%", improvement: "83%", icon: Brain, color: "violet" },
  { label: "Inventory Overstock", before: "22%", after: "14%", improvement: "36%", icon: Package, color: "sky" },
  { label: "Stockout Incidents", before: "9%", after: "1.8%", improvement: "80%", icon: AlertTriangle, color: "emerald" },
  { label: "Procurement Delay", before: "14-18 days", after: "7 days", improvement: "56%", icon: Clock, color: "amber" },
];

const EXPIRY_ALERTS = {
  critical: { label: "Critical", days: "≤30 days", count: 8, value: 24500, color: "rose", description: "Quarantine + process for credit" },
  warning: { label: "Warning", days: "31-60 days", count: 15, value: 67800, color: "amber", description: "Return to wholesaler or redistribute" },
  review: { label: "Review", days: "61-90 days", count: 25, value: 145000, color: "yellow", description: "AI velocity review needed" },
};

const REORDER_ALERTS = [
  { name: "Insulin Glargine 100IU", current: 18, min: 50, suggested: 200, supplier: "Novo Nordisk", unitPrice: 850, estimatedCost: 170000 },
  { name: "Cetirizine 10mg", current: 42, min: 100, suggested: 400, supplier: "Dr. Reddy's", unitPrice: 22, estimatedCost: 8800 },
  { name: "Amoxicillin 500mg", current: 45, min: 50, suggested: 200, supplier: "Cipla Ltd", unitPrice: 45, estimatedCost: 9000 },
];

const SHIPMENTS = [
  { id: "SHIP-2026-042", from: "Cipla Mumbai", to: "MediTrack Chennai", status: "In Transit", eta: "2 hours", temp: 4.2, humidity: 45, route: "Mumbai → Chennai", progress: 65 },
  { id: "SHIP-2026-041", from: "Sun Pharma Hyderabad", to: "MediTrack Chennai", status: "Delivered", eta: "Done", temp: 5.1, humidity: 48, route: "Hyderabad → Chennai", progress: 100 },
];

const TOP_SUPPLIERS = [
  { name: "Cipla Ltd", onTime: 95, quality: 98, leadTime: "3 days", risk: "low", rating: 4.8, riskReason: "Consistent on-time delivery, zero quality issues" },
  { name: "Sun Pharma", onTime: 92, quality: 96, leadTime: "4 days", risk: "low", rating: 4.6, riskReason: "Strong delivery record" },
  { name: "Alkem Labs", onTime: 78, quality: 88, leadTime: "6 days", risk: "medium", rating: 4.0, riskReason: "3 delayed deliveries in last quarter" },
];

const ACTIVITY = [
  { icon: Package, text: "Amoxicillin 500mg — 240 strips received", time: "2 min ago", tone: "blue" },
  { icon: ClipboardList, text: "Prescription #RX-4821 dispensed to patient", time: "18 min ago", tone: "green" },
  { icon: AlertTriangle, text: "Insulin Glargine — below reorder level", time: "1 hr ago", tone: "amber" },
  { icon: ShieldCheck, text: "Drug license renewal completed", time: "3 hrs ago", tone: "green" },
];

/* =====================================================
   COLOR STYLES — WITH DARK VARIANTS
===================================================== */

const COLOR_STYLES = {
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-600 dark:text-violet-400",
  },
  sky: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-600 dark:text-sky-400",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
  },
  yellow: {
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    text: "text-yellow-600 dark:text-yellow-400",
  },
};

const EXPIRY_CARD_STYLES = {
  rose: "border-rose-200 dark:border-rose-800/60 bg-rose-50/60 dark:bg-rose-900/20",
  amber: "border-amber-200 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-900/20",
  yellow: "border-yellow-200 dark:border-yellow-700/60 bg-yellow-50/60 dark:bg-yellow-900/20",
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showScanner, setShowScanner] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [showAddPrescription, setShowAddPrescription] = useState(false);

  const userName = user?.name || "Pharmacist";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const handleAddMedicine = (newMedicine) => {
    console.log("New medicine added:", newMedicine);
    toast.success(`${newMedicine.name} added to inventory`);
  };

  const handleAddPrescription = (prescription) => {
    console.log("New prescription added:", prescription);
    toast.success(`Prescription ${prescription.id} saved!`);
  };

  return (
    <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* =====================================================
            GREETING
        ====================================================== */}

        <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {greeting},{" "}
              <span className="text-[#0284c7] dark:text-sky-400 font-semibold">
                {userName}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Here's your pharmacy overview for today.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 text-[#0284c7] dark:text-sky-400 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-semibold hover:bg-sky-50 dark:hover:bg-slate-700 transition shadow-sm"
            >
              <ScanLine size={14} />
              Scan
            </button>

            <button
              onClick={() => setShowAddMedicine(true)}
              className="flex items-center gap-2 bg-[#0284c7] dark:bg-sky-600 hover:bg-[#0369a1] dark:hover:bg-sky-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-semibold transition shadow-sm"
            >
              <Pill size={14} />
              <span className="hidden sm:inline">Add Medicine</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* =====================================================
            KPI METRICS
        ====================================================== */}

        <section className="mb-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Performance Metrics
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {KPI_METRICS.map((kpi) => {
              const Icon = kpi.icon;
              const colors = COLOR_STYLES[kpi.color];
              return (
                <div
                  key={kpi.label}
                  className="bg-white dark:bg-slate-900 rounded-lg p-3 sm:p-4 border border-sky-100 dark:border-slate-800 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-md flex items-center justify-center ${colors.bg}`}
                    >
                      <Icon size={14} className={colors.text} />
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                      <TrendingDown size={9} />
                      {kpi.improvement}
                    </span>
                  </div>

                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    {kpi.label}
                  </p>

                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
                      {kpi.before}
                    </span>
                    <ChevronRight
                      size={10}
                      className="text-slate-300 dark:text-slate-600"
                    />
                    <span className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {kpi.after}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =====================================================
            MAIN GRID
        ====================================================== */}

        <div className="grid lg:grid-cols-[1fr_360px] gap-4 sm:gap-6">
          <div>
            {/* EXPIRY MANAGEMENT */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
                    <AlertTriangle
                      size={16}
                      className="text-rose-600 dark:text-rose-400"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100">
                      Expiry Management (FEFO)
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                      90/60/30 day escalation workflow
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/expiry")}
                  className="text-[10px] sm:text-xs font-medium text-[#0284c7] dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  View all <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(EXPIRY_ALERTS).map(([key, data]) => {
                  const colors = COLOR_STYLES[data.color];
                  const cardStyle = EXPIRY_CARD_STYLES[data.color];

                  return (
                    <div
                      key={key}
                      className={`p-3 sm:p-4 rounded-lg border-2 ${cardStyle}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-bold uppercase ${colors.text}`}
                        >
                          {data.label}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {data.days}
                        </span>
                      </div>
                      <p className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                        {data.count}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                        ₹{data.value.toLocaleString("en-IN")} at risk
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                        {data.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AUTO-REORDER */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                    <ShoppingCart
                      size={16}
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100">
                      Auto-Reorder Alerts
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                      Intelligent purchase suggestions
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/reorder")}
                  className="text-[10px] sm:text-xs font-medium text-[#0284c7] dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  View all <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="space-y-3">
                {REORDER_ALERTS.map((item, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                          {item.supplier}
                        </p>
                      </div>
                      <button className="px-3 py-1.5 rounded-md bg-[#0284c7] dark:bg-sky-600 hover:bg-[#0369a1] dark:hover:bg-sky-700 text-white text-[11px] font-semibold transition shrink-0">
                        Order
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Stock / Min
                        </p>
                        <p className="font-semibold text-rose-600 dark:text-rose-400">
                          {item.current} / {item.min}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Suggested
                        </p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.suggested} units
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Est. Cost
                        </p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          ₹{item.estimatedCost.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100">
                  Recent activity
                </h3>
                <button className="text-[10px] sm:text-xs font-medium text-[#0284c7] dark:text-sky-400 hover:underline flex items-center gap-1">
                  View all <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="space-y-4">
                {ACTIVITY.map((item, i) => {
                  const Icon = item.icon;
                  const toneBg = {
                    blue: "bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-400",
                    green:
                      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
                    amber:
                      "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
                  }[item.tone];

                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0"
                    >
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-md flex items-center justify-center shrink-0 ${toneBg}`}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                          {item.text}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
              <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 mb-4">
                Quick actions
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Pill, label: "Add medicine", action: "medicine" },
                  { icon: ScanLine, label: "Scan medicine", action: "scan" },
                  { icon: ClipboardList, label: "New prescription", action: "prescription" },
                  { icon: Package, label: "Reorder stock", action: "reorder" },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => {
                        if (action.action === "scan") setShowScanner(true);
                        if (action.action === "medicine") setShowAddMedicine(true);
                        if (action.action === "prescription") setShowAddPrescription(true);
                        if (action.action === "reorder") navigate("/reorder");
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-md border border-slate-200 dark:border-slate-700 hover:border-[#0284c7] dark:hover:border-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition text-left text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                      <div className="w-8 h-8 rounded-md bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
                        <Icon
                          size={15}
                          className="text-[#0284c7] dark:text-sky-400"
                        />
                      </div>
                      {action.label}
                      <ChevronRight
                        size={14}
                        className="ml-auto text-slate-400 dark:text-slate-500"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* =====================================================
              SIDEBAR
          ====================================================== */}

          <aside className="space-y-4">
            {/* SHIPMENTS */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-[#0284c7] dark:text-sky-400" />
                  <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100">
                    Shipments
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/shipments")}
                  className="text-[10px] font-medium text-[#0284c7] dark:text-sky-400 hover:underline"
                >
                  View all
                </button>
              </div>

              <div className="space-y-3">
                {SHIPMENTS.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-semibold text-[#0284c7] dark:text-sky-400">
                        {shipment.id}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          shipment.status === "Delivered"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                            : "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400"
                        }`}
                      >
                        {shipment.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-2 truncate">
                      {shipment.route}
                    </p>
                    <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full mb-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8] rounded-full transition-all"
                        style={{ width: `${shipment.progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">
                      {shipment.progress}% complete
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Thermometer size={10} />
                        {shipment.temp}°C
                      </span>
                      <span className="flex items-center gap-1">
                        <Droplets size={10} />
                        {shipment.humidity}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {shipment.eta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TOP SUPPLIERS */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Factory size={14} className="text-[#0284c7] dark:text-sky-400" />
                  <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100">
                    Top Suppliers
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/suppliers")}
                  className="text-[10px] font-medium text-[#0284c7] dark:text-sky-400 hover:underline"
                >
                  View all
                </button>
              </div>

              <div className="space-y-3">
                {TOP_SUPPLIERS.map((supplier) => (
                  <div
                    key={supplier.name}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {supplier.name}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        ⭐ {supplier.rating}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] mb-2">
                      <div>
                        <p className="text-slate-400 dark:text-slate-500">
                          On-time
                        </p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          {supplier.onTime}%
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 dark:text-slate-500">
                          Quality
                        </p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          {supplier.quality}%
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 dark:text-slate-500">Lead</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          {supplier.leadTime}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          supplier.risk === "low"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {supplier.risk === "low" ? "🟢 LOW RISK" : "🟡 MEDIUM RISK"}
                      </span>
                      <button
                        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
                        title={supplier.riskReason}
                      >
                        <Info size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PHARMACY INFO */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100">
                  Pharmacy Info
                </h3>
                <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  Open
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <InfoRow
                  icon={Building2}
                  label="Pharmacy ID"
                  value={user?.pharmacyId || "PH-MT-220022"}
                />
                <InfoRow
                  icon={BadgeCheck}
                  label="License No."
                  value={user?.license || "TN/PH/2026/4821"}
                />
                <InfoRow
                  icon={MapPin}
                  label="Branch"
                  value={user?.branch || "Anna Nagar, Chennai"}
                />
                <InfoRow
                  icon={Stethoscope}
                  label="On-duty Staff"
                  value="4 pharmacists"
                />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 my-4" />

              <div className="flex items-center gap-2 mb-3 text-sm">
                <Activity
                  size={14}
                  className="text-slate-500 dark:text-slate-400"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Today's Activity
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <ArrowUp size={12} className="text-emerald-500" />
                  <span>+128 dispensed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowDown size={12} className="text-rose-500" />
                  <span>-42 sold</span>
                </div>
              </div>
            </div>

            {/* LICENSE */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 mb-3">
                License & Compliance
              </h3>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-1">
                Drug License — Form 20 & 21
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-4">
                Valid till 23 Oct 2026
              </p>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Compliance
                  </p>
                  <ShieldCheck
                    size={14}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div className="space-y-3 text-xs">
                  <PlanRow icon={FileText} label="License Type" value="Retail Pharmacy" />
                  <PlanRow icon={BadgeCheck} label="Issued By" value="TN Drug Control" />
                  <PlanRow icon={Calendar} label="Issued On" value="24 Sep 2024" />
                  <PlanRow icon={Calendar} label="Expires On" value="23 Oct 2026" />
                  <PlanRow icon={Clock} label="Remaining" value="730 days" />
                  <PlanRow icon={Gauge} label="Storage" value="20,000 items" />
                </div>
              </div>

              <button className="w-full bg-[#059669] dark:bg-emerald-700 hover:bg-[#047857] dark:hover:bg-emerald-800 text-white py-2.5 rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm">
                Renew License
                <ChevronRight size={14} />
              </button>
            </div>

            {/* SYSTEM STATUS */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 border border-sky-100 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 mb-4">
                System Status
              </h3>

              <div className="space-y-3 text-xs sm:text-sm">
                <StatusRow label="Stock Sync" status="Live" ok />
                <StatusRow label="Prescription Feed" status="Active" ok />
                <StatusRow label="Scanner" status="Ready" ok />
                <StatusRow label="Expiry Alerts" status="2 pending" warn />
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-900 border-t border-sky-100 dark:border-slate-800 mt-6 sm:mt-8">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="w-8 h-8 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-xs font-bold hover:opacity-90"
            >
              f
            </a>
            <a
              href="#"
              className="w-8 h-8 rounded-full bg-black dark:bg-slate-700 flex items-center justify-center text-white text-xs font-bold hover:opacity-90"
            >
              𝕏
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium">
            <a href="#" className="hover:text-[#0284c7] dark:hover:text-sky-400">
              About
            </a>
            <a href="#" className="hover:text-[#0284c7] dark:hover:text-sky-400">
              Privacy
            </a>
            <a href="#" className="hover:text-[#0284c7] dark:hover:text-sky-400">
              License
            </a>
            <span className="text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} MediTrack
            </span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {showScanner && (
        <BarcodeScanner
          onScan={(code) => toast.success(`Scanned: ${code}`)}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showAddMedicine && (
        <AddMedicineModal
          onAdd={handleAddMedicine}
          onClose={() => setShowAddMedicine(false)}
        />
      )}

      {showAddPrescription && (
        <AddPrescriptionModal
          onAdd={handleAddPrescription}
          onClose={() => setShowAddPrescription(false)}
        />
      )}
    </div>
  );
}

/* =====================================================
   SUB COMPONENTS
===================================================== */

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon
          size={13}
          className="text-slate-500 dark:text-slate-400 shrink-0"
        />
        <span className="text-slate-700 dark:text-slate-300 truncate text-xs">
          {label}
        </span>
      </div>
      <span className="font-medium text-right text-xs text-slate-800 dark:text-slate-200">
        {value}
      </span>
    </div>
  );
}

function PlanRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon
          size={12}
          className="text-slate-500 dark:text-slate-400 shrink-0"
        />
        <span className="text-slate-600 dark:text-slate-400 truncate">
          {label}
        </span>
      </div>
      <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
        {value}
      </span>
    </div>
  );
}

function StatusRow({ label, status, ok, warn }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            warn ? "bg-amber-500" : ok ? "bg-emerald-500" : "bg-slate-400"
          }`}
        />
        {status}
      </span>
    </div>
  );
}