import { toast } from "sonner";
import {
  Pill,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Package,
  Download,
  Calendar,
  DollarSign,
  Activity,
} from "lucide-react";
import Navbar from "../components/dashboard/Navbar";

const STATS = [
  { label: "Revenue (This Month)", value: "₹2,45,000", change: "+18.2%", trend: "up", icon: DollarSign },
  { label: "Prescriptions Filled", value: "1,247", change: "+12.5%", trend: "up", icon: ClipboardList },
  { label: "Medicines Sold", value: "8,450", change: "+22.4%", trend: "up", icon: Pill },
  { label: "Expired Stock Value", value: "₹12,500", change: "-8.2%", trend: "down", icon: Package },
];

const TOP_MEDICINES = [
  { name: "Paracetamol 650mg", sold: 1240, revenue: "₹15,500" },
  { name: "Amoxicillin 500mg", sold: 890, revenue: "₹40,050" },
  { name: "Pantoprazole 40mg", sold: 720, revenue: "₹90,000" },
  { name: "Cetirizine 10mg", sold: 650, revenue: "₹14,300" },
  { name: "Metformin 500mg", sold: 540, revenue: "₹22,680" },
];

const CHART_DATA = [45, 62, 48, 75, 58, 82, 70, 91, 78, 95, 88, 76];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ACTIVITY = [
  { text: "Prescription #RX-4821 dispensed", time: "2 min ago", tone: "green" },
  { text: "New medicine added: Amoxicillin 500mg", time: "18 min ago", tone: "blue" },
  { text: "Low stock alert: Insulin Glargine", time: "1 hr ago", tone: "amber" },
  { text: "Drug license renewal completed", time: "3 hrs ago", tone: "green" },
  { text: "Batch BT-9921 flagged for expiry", time: "5 hrs ago", tone: "amber" },
];

export default function Reports() {
  const handleExport = () => {
    const headers = ["Medicine Name", "Units Sold", "Revenue Generated"];
    const rows = TOP_MEDICINES.map((m) => [m.name, m.sold, m.revenue]);
    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `meditrack_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Pharmacy report exported to CSV!");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* =====================================================
          TOP NAVBAR — Using shared component
      ====================================================== */}

      <Navbar onScanClick={() => {}} />

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Reports & Analytics</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track your pharmacy performance</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toast.info("Date picker coming soon")}
              className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
            >
              <Calendar size={16} />
              This Month
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0369a1] transition shadow-xs"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            const trendColor = stat.trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400";
            return (
              <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-200/60 dark:border-sky-500/25 flex items-center justify-center text-[#0284c7] dark:text-sky-400">
                    <Icon size={18} />
                  </div>
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${trendColor}`}>
                    {stat.trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-6 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">Revenue Trend</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 12 months</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                +22.4% growth
              </span>
            </div>
            <div className="flex items-end gap-2 h-48">
              {CHART_DATA.map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-[#0284c7] to-[#38bdf8] hover:opacity-85 transition cursor-pointer"
                    style={{ height: `${height}%` }}
                    title={`${MONTHS[i]}: ₹${height},000`}
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">Top Medicines</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                This Month
              </span>
            </div>
            <div className="space-y-4">
              {TOP_MEDICINES.map((med, i) => (
                <div key={med.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-[10px] font-bold text-[#0284c7] dark:text-sky-400 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{med.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-[#0284c7] dark:text-sky-400 shrink-0 ml-2">{med.revenue}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8]"
                      style={{ width: `${(med.sold / 1240) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">Recent activity</h3>
          </div>
          <div className="space-y-4">
            {ACTIVITY.map((item, i) => {
              const toneBg = {
                green: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40",
                blue: "bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40",
                amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40",
              }[item.tone];
              return (
                <div key={i} className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80 last:border-0 last:pb-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${toneBg}`}>
                    <Activity size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200">{item.text}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}