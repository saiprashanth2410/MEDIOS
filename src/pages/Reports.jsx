import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Pill,
  ClipboardList,
  TrendingUp,
  Package,
  Download,
  Calendar,
  DollarSign,
  Activity,
  Receipt,
} from "lucide-react";
import Navbar from "../components/dashboard/Navbar";
import { billingFirebaseService } from "../services/billingFirebaseService";
import { prescriptionsFirebaseService } from "../services/prescriptionsFirebaseService";
import { inventoryFirebaseService } from "../services/inventoryFirebaseService";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Reports() {
  const [stats, setStats] = useState([
    { label: "Revenue (Live)", value: "₹0", change: "Live sync", trend: "up", icon: DollarSign },
    { label: "Prescriptions Filled", value: "0", change: "Verified", trend: "up", icon: ClipboardList },
    { label: "Medicines Sold", value: "0", change: "Real-time", trend: "up", icon: Pill },
    { label: "Catalog Medicines", value: "0 Items", change: "In Stock", trend: "up", icon: Package },
  ]);
  const [topMedicines, setTopMedicines] = useState([]);
  const [activity, setActivity] = useState([]);
  const [chartData, setChartData] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  // Live calculation from real transactions and inventory
  useEffect(() => {
    let isMounted = true;

    const fetchReportData = async () => {
      try {
        const [sales, rxStats, catalogMeds] = await Promise.all([
          billingFirebaseService.getRecentInvoices(100).catch(() => []),
          prescriptionsFirebaseService.stats().catch(() => ({ total: 0, dispensed: 0 })),
          Promise.resolve(inventoryFirebaseService.getMedicines()),
        ]);

        if (!isMounted) return;

        let totalRevenue = 0;
        let totalUnitsSold = 0;
        const medicineCounts = {};
        const monthRevenue = new Array(12).fill(0);

        (sales || []).forEach((s) => {
          const grandTotal = Number(s.totals?.grandTotal || s.total) || 0;
          totalRevenue += grandTotal;

          // Parse month if date exists
          if (s.date) {
            const parts = s.date.split("/");
            if (parts.length === 3) {
              const monthIdx = Number(parts[1]) - 1;
              if (monthIdx >= 0 && monthIdx < 12) {
                monthRevenue[monthIdx] += grandTotal;
              }
            }
          }

          if (Array.isArray(s.items)) {
            s.items.forEach((item) => {
              const qty = Number(item.quantity) || 1;
              const unitPrice = Number(item.unitPrice || item.price) || 0;
              totalUnitsSold += qty;

              const name = item.name || "Medicine";
              if (!medicineCounts[name]) {
                medicineCounts[name] = { sold: 0, revenue: 0 };
              }
              medicineCounts[name].sold += qty;
              medicineCounts[name].revenue += qty * unitPrice;
            });
          }
        });

        const activeCatalogCount = catalogMeds?.length || 0;
        const filledPrescriptions = rxStats?.dispensed || 0;

        // Update real stats
        setStats([
          {
            label: "Revenue (Live)",
            value: `₹${totalRevenue.toLocaleString("en-IN")}`,
            change: totalRevenue > 0 ? "+100% live" : "Active counter",
            trend: "up",
            icon: DollarSign,
          },
          {
            label: "Prescriptions Filled",
            value: filledPrescriptions.toString(),
            change: `${rxStats?.total || 0} total`,
            trend: "up",
            icon: ClipboardList,
          },
          {
            label: "Medicines Sold",
            value: totalUnitsSold.toString(),
            change: "POS Units",
            trend: "up",
            icon: Pill,
          },
          {
            label: "Catalog Medicines",
            value: `${activeCatalogCount} Items`,
            change: "Live inventory",
            trend: "up",
            icon: Package,
          },
        ]);

        // Top selling medicines
        const sortedTop = Object.entries(medicineCounts)
          .map(([name, data]) => ({
            name,
            sold: data.sold,
            revenue: `₹${data.revenue.toLocaleString("en-IN")}`,
          }))
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 5);

        setTopMedicines(sortedTop);

        // Chart data
        const maxVal = Math.max(...monthRevenue, 1);
        const normalizedChart = monthRevenue.map((val) =>
          val > 0 ? Math.round((val / maxVal) * 100) : 10
        );
        setChartData(normalizedChart);

        // Live recent activities
        const saleActivities = (sales || []).slice(0, 6).map((s) => ({
          text: `Invoice #${s.invoiceNumber} — dispensed to ${s.customer?.name || "Patient"} (₹${Number(s.totals?.grandTotal || s.total || 0).toFixed(0)})`,
          time: s.time || s.date || "Today",
          tone: "green",
        }));
        setActivity(saleActivities);
      } catch (err) {
        console.debug("Reports live data calculation error:", err);
      }
    };

    fetchReportData();

    const handleUpdate = () => fetchReportData();
    window.addEventListener("meditrack_sales_updated", handleUpdate);
    window.addEventListener("meditrack_prescriptions_updated", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("meditrack_sales_updated", handleUpdate);
      window.removeEventListener("meditrack_prescriptions_updated", handleUpdate);
    };
  }, []);

  const handleExport = () => {
    const headers = ["Medicine Name", "Units Sold", "Revenue Generated"];
    const rows =
      topMedicines.length > 0
        ? topMedicines.map((m) => [m.name, m.sold, m.revenue])
        : [["No sales recorded yet", "0", "₹0"]];
    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `meditrack_sales_report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sales report exported successfully");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar onScanClick={() => {}} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Reports &amp; Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live dispensing metrics, catalog stock values, and tax invoices
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Download size={16} />
            Export CSV Report
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200/50 dark:border-sky-800/40 flex items-center justify-center text-[#0284c7] dark:text-sky-400">
                    <Icon size={20} />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                    <TrendingUp size={12} />
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Two-column layout: Chart + Top Medicines */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[#0284c7] dark:text-sky-400" />
                <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">
                  Monthly Revenue Trends
                </h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                FY 2026
              </span>
            </div>

            {/* Bar chart */}
            <div className="h-52 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2">
              {chartData.map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div
                    className="w-full rounded-t-md bg-[#0284c7] dark:bg-sky-500 group-hover:bg-[#0369a1] transition-all relative"
                    style={{ height: `${Math.max(val, 6)}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded pointer-events-none whitespace-nowrap z-10 shadow-lg">
                      {MONTHS[idx]}: {val}%
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {MONTHS[idx].slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Selling Medicines */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <Pill size={16} className="text-[#0284c7] dark:text-sky-400" />
              <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">
                Top Dispensed Medicines
              </h3>
            </div>

            {topMedicines.length > 0 ? (
              <div className="space-y-3">
                {topMedicines.map((med, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {med.name}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {med.sold} units dispensed
                      </p>
                    </div>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                      {med.revenue}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Receipt className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={28} />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No sales recorded yet
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Dispense items in Billing to see live top medicines.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit / Sales Log */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-[#0284c7] dark:text-sky-400" />
            <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">
              Recent Transactions &amp; Audit Log
            </h3>
          </div>

          {activity.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activity.map((act, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {act.text}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {act.time}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-3 text-center">
              No recent transaction activity recorded yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}