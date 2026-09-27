export default function StatCard({ stat }) {
  const Icon = stat.icon;
  const trendColor =
    stat.trend === "up"
      ? "text-emerald-600"
      : stat.trend === "warn"
      ? "text-amber-600"
      : "text-slate-500";

  return (
    <div className="bg-white rounded-lg p-5 border border-sky-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-md bg-sky-50 flex items-center justify-center">
          <Icon size={18} className="text-[#0284c7]" />
        </div>
        <span className={`text-[11px] font-semibold ${trendColor}`}>
          {stat.change}
        </span>
      </div>

      <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
      <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
    </div>
  );
}
