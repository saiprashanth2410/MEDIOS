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
    violet: { bg: "bg-violet-50", text: "text-violet-600" },
    blue: { bg: "bg-sky-50", text: "text-sky-600" },
    green: { bg: "bg-emerald-50", text: "text-emerald-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-600" },
  };
  const style = tones[tone] || tones.violet;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-6">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${style.bg}`}
        >
          <Icon size={20} className={style.text} />
        </div>

        {percentage !== undefined && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold">
            <TrendingUp size={12} />
            {percentage}%
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600 mb-3 font-medium">{label}</p>

      <div className="flex items-center gap-2.5">
        {oldValue && (
          <>
            <span className="text-sm font-medium text-slate-400">
              {oldValue}
            </span>
            <ArrowRight size={14} className="text-slate-400 shrink-0" />
          </>
        )}
        <span className="text-2xl font-bold text-emerald-600 tracking-tight">
          {newValue}
        </span>
      </div>
    </div>
  );
}