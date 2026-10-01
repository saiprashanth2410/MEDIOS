export default function StatCard({ stat }) {
  const Icon = stat.icon;
  const trendColor =
    stat.trend === "up"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40"
      : stat.trend === "warn"
      ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40"
      : "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 flex items-center justify-center">
          <Icon size={18} className="text-[#0284c7] dark:text-sky-400" />
        </div>
        {stat.change && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${trendColor}`}>
            {stat.change}
          </span>
        )}
      </div>

      <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{stat.value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
    </div>
  );
}
