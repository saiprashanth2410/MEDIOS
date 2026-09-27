import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email || "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white mb-6"
        >
          <ArrowLeft size={16} />
          Back to login
        </button>

        <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center mb-4">
          <Mail size={22} className="text-teal-600 dark:text-teal-400" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Reset your password
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-6">
          We'll send a reset link to{" "}
          <strong className="text-slate-700 dark:text-slate-300">
            {email || "your email"}
          </strong>
        </p>

        <button
          onClick={() => navigate("/login")}
          className="w-full h-12 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold transition"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}