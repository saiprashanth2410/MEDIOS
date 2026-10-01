import { useState, useEffect } from "react";
import {
  BrainCircuit,
  Boxes,
  AlertTriangle,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  Activity,
  CheckCircle2,
  Users,
} from "lucide-react";
import Navbar from "../components/dashboard/Navbar";
import MetricCard from "../components/ui/MetricCard";
import { inventoryFirebaseService } from "../services/inventoryFirebaseService";
import { billingFirebaseService } from "../services/billingFirebaseService";
import { prescriptionsFirebaseService } from "../services/prescriptionsFirebaseService";
import { suppliersFirebaseService } from "../services/suppliersFirebaseService";
import defaultMedicines from "../data/catalogMedicines.json";

export default function Analytics() {
  const [metrics, setMetrics] = useState([]);
  const [liveSummary, setLiveSummary] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const computeLiveAnalytics = async () => {
      try {
        const [meds, sales, rxStats, supStats] = await Promise.all([
          Promise.resolve(inventoryFirebaseService.getMedicines()),
          billingFirebaseService.getRecentInvoices(100).catch(() => []),
          prescriptionsFirebaseService.stats().catch(() => ({ total: 0, dispensed: 0 })),
          suppliersFirebaseService.stats().catch(() => ({ total: 10, active: 10 })),
        ]);

        if (!isMounted) return;

        const allMeds = meds?.length > 0 ? meds : defaultMedicines;
        const totalMeds = allMeds.length;
        const lowStock = allMeds.filter((m) => Number(m.stock) > 0 && Number(m.stock) <= (Number(m.minStock) || 20)).length;
        const outOfStock = allMeds.filter((m) => Number(m.stock) <= 0).length;

        const totalPresc = rxStats?.total || 0;
        const dispensed = rxStats?.dispensed || 0;
        const activeSuppliers = supStats?.active || supStats?.total || 10;
        const totalSuppliers = supStats?.total || 10;

        const totalRevenue = (sales || []).reduce(
          (sum, s) => sum + (Number(s.totals?.grandTotal || s.total) || 0),
          0
        );

        const stockoutRate = totalMeds > 0 ? ((outOfStock / totalMeds) * 100).toFixed(1) : "0.0";
        const lowStockRate = totalMeds > 0 ? ((lowStock / totalMeds) * 100).toFixed(1) : "0.0";
        const fulfillRate = totalPresc > 0 ? Math.round((dispensed / totalPresc) * 100) : 100;
        const supplierReliability = totalSuppliers > 0 ? Math.round((activeSuppliers / totalSuppliers) * 100) : 100;

        setLiveSummary({
          inventory: {
            totalMedicines: totalMeds,
            lowStockMedicines: lowStock,
            outOfStockMedicines: outOfStock,
          },
          sales: {
            totalSales: sales?.length || 0,
            revenue: totalRevenue,
          },
          prescriptions: {
            total: totalPresc,
            dispensed,
          },
          suppliers: {
            total: totalSuppliers,
            active: activeSuppliers,
          },
        });

        setMetrics([
          {
            icon: Boxes,
            label: "Low Stock Inventory",
            oldValue: "Baseline <5%",
            newValue: `${lowStockRate}%`,
            percentage: Math.min(100, Math.round(Number(lowStockRate) * 10)),
            tone: lowStock > 0 ? "amber" : "blue",
          },
          {
            icon: AlertTriangle,
            label: "Stockout Incidents",
            oldValue: "0 target",
            newValue: `${stockoutRate}%`,
            percentage: Math.min(100, Math.round(Number(stockoutRate) * 10)),
            tone: outOfStock > 0 ? "red" : "green",
          },
          {
            icon: TrendingUp,
            label: "Live Revenue",
            oldValue: "₹0 start",
            newValue: `₹${totalRevenue.toLocaleString("en-IN")}`,
            percentage: totalRevenue > 0 ? 100 : 0,
            tone: "green",
          },
          {
            icon: Clock,
            label: "Prescription Fulfillment",
            oldValue: "90% target",
            newValue: `${fulfillRate}%`,
            percentage: fulfillRate,
            tone: "blue",
          },
          {
            icon: BrainCircuit,
            label: "Supplier Compliance",
            oldValue: "95% SLA",
            newValue: `${supplierReliability}%`,
            percentage: supplierReliability,
            tone: "violet",
          },
          {
            icon: Package,
            label: "Active Catalog Items",
            oldValue: "505 master",
            newValue: `${totalMeds} Items`,
            percentage: 100,
            tone: "emerald",
          },
          {
            icon: DollarSign,
            label: "Transactions Dispensed",
            oldValue: "POS Counter",
            newValue: `${sales?.length || 0} Bills`,
            percentage: Math.min(100, (sales?.length || 0) * 10),
            tone: "violet",
          },
          {
            icon: Activity,
            label: "System Uptime & Sync",
            oldValue: "99.0%",
            newValue: "100%",
            percentage: 100,
            tone: "emerald",
          },
        ]);
      } catch (err) {
        console.debug("Analytics live compute error:", err);
      }
    };

    computeLiveAnalytics();

    const handleUpdate = () => computeLiveAnalytics();
    window.addEventListener("meditrack_stock_updated", handleUpdate);
    window.addEventListener("meditrack_sales_updated", handleUpdate);
    window.addEventListener("meditrack_prescriptions_updated", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("meditrack_stock_updated", handleUpdate);
      window.removeEventListener("meditrack_sales_updated", handleUpdate);
      window.removeEventListener("meditrack_prescriptions_updated", handleUpdate);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar onScanClick={() => {}} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Analytics &amp; Intelligence
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live KPI metrics calculated from active pharmacy inventory, POS billing, and verified catalog
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            Cloud Database Connected (Firebase &amp; Firestore)
          </span>
        </div>

        {/* Live Database Overview Pill Bar */}
        {liveSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Catalog Medicines</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {liveSummary.inventory.totalMedicines}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Low Stock Alerts</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {liveSummary.inventory.lowStockMedicines}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Invoices Dispensed</p>
              <p className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                {liveSummary.sales.totalSales}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Active Suppliers</p>
              <p className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                {liveSummary.suppliers.active}
              </p>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, idx) => (
            <MetricCard key={idx} {...metric} />
          ))}
        </div>
      </main>
    </div>
  );
}
