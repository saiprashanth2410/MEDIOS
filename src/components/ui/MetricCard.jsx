import { TrendingUp, ArrowRight } from "lucide-react";

export default function MetricCard({
  icon: Icon,
  label,
  oldValue,
  newValue,
  percentage,
  tone = "violet",
}) {
  const tones = {
    violet: { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400" },
    blue: { bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-600 dark:text-sky-400" },
    green: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400" },
  };
  const style = tones[tone] || tones.violet;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-6">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${style.bg}`}
        >
          <Icon size={20} className={style.text} />
        </div>

        {percentage !== undefined && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <TrendingUp size={12} />
            {percentage}%
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 font-medium">{label}</p>

      <div className="flex items-center gap-2.5">
        {oldValue && (
          <>
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
              {oldValue}
            </span>
            <ArrowRight size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
          </>
        )}
        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
          {newValue}
        </span>
      </div>
    </div>
  );
}