import {
  BrainCircuit,
  Boxes,
  AlertTriangle,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  Activity,
} from "lucide-react";
import Navbar from "../components/dashboard/Navbar";
import MetricCard from "../components/ui/MetricCard";

const KPI_METRICS = [
  { icon: BrainCircuit, label: "Demand Forecast Error", oldValue: "48-27%", newValue: "3%", percentage: 83, tone: "violet" },
  { icon: Boxes, label: "Inventory Overstock", oldValue: "22%", newValue: "14%", percentage: 36, tone: "blue" },
  { icon: AlertTriangle, label: "Stockout Incidents", oldValue: "9%", newValue: "1.8%", percentage: 80, tone: "green" },
  { icon: Clock, label: "Procurement Delay", oldValue: "14-18 days", newValue: "7 days", percentage: 56, tone: "amber" },
  { icon: TrendingUp, label: "Revenue Growth", oldValue: "1.2L", newValue: "2.45L", percentage: 104, tone: "green" },
  { icon: Package, label: "Stock Turnover", oldValue: "12 days", newValue: "8 days", percentage: 33, tone: "blue" },
  { icon: DollarSign, label: "Cost Per Order", oldValue: "450", newValue: "320", percentage: 29, tone: "violet" },
  { icon: Activity, label: "System Uptime", oldValue: "97%", newValue: "99.8%", percentage: 3, tone: "amber" },
];

export default function Analytics() {
  return (
    <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar onScanClick={() => {}} />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            KPI metrics with improvement tracking
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_METRICS.map((metric) => (
            <MetricCard
              key={metric.label}
              icon={metric.icon}
              label={metric.label}
              oldValue={metric.oldValue}
              newValue={metric.newValue}
              percentage={metric.percentage}
              tone={metric.tone}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
