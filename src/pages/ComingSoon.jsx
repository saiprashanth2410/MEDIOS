import { useNavigate } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import Navbar from "../components/dashboard/Navbar";

export default function ComingSoon({ title = "Feature" }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 text-slate-900 dark:text-white">

      {/* =====================================================
          TOP NAVBAR — Using shared component
      ====================================================== */}

      <Navbar onScanClick={() => {}} />

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:text-slate-100 mb-6"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-100 dark:border-slate-800 p-16 text-center shadow-sm max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center mx-auto mb-6">
            <Construction size={36} className="text-[#0284c7]" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-2">
            {title}
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-2">
            This feature is coming soon
          </p>

          <p className="text-xs text-slate-400 dark:text-slate-500 mb-8">
            We're working on it. Stay tuned!
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 bg-[#0284c7] text-white px-6 py-3 rounded-md text-sm font-semibold hover:bg-[#0369a1] transition shadow-sm"
          >
            <ArrowLeft size={14} />
            Go to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}