import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Pill,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
  LogOut,
  BrainCircuit,
  Boxes,
  AlertTriangle,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  Activity,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import MetricCard from "../components/ui/MetricCard";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Pill, label: "Medicines", path: "/medicines" },
  { icon: ClipboardList, label: "Prescriptions", path: "/prescriptions" },
  { icon: Users, label: "Pharmacists", path: "/pharmacists" },
  { icon: BarChart3, label: "Analytics", active: true, path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/profile" },
];

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
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userName = user?.name || "Pharmacist";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f0f9ff] text-slate-900">
      <header className="bg-[#0284c7] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
              <Pill size={20} className="text-[#0284c7]" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold tracking-tight">MediTrack</h1>
              <p className="text-[9px] uppercase tracking-widest text-white/70 font-medium">
                Pharmacy OS
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => item.path && navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-white/15 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold leading-tight">{userName}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
              {userName[0]?.toUpperCase()}
            </div>
            <button onClick={handleLogout} className="p-2 rounded-md hover:bg-white/10 transition">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
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
