import { useMemo } from "react";
import {
  Brain,
  Box,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  calculateForecastError,
  calculateOverstock,
  calculateStockoutRate,
  calculateProcurementDelay,
  calculateTrend,
} from "../../utils/calculateMetrics";

const DEFAULT_METRIC_DATA = {
  sales: [],
  medicines: [],
  orders: [],
  shipments: [],
  rawMeds: [],
  rawSales: [],
};

/* =====================================================
   METRIC CARD CONFIG
===================================================== */

const METRIC_CONFIG = [
  {
    id: "forecast",
    icon: Brain,
    label: "Demand Forecast Error",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/15 border border-purple-200/50 dark:border-purple-500/20",
    iconColor: "text-purple-600 dark:text-purple-400",
    baselineLabel: "18–27%",
    baselineValue: 22.5,
    unit: "%",
    lowerIsBetter: true,
  },
  {
    id: "overstock",
    icon: Box,
    label: "Inventory Overstock",
    iconBg: "bg-blue-500/10 dark:bg-sky-500/15 border border-blue-200/50 dark:border-sky-500/20",
    iconColor: "text-blue-600 dark:text-sky-400",
    baselineLabel: "22%",
    baselineValue: 22,
    unit: "%",
    lowerIsBetter: true,
  },
  {
    id: "stockout",
    icon: AlertTriangle,
    label: "Stockout Incidents",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-200/50 dark:border-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    baselineLabel: "9%",
    baselineValue: 9,
    unit: "%",
    lowerIsBetter: true,
  },
  {
    id: "delay",
    icon: Clock,
    label: "Procurement Delay",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200/50 dark:border-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    baselineLabel: "14–18 days",
    baselineValue: 16,
    unit: " days",
    lowerIsBetter: true,
  },
];

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function PerformanceMetrics({ data = DEFAULT_METRIC_DATA }) {
  /* =====================================================
     COMPUTE METRICS FROM DATA
  ===================================================== */

  const metrics = useMemo(() => {
    return {
      forecast: calculateForecastError(data.sales),
      overstock: calculateOverstock(data.medicines),
      stockout: calculateStockoutRate(data.orders),
      delay: calculateProcurementDelay(data.shipments),
    };
  }, [data]);

  /* =====================================================
     BUILD CARD DATA
  ===================================================== */

  const cards = METRIC_CONFIG.map((config) => {
    const currentValue = metrics[config.id] || 0;
    const baseline = config.baselineValue;
    const improvement = calculateTrend(baseline, currentValue, config.lowerIsBetter);
    const isBetter =
      config.lowerIsBetter ? currentValue < baseline : currentValue > baseline;

    return {
      ...config,
      currentValue,
      improvement,
      isBetter,
    };
  });

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="w-full">
      {/* Header toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Performance Metrics
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            AI Supply Chain & POS Telemetry
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const TrendIcon = card.isBetter ? TrendingUp : TrendingDown;

          return (
            <div
              key={card.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition"
            >
              {/* Top row — icon + improvement badge */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}
                >
                  <Icon size={18} className={card.iconColor} />
                </div>

                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold ${
                    card.isBetter
                      ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20"
                      : "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20"
                  }`}
                  title={`${Math.abs(card.improvement)}% improvement over traditional industry standard`}
                >
                  <TrendIcon size={11} />
                  <span>+{Math.abs(card.improvement)}%</span>
                </div>
              </div>

              {/* Label */}
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
                {card.label}
              </p>

              {/* Value row — baseline > current */}
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400 dark:text-slate-500" title="Industry Benchmark">
                  {card.baselineLabel}
                </span>
                <span className="text-slate-300 dark:text-slate-600">›</span>
                <span
                  className={`text-2xl font-bold ${
                    card.isBetter
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {card.currentValue}
                  {card.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}