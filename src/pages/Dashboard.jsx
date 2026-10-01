import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Pill,
  Package,
  ClipboardList,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Clock,
  ChevronRight,
  ShieldCheck,
  Activity,
  FileText,
  MapPin,
  Gauge,
  Calendar,
  AlertTriangle,
  Stethoscope,
  Building2,
  BadgeCheck,
  ScanLine,
  Truck,
  Thermometer,
  Droplets,
  Factory,
  ShoppingCart,
  Info,
  Star,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BarcodeScanner from "../components/scanner/BarcodeScanner";
import AddMedicineModal from "../components/dashboard/AddMedicineModal";
import AddPrescriptionModal from "../components/prescriptions/AddPrescriptionModal";
import Navbar from "../components/dashboard/Navbar";
import PerformanceMetrics from "../components/dashboard/PerformanceMetrics";
import usePerformanceData from "../hooks/usePerformanceData";
import { useExpiryData } from "../utils/expiryStore";
import { medicinesAPI, prescriptionsAPI, suppliersAPI, notificationsAPI } from "../services/api";

/* =====================================================
   DATA
===================================================== */


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
   COLOR STYLES
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
  rose: "border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-300 dark:hover:border-rose-800",
  amber: "border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-800",
  yellow: "border-yellow-200/80 dark:border-yellow-900/50 bg-yellow-50/40 dark:bg-yellow-950/20 hover:border-yellow-300 dark:hover:border-yellow-800",
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: performanceData } = usePerformanceData();
  const { expiryAlerts } = useExpiryData();

  const [showScanner, setShowScanner] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [showAddPrescription, setShowAddPrescription] = useState(false);

  const [reorderAlerts, setReorderAlerts] = useState(REORDER_ALERTS);
  const [topSuppliers, setTopSuppliers] = useState(TOP_SUPPLIERS);
  const [recentActivity, setRecentActivity] = useState(ACTIVITY);

  // Live MongoDB data sync for alerts, suppliers, and recent activity
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch real low stock medicines
    medicinesAPI
      .list({ limit: 100 })
      .then((res) => {
        if (!isMounted || !res?.medicines) return;
        const lowStockMeds = res.medicines
          .filter((m) => (m.stock ?? 100) <= (m.reorderLevel || 50))
          .slice(0, 4)
          .map((m) => {
            const current = m.stock ?? 0;
            const min = m.reorderLevel || 50;
            const suggested = Math.max(100, min * 4 - current);
            const unitPrice = m.price || m.sellingPrice || 45;
            return {
              name: m.name || m.fullName,
              current,
              min,
              suggested,
              supplier: m.supplierName || "Direct Supplier",
              unitPrice,
              estimatedCost: suggested * unitPrice,
            };
          });
        if (lowStockMeds.length > 0) {
          setReorderAlerts(lowStockMeds);
        }
      })
      .catch((err) => console.debug("Dashboard low stock sync:", err));

    // 2. Fetch real top suppliers
    suppliersAPI
      .list({ limit: 4 })
      .then((res) => {
        if (!isMounted || !res?.suppliers || res.suppliers.length === 0) return;
        const mapped = res.suppliers.map((s) => ({
          name: s.name,
          onTime: s.metrics?.onTimeDelivery || 95,
          quality: s.metrics?.qualityScore || 98,
          leadTime: s.leadTime || "3 days",
          risk: s.status === "active" ? "low" : "medium",
          rating: s.rating || 4.8,
          riskReason:
            s.status === "active" ? "Verified active partner" : "Verification pending",
        }));
        setTopSuppliers(mapped);
      })
      .catch((err) => console.debug("Dashboard suppliers sync:", err));

    // 3. Fetch real notifications for recent activity
    notificationsAPI
      .list({ limit: 5 })
      .then((res) => {
        if (!isMounted || !res?.notifications || res.notifications.length === 0)
          return;
        const mapped = res.notifications.map((n) => {
          let icon = Package;
          if (n.type === "prescription") icon = ClipboardList;
          if (n.type === "expiry") icon = AlertTriangle;
          if (n.type === "system") icon = ShieldCheck;

          let tone = "blue";
          if (n.color === "red" || n.color === "amber") tone = "amber";
          if (n.color === "emerald") tone = "green";

          const date = new Date(n.createdAt);
          const timeStr = !isNaN(date)
            ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Recently";

          return {
            icon,
            text: n.message || n.title,
            time: timeStr,
            tone,
          };
        });
        setRecentActivity(mapped);
      })
      .catch((err) => console.debug("Dashboard activity sync:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const userName = user?.name || "Pharmacist";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const handleAddMedicine = async (newMedicine) => {
    try {
      await medicinesAPI.create({
        code: newMedicine.id || `med-${Date.now()}`,
        name: newMedicine.name,
        fullName: newMedicine.fullName || newMedicine.name,
        brand: newMedicine.brandName || newMedicine.name,
        generic: newMedicine.generic || "",
        composition: newMedicine.generic || "",
        supplierName: newMedicine.manufacturer || "",
        supplierCode: newMedicine.manufacturerCode || "",
        stock: Number(newMedicine.quantity) || 100,
        quantity: Number(newMedicine.quantity) || 100,
        sellingPrice: Number(newMedicine.sellingPrice || newMedicine.unitPrice) || 50,
        price: Number(newMedicine.sellingPrice || newMedicine.unitPrice) || 50,
        mrp: Number(newMedicine.unitPrice) || 60,
        reorderLevel: Number(newMedicine.minStock) || 10,
        batch: newMedicine.batch || "",
        rack: newMedicine.rack || "R-1",
        schedule: newMedicine.schedule || "H",
        expiry: newMedicine.expiry || "2027-12-31",
      });
    } catch (err) {
      console.warn("Could not save medicine to DB from dashboard:", err.message);
    }
    toast.success(`${newMedicine.name} added to inventory`);
  };

  const handleAddPrescription = async (prescription) => {
    try {
      await prescriptionsAPI.create(prescription);
    } catch (err) {
      console.warn("Could not save prescription to DB from dashboard:", err.message);
    }
    toast.success(`Prescription ${prescription.id} saved!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* GREETING */}
        <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {greeting},{" "}
              <span className="text-[#0284c7] dark:text-sky-400 font-semibold">
                {userName}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time pharmacy inventory, dispensing, and supplier escalation dashboard.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
            >
              <ScanLine size={14} />
              <span>Scan</span>
            </button>

            <button
              onClick={() => setShowAddMedicine(true)}
              className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition shadow-xs"
            >
              <Pill size={14} />
              <span>Add Medicine</span>
            </button>
          </div>
        </div>

        {/* KPI METRICS — DYNAMIC */}
        <section className="mb-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            
          </div>

          <PerformanceMetrics data={performanceData} />
        </section>

        {/* MAIN GRID */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-4 sm:gap-6">
          <div>
            {/* EXPIRY MANAGEMENT */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 mb-4 sm:mb-6 shadow-2xs">
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
                {Object.entries(expiryAlerts).map(([key, data]) => {
                  const colors = COLOR_STYLES[data.color];
                  const cardStyle = EXPIRY_CARD_STYLES[data.color];

                  return (
                    <div
                      key={key}
                      onClick={() => navigate(`/expiry?status=${data.label}`)}
                      className={`p-3 sm:p-4 rounded-lg border-2 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all ${cardStyle}`}
                      title={`Click to view all ${data.label} expiry items`}
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
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 mb-4 sm:mb-6 shadow-2xs">
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
                {reorderAlerts.map((item, i) => (
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
                      <button 
                        onClick={() => navigate("/reorder")}
                        className="px-3 py-1.5 rounded-md bg-[#0284c7] dark:bg-sky-600 hover:bg-[#0369a1] dark:hover:bg-sky-700 text-white text-[11px] font-semibold transition shrink-0 shadow-2xs"
                      >
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
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 mb-4 sm:mb-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h3 className="font-semibold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">
                  Recent activity
                </h3>
                <button 
                  onClick={() => navigate("/notifications")}
                  className="text-[10px] sm:text-xs font-medium text-[#0284c7] dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  View all <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="space-y-4">
                {recentActivity.map((item, i) => {
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
                      className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80 last:border-0 last:pb-0"
                    >
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${toneBg}`}
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
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-2xs">
              <h3 className="font-semibold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
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
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition text-left text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
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

          {/* SIDEBAR */}
          <aside className="space-y-4">
            {/* SHIPMENTS */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-[#0284c7] dark:text-sky-400" />
                  <h3 className="font-semibold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">
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
                    className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-semibold text-[#0284c7] dark:text-sky-400">
                        {shipment.id}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          shipment.status === "Delivered"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                            : "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40"
                        }`}
                      >
                        {shipment.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-2 truncate font-medium">
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
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Factory size={14} className="text-[#0284c7] dark:text-sky-400" />
                  <h3 className="font-semibold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">
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
                {topSuppliers.map((supplier) => (
                  <div
                    key={supplier.name}
                    className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {supplier.name}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span>{supplier.rating}</span>
                      </div>
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
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 ${
                          supplier.risk === "low"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${supplier.risk === "low" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {supplier.risk === "low" ? "Low Risk" : "Medium Risk"}
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
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">
                  Pharmacy Info
                </h3>
                <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
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
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <h3 className="font-semibold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
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

              <button className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white py-2.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm">
                Renew License
                <ChevronRight size={14} />
              </button>
            </div>

            {/* SYSTEM STATUS */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <h3 className="font-semibold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
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
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 mt-6 sm:mt-8">
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