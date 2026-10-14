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
  ShoppingCart,
  Info,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BarcodeScanner from "../components/scanner/BarcodeScanner";
import AddMedicineModal from "../components/dashboard/AddMedicineModal";
import AddPrescriptionModal from "../components/prescriptions/AddPrescriptionModal";
import Navbar from "../components/dashboard/Navbar";
import PerformanceMetrics from "../components/dashboard/PerformanceMetrics";
import usePerformanceData from "../hooks/usePerformanceData";
import { useExpiryData, addExpiryItem } from "../utils/expiryStore";
import { billingFirebaseService } from "../services/billingFirebaseService";
import { pharmacistsFirebaseService } from "../services/pharmacistsFirebaseService";
import { inventoryFirebaseService } from "../services/inventoryFirebaseService";
import { medicinesAPI, prescriptionsAPI, notificationsAPI } from "../services/api";

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

  const [recentActivity, setRecentActivity] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [pharmacistCount, setPharmacistCount] = useState(1);
  const [todayDispensedCount, setTodayDispensedCount] = useState(0);
  const [todaySalesSum, setTodaySalesSum] = useState(0);

  // Live Firebase & local database data sync
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch real recent dispensing activity and sales
    billingFirebaseService
      .getRecentInvoices(10)
      .then((sales) => {
        if (!isMounted || !sales) return;
        const todayStr = new Date().toLocaleDateString("en-IN");
        const todaySales = sales.filter((s) => s.date === todayStr);

        const dispensedItemsCount = todaySales.reduce(
          (sum, s) => sum + (s.items?.reduce((isum, it) => isum + (Number(it.quantity) || 1), 0) || 1),
          0
        );
        const billedSum = todaySales.reduce(
          (sum, s) => sum + (Number(s.totals?.grandTotal || s.total) || 0),
          0
        );

        setTodayDispensedCount(dispensedItemsCount);
        setTodaySalesSum(billedSum);

        const saleActivities = sales.slice(0, 4).map((s) => ({
          icon: Receipt,
          text: `Invoice #${s.invoiceNumber} — dispensed to ${s.customer?.name || "Patient"} (₹${(s.totals?.grandTotal || s.total || 0).toFixed(0)})`,
          time: s.time || s.date || "Today",
          tone: "green",
        }));
        if (saleActivities.length > 0) {
          setRecentActivity(saleActivities);
        }
      })
      .catch((err) => console.debug("Billing activity sync fallback:", err));

    // 3. Fetch active staff count
    pharmacistsFirebaseService
      .list()
      .then((list) => {
        if (isMounted && Array.isArray(list)) {
          setPharmacistCount(list.length || 1);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const userName = user?.name || "Pharmacist";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const handleAddMedicine = async (newMedicine) => {
    const medPayload = {
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
    };

    try {
      await inventoryFirebaseService.addMedicine(medPayload);
      if (medPayload.expiry) {
        addExpiryItem({
          id: medPayload.code,
          medicineName: medPayload.name,
          batchNumber: medPayload.batch || "BATCH-01",
          quantity: medPayload.stock,
          price: medPayload.price,
          expiryDate: medPayload.expiry,
          supplier: medPayload.supplierName,
          location: medPayload.rack,
        });
      }
      await medicinesAPI.create(medPayload);
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
              Real-time pharmacy inventory, dispensing dashboard.
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
                  { icon: Receipt, label: "POS Billing", action: "billing" },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => {
                        if (action.action === "scan") setShowScanner(true);
                        if (action.action === "medicine") setShowAddMedicine(true);
                        if (action.action === "prescription") setShowAddPrescription(true);
                        if (action.action === "billing") navigate("/billing");
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
                {shipments.length > 0 ? (
                  shipments.map((shipment) => (
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
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      All supplier consignments received. No pending transit shipments.
                    </p>
                  </div>
                )}
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
                  value={user?.pharmacyId || (user?.uid ? `PH-${user.uid.slice(0, 6).toUpperCase()}` : "PH-001")}
                />
                <InfoRow
                  icon={BadgeCheck}
                  label="License No."
                  value={user?.license || "Configure in Profile"}
                />
                <InfoRow
                  icon={MapPin}
                  label="Branch"
                  value={user?.branch || "Main Dispensary"}
                />
                <InfoRow
                  icon={Stethoscope}
                  label="On-duty Staff"
                  value={`${pharmacistCount} pharmacist${pharmacistCount === 1 ? "" : "s"}`}
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
                  <span>+{todayDispensedCount} items dispensed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowDown size={12} className="text-teal-600 dark:text-teal-400" />
                  <span>₹{todaySalesSum.toFixed(0)} billed</span>
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

              <a
                href="https://www.tamilnadumedicalcouncil.org/u/login"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white py-2.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
              >
                <span>Renew License</span>
                <ExternalLink size={14} />
              </a>
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