import { useState, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  Lock,
  Mail,
  Pill,
  Route,
  Scan,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

/* =====================================================
   CONSTANTS
===================================================== */

const SPARK_HEIGHTS = [42, 30, 55, 38, 68, 50, 82, 62, 90, 74, 96, 88];

const FIELD_BASE =
  "w-full h-[58px] pl-11 pr-4 rounded-xl border text-sm outline-none transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 dark:text-slate-500";

const FIELD_LIGHT =
  "border-slate-200 dark:border-slate-700 bg-slate-50/50 focus:bg-white dark:bg-slate-900 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10";

const FIELD_DARK =
  "dark:border-slate-700 dark:bg-slate-900/60 dark:text-white dark:focus:bg-slate-900 dark:focus:border-teal-500 dark:focus:ring-teal-500/20";

/* =====================================================
   STYLES
===================================================== */

const GlobalStyles = () => (
  <style>{`
    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    @keyframes floatY {
      0%, 100% { transform: translateY(0px) rotate(var(--rot, 0deg)); }
      50% { transform: translateY(-10px) rotate(var(--rot, 0deg)); }
    }
    @keyframes pulseSoft {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
    @keyframes blobMove {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(40px, -50px) scale(1.08); }
      66% { transform: translate(-30px, 30px) scale(0.94); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .animate-gradient {
      background-size: 200% 200%;
      animation: gradientShift 8s ease infinite;
    }
    .animate-float { animation: floatY 5s ease-in-out infinite; }
    .animate-float-slow { animation: floatY 7s ease-in-out infinite; }
    .animate-pulse-soft { animation: pulseSoft 2s ease-in-out infinite; }
    .animate-blob { animation: blobMove 16s ease-in-out infinite; }
    .animate-fade-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }

    .glass {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
    }
    .dark .glass {
      background: rgba(15, 23, 42, 0.55);
    }

    .tilt-hover {
      transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease;
    }
    .tilt-hover:hover {
      transform: rotate(0deg) scale(1.04) translateY(-6px) !important;
    }

    .shimmer-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(
        110deg,
        transparent 30%,
        rgba(255,255,255,0.25) 50%,
        transparent 70%
      );
      background-size: 200% 100%;
      animation: shimmer 3s linear infinite;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .animate-blob, .animate-float, .animate-float-slow,
      .animate-gradient, .animate-fade-up, .shimmer-btn::after {
        animation: none !important;
      }
    }
  `}</style>
);

/* =====================================================
   REUSABLE PIECES
===================================================== */

function FloatingCard({ className, style, children }) {
  return (
    <div
      className={`glass dark:bg-slate-900/60 rounded-[22px] shadow-[0_25px_60px_rgba(15,118,110,0.18)] border border-white/60 dark:border-slate-700/70 tilt-hover ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function StatBadge({ icon: Icon, label, value, tone = "teal" }) {
  const tones = {
    teal: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400",
    amber: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-50 dark:bg-rose-950/50 text-rose-500 dark:text-rose-400",
    violet: "bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400",
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 truncate">{label}</p>
        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{value}</p>
      </div>
    </div>
  );
}

/* =====================================================
   LOGIN COMPONENT
===================================================== */

function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  /* =====================================================
     AUTO REDIRECT ON LOGIN SUCCESS
  ===================================================== */
  useEffect(() => {
    if (user) {
      console.log("[Login] User detected, redirecting to dashboard");
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });

        // Safari fallback
        setTimeout(() => {
          if (window.location.pathname === "/login") {
            console.log("[Login] SPA nav failed, hard redirect");
            window.location.href = "/dashboard";
          }
        }, 500);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  /* Clear error when user types */
  useEffect(() => {
    if (error) setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  /* =====================================================
     HANDLE SUBMIT
  ===================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError("");

    console.log("[Login] Submit triggered");
    console.log("[Login] Email:", email);
    console.log("[Login] Password length:", password.length);
    console.log("[Login] Remember:", remember);

    if (!email.trim() || !password.trim()) {
      setError("Both email and password are required.");
      toast.error("Please fill in all fields");
      return;
    }
    if (!emailValid) {
      setError("Please enter a valid work email.");
      toast.error("Invalid email format");
      return;
    }
    if (!passwordValid) {
      setError("Password must be at least 6 characters.");
      toast.error("Password too short");
      return;
    }

    try {
      setLoading(true);

      // ✅ CORRECT CALL — pass email, password, remember
      console.log("[Login] Calling login() with:", {
        email,
        passwordLength: password.length,
        remember,
      });

      const result = await login({ email, password, remember });

      console.log("[Login] Result:", result);

      if (!result?.ok) {
        setError(result?.message || "Login failed");
      }
      // ✅ Navigation handled by useEffect
    } catch (err) {
      console.error("[Login] Error:", err);
      setError("Something went wrong. Please try again.");
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     FORGOT PASSWORD
  ===================================================== */
  const handleForgotPassword = () => {
    if (!email.trim()) {
      setError("Enter your email first to reset your password.");
      toast.error("Enter your email first");
      return;
    }
    toast.info(`Reset link sent to ${email}`);
    console.log("Reset link →", email);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      <GlobalStyles />

      <div className="min-h-screen grid lg:grid-cols-[42%_58%]">

        {/* =====================================================
            LEFT — LOGIN PANEL
        ====================================================== */}

        <section className="relative min-h-screen flex items-center justify-center px-6 sm:px-10 lg:px-14 xl:px-20 py-10 bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800">

          <div
            className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#0f766e 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative w-full max-w-[440px] z-10 animate-fade-up">

            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-10 lg:hidden">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white shadow-lg shadow-teal-900/20">
                <Pill size={22} strokeWidth={2.4} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">MediTrack</h1>
                <p className="text-[10px] uppercase tracking-[0.18em] text-teal-700/70 dark:text-teal-400/70 font-medium">
                  Pharmacy OS
                </p>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-[30px] sm:text-[36px] font-bold tracking-[-0.035em] text-slate-900 dark:text-white leading-tight">
                Welcome back to MediTrack
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Sign in to pick up right where your team left off.
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-600 dark:text-rose-300 animate-fade-up"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* EMAIL */}
              <div>
                <label
                  htmlFor={emailId}
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Work email
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 pointer-events-none"
                  />
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    placeholder="you@pharmacy.com"
                    aria-invalid={touched.email && !emailValid}
                    className={`${FIELD_BASE} ${FIELD_LIGHT} ${FIELD_DARK} ${
                      touched.email && email && !emailValid
                        ? "border-rose-300 dark:border-rose-800"
                        : ""
                    }`}
                  />
                  {touched.email && email && emailValid && (
                    <CheckCircle2
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-600 dark:text-teal-400"
                    />
                  )}
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label
                    htmlFor={passwordId}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm font-medium text-teal-700 dark:text-teal-400 hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 pointer-events-none"
                  />
                  <input
                    id={passwordId}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="Enter your password"
                    aria-invalid={touched.password && !passwordValid}
                    className={`${FIELD_BASE} ${FIELD_LIGHT} ${FIELD_DARK} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* REMEMBER */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <input
                    id={rememberId}
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 accent-teal-600 cursor-pointer rounded"
                  />
                  <label
                    htmlFor={rememberId}
                    className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 cursor-pointer select-none"
                  >
                    Keep me signed in
                  </label>
                </div>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="relative overflow-hidden group w-full h-[58px] mt-2 rounded-xl bg-gradient-to-r from-teal-700 via-teal-600 to-teal-800 animate-gradient disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_8px_20px_rgba(15,118,110,0.30)] hover:shadow-[0_14px_34px_rgba(15,118,110,0.40)] hover:-translate-y-0.5 shimmer-btn"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Login
                    <ArrowUpRight
                      size={17}
                      className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                    />
                  </>
                )}
              </button>

              {/* Trust */}
              <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-teal-600 dark:text-teal-400" />
                  256-bit encryption
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="flex items-center gap-1.5">
                  <Globe size={12} className="text-teal-600 dark:text-teal-400" />
                  SSO ready
                </span>
              </div>

            </form>

            <div className="mt-14 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-600 dark:text-slate-300">
              <Activity size={14} className="text-teal-600 dark:text-teal-400" />
              <span>MediTrack · Pharmacy Operating System</span>
            </div>

          </div>

        </section>

        {/* =====================================================
            RIGHT — BRAND PANEL
        ====================================================== */}

        <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f0fdfa] via-[#ecfeff] to-[#fef3c7] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <svg
              className="absolute top-[-12%] left-[-15%] w-[640px] h-[640px] opacity-60 dark:opacity-25 animate-blob"
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#14b8a6"
                d="M40,-58C54,-48,68,-38,73,-24C78,-10,74,8,66,23C58,38,45,50,30,58C15,66,-3,70,-19,65C-35,60,-48,47,-57,32C-66,17,-70,0,-66,-15C-62,-30,-51,-43,-38,-53C-25,-63,-12,-71,3,-75C18,-79,27,-68,40,-58Z"
                transform="translate(100 100)"
              />
            </svg>

            <svg
              className="absolute bottom-[-15%] right-[-10%] w-[580px] h-[580px] opacity-50 dark:opacity-20 animate-blob"
              style={{ animationDelay: "-5s" }}
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#f59e0b"
                d="M43,-66C58,-57,72,-47,77,-33C82,-19,79,-2,72,13C65,28,54,41,40,51C26,61,9,68,-8,68C-25,68,-42,61,-55,50C-68,39,-77,24,-78,8C-79,-8,-73,-25,-62,-37C-51,-49,-35,-56,-19,-63C-3,-70,13,-75,43,-66Z"
                transform="translate(100 100)"
              />
            </svg>
          </div>

          <div
            className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#0f766e 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          <div className="relative z-10 min-h-screen px-8 sm:px-12 lg:px-16 xl:px-20 py-10 flex flex-col">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white shadow-lg shadow-teal-900/20">
                  <Pill size={22} strokeWidth={2.4} />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight dark:text-white">
                    MediTrack
                  </h1>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-teal-700/70 dark:text-teal-400/70 font-medium">
                    Pharmacy OS
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center">
              <div className="w-full max-w-[720px]">
                <div className="relative h-[390px] sm:h-[440px] lg:h-[470px]">

                  <div className="absolute left-[18%] top-[7%] w-[55%] h-[75%] rounded-[36px] bg-gradient-to-br from-[#0f766e] via-[#0d9488] to-[#14b8a6] rotate-[-4deg] shadow-[0_35px_70px_rgba(13,148,136,0.28)] overflow-hidden tilt-hover">
                    <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full border border-white/15" />
                    <div className="absolute -left-10 bottom-10 w-40 h-40 rounded-full border border-white/10" />

                    <div className="absolute inset-x-7 top-7">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900/15 flex items-center justify-center">
                            <Boxes size={14} />
                          </div>
                          <span className="text-[10px] text-white/80 font-medium">
                            Stockroom
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-white/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse-soft" />
                          Live
                        </div>
                      </div>
                      <div className="mt-8">
                        <p className="text-[10px] text-white/60">Units in stock</p>
                        <p className="text-3xl font-bold text-white mt-1 tracking-tight">
                          18,942
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-100">
                          <TrendingUp size={11} />
                          +22.4% vs last month
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-8 left-7 right-7 h-32 flex items-end gap-1.5">
                      {SPARK_HEIGHTS.map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-md bg-white dark:bg-slate-900/30"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <FloatingCard
                    className="absolute left-[4%] top-[26%] w-[225px] sm:w-[250px] p-4 animate-float"
                    style={{ "--rot": "4deg" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center">
                        <Sparkles size={20} className="text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                          Smart Forecast
                        </p>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                          Demand stabilized
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-4">
                      <div className="w-2 h-2 rounded-full bg-teal-500" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        96.7% model accuracy
                      </span>
                    </div>
                  </FloatingCard>

                  <FloatingCard
                    className="absolute right-[3%] top-[12%] px-4 py-3 animate-float-slow"
                    style={{ "--rot": "3deg" }}
                  >
                    <StatBadge
                      icon={Route}
                      label="Logistics"
                      value="31 routes active"
                      tone="amber"
                    />
                  </FloatingCard>

                  <FloatingCard
                    className="absolute right-[7%] bottom-[12%] px-4 py-3 animate-float"
                    style={{ "--rot": "2deg" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
                        <CalendarClock size={17} className="text-rose-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                          Expiry watch
                        </p>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          5 batches{" "}
                          <span className="text-rose-500">urgent</span>
                        </p>
                      </div>
                    </div>
                  </FloatingCard>

                  <FloatingCard
                    className="absolute left-[26%] bottom-[4%] rounded-full px-3 py-1.5 flex items-center gap-2 animate-float-slow"
                    style={{ "--rot": "-3deg" }}
                  >
                    <Scan size={13} className="text-teal-600 dark:text-teal-400" />
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      Barcode scan ready
                    </span>
                  </FloatingCard>

                  <FloatingCard
                    className="absolute right-[18%] top-[4%] rounded-full px-3 py-1.5 flex items-center gap-2 animate-float"
                    style={{ "--rot": "6deg" }}
                  >
                    <Zap size={13} className="text-amber-500" />
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      0.2s sync
                    </span>
                  </FloatingCard>

                </div>

                <div className="mt-[-15px] max-w-[650px]">
                  <h2 className="text-[40px] sm:text-[52px] lg:text-[58px] xl:text-[66px] leading-[1] font-bold tracking-[-0.045em] dark:text-white">
                    Every dose tracked.
                    <br />
                    <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-amber-500 bg-clip-text text-transparent animate-gradient">
                      Every shelf smarter.
                    </span>
                  </h2>
                  <p className="mt-6 max-w-[520px] text-sm sm:text-base leading-7 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    MediTrack is the operating system for modern pharmacies —
                    predicting demand, catching expiry early, and keeping the
                    supply chain honest.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </section>

      </div>
    </div>
  );
}

export default Login;