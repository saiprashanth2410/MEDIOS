import { useNavigate } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import Navbar from "../components/dashboard/Navbar";

export default function ComingSoon({ title = "Feature" }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* =====================================================
          TOP NAVBAR — Using shared component
      ====================================================== */}

      <Navbar onScanClick={() => {}} />

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-2xs max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 flex items-center justify-center mx-auto mb-6">
            <Construction size={32} className="text-[#0284c7] dark:text-sky-400" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
            {title}
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
            This module is currently in development
          </p>

          <p className="text-xs text-slate-400 dark:text-slate-500 mb-8">
            Check back soon or explore other features.
          </p>

          {/* Go to Dashboard Button */}
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 bg-[#0284c7] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0369a1] transition shadow-2xs"
          >
            <ArrowLeft size={14} />
            Go to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}