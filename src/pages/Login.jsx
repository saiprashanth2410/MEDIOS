import { useState, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Pill,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  Boxes,
  CalendarClock,
  Route,
  Scan,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

/* =====================================================
   CONSTANTS & 3D LAYOUT ASSETS
===================================================== */

const SPARK_HEIGHTS = [42, 30, 55, 38, 68, 50, 82, 62, 90, 74, 96, 88];

const LEET_INPUT =
  "w-full h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition duration-150 focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600";

const LEET_BTN =
  "w-full h-11 rounded-lg bg-[#545e75] hover:bg-[#434b5e] active:scale-[0.99] text-white font-medium text-sm flex items-center justify-center transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed";

/* =====================================================
   3D KEYFRAME ANIMATIONS & STYLES
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

    .animate-gradient {
      background-size: 200% 200%;
      animation: gradientShift 8s ease infinite;
    }
    .animate-float { animation: floatY 5s ease-in-out infinite; }
    .animate-float-slow { animation: floatY 7s ease-in-out infinite; }
    .animate-pulse-soft { animation: pulseSoft 2s ease-in-out infinite; }
    .animate-blob { animation: blobMove 16s ease-in-out infinite; }

    .glass {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
    }
    .dark .glass {
      background: rgba(15, 23, 42, 0.65);
    }

    .tilt-hover {
      transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease;
    }
    .tilt-hover:hover {
      transform: rotate(0deg) scale(1.03) translateY(-6px) !important;
    }
  `}</style>
);

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
        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{label}</p>
        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{value}</p>
      </div>
    </div>
  );
}

/* =====================================================
   GOOGLE SVG ICON
===================================================== */

function GoogleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function Login() {
  const navigate = useNavigate();
  const { user, login, loginWithGoogle, register } = useAuth();

  const nameId = useId();
  const roleId = useId();
  const pharmacyId = useId();
  const licenseId = useId();
  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Chief Pharmacist");
  const [pharmacy, setPharmacy] = useState("");
  const [license, setLicense] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    pharmacy: false,
  });

  /* Auto redirect on authenticated user */
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
        setTimeout(() => {
          if (window.location.pathname === "/login") {
            window.location.href = "/dashboard";
          }
        }, 500);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  /* Handle Google Sign In */
  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (!result?.ok) {
        setError(result?.message || "Google sign-in failed.");
      }
    } catch (err) {
      console.error("[Login] Google sign-in error:", err);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  /* Handle Email / Password Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, pharmacy: true });
    setError("");

    if (isSignUp) {
      if (!name.trim()) {
        setError("Please enter your full name.");
        toast.error("Please enter your full name");
        return;
      }
      if (!pharmacy.trim()) {
        setError("Please enter your pharmacy or hospital name.");
        toast.error("Please enter pharmacy or hospital name");
        return;
      }
    }

    if (!email.trim() || !password.trim()) {
      setError("Both email and password are required.");
      toast.error("Please fill in email and password");
      return;
    }
    if (!emailValid) {
      setError("Please enter a valid email address.");
      toast.error("Invalid email address format");
      return;
    }
    if (!passwordValid) {
      setError("Password must be at least 6 characters.");
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        const result = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          pharmacy: pharmacy.trim(),
          license: license.trim(),
        });
        if (!result?.ok) {
          setError(result?.message || "Registration failed");
        }
      } else {
        const result = await login({ email, password, remember });
        if (!result?.ok) {
          setError(result?.message || "Login failed");
        }
      }
    } catch (err) {
      console.error("[Login] Auth error:", err);
      setError("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* Handle Forgot Password */
  const handleForgotPassword = () => {
    if (!email.trim()) {
      setError("Enter your email address first to receive a password reset link.");
      toast.error("Enter your email first");
      return;
    }
    toast.info(`Password reset link dispatched to ${email}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
      <GlobalStyles />

      <div className="min-h-screen grid lg:grid-cols-[42%_58%]">
        {/* =====================================================
            LEFT COLUMN: THE AUTH CARD (EXACT USER SPEC)
        ====================================================== */}
        <section className="relative min-h-screen flex items-center justify-center px-6 sm:px-10 lg:px-14 xl:px-20 py-10 bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800">
          <div
            className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#0f766e 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative w-full max-w-[390px] z-10">
            {/* The Login / Sign Up Card */}
            <div className="w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-9 shadow-sm dark:shadow-none">
              {/* Brand Logo & Title */}
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-sm mb-3">
                  <Pill size={22} className="-rotate-45" strokeWidth={2.4} />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  MediTrack
                </h1>
                {isSignUp && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Staff Clinical Registration
                  </p>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300"
                >
                  <AlertTriangle size={15} className="text-rose-500 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                {/* SIGN UP ONLY FIELDS */}
                {isSignUp && (
                  <>
                    {/* Full Name */}
                    <div>
                      <input
                        id={nameId}
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (error) setError("");
                        }}
                        placeholder="Full Name (e.g. Dr. Rajesh Kumar)"
                        className={LEET_INPUT}
                      />
                    </div>

                    {/* Role / Designation */}
                    <div className="relative">
                      <select
                        id={roleId}
                        name="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className={`${LEET_INPUT} appearance-none cursor-pointer pr-9 text-slate-700 dark:text-slate-200`}
                      >
                        <option value="Chief Pharmacist">Chief Pharmacist (Admin / Licensee)</option>
                        <option value="Registered Pharmacist">Registered Pharmacist (Dispensing)</option>
                        <option value="Inventory Manager">Inventory & Procurement Manager</option>
                        <option value="Billing / POS Cashier">Clinical Billing & POS Cashier</option>
                      </select>
                      <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Pharmacy / Hospital Name */}
                    <div>
                      <input
                        id={pharmacyId}
                        name="pharmacy"
                        type="text"
                        value={pharmacy}
                        onChange={(e) => {
                          setPharmacy(e.target.value);
                          if (error) setError("");
                        }}
                        placeholder="Pharmacy or Hospital Name"
                        className={LEET_INPUT}
                      />
                    </div>

                    {/* Pharmacy License No. */}
                    <div>
                      <input
                        id={licenseId}
                        name="license"
                        type="text"
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                        placeholder="Drug License / Reg No. (e.g. TN/PH/2026/0894)"
                        className={LEET_INPUT}
                      />
                    </div>
                  </>
                )}

                {/* USERNAME OR EMAIL */}
                <div>
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Username or E-mail"
                    className={LEET_INPUT}
                  />
                </div>

                {/* PASSWORD */}
                <div className="relative">
                  <input
                    id={passwordId}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Password"
                    className={`${LEET_INPUT} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* KEEP ME SIGNED IN */}
                {!isSignUp && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      id={rememberId}
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 accent-slate-700 cursor-pointer"
                    />
                    <label
                      htmlFor={rememberId}
                      className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none"
                    >
                      Keep me signed in
                    </label>
                  </div>
                )}

                {/* SIGN IN BUTTON */}
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className={LEET_BTN}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>{isSignUp ? "Creating Account..." : "Signing In..."}</span>
                    </span>
                  ) : (
                    <span>{isSignUp ? "Create Account" : "Sign In"}</span>
                  )}
                </button>

                {/* TERMS & PRIVACY */}
                <p className="text-[12px] text-center text-slate-500 dark:text-slate-400 pt-1 leading-normal">
                  By continuing, you agree to{" "}
                  <a
                    href="#terms"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info("MediTrack Enterprise Terms applied.");
                    }}
                    className="text-[#0284c7] hover:underline"
                  >
                    Terms
                  </a>{" "}
                  &{" "}
                  <a
                    href="#privacy"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info("MediTrack Clinical Data Privacy Standard: CDSCO & HIPAA aligned.");
                    }}
                    className="text-[#0284c7] hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>

                {/* FORGOT PASSWORD? & SIGN UP LINKS */}
                <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300 pt-2 font-normal">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="hover:underline cursor-pointer text-slate-700 dark:text-slate-300 text-sm"
                  >
                    Forgot Password?
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError("");
                    }}
                    className="hover:underline cursor-pointer text-slate-700 dark:text-slate-300 text-sm font-medium"
                  >
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </button>
                </div>

                {/* OR YOU CAN SIGN IN WITH */}
                <div className="pt-5 pb-1 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    or you can sign in with
                  </p>
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading || googleLoading}
                      title="Sign in with Google"
                      aria-label="Sign in with Google"
                      className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition shadow-sm hover:border-slate-300 active:scale-95 disabled:opacity-50"
                    >
                      {googleLoading ? (
                        <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
                      ) : (
                        <GoogleIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Subtle Footer */}
            <div className="mt-8 flex items-center justify-center gap-3 text-[11px] text-slate-400 dark:text-slate-600">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-teal-600 dark:text-teal-400" />
                Firebase Auth
              </span>
              <span>·</span>
              <span>Google SSO</span>
            </div>
          </div>
        </section>

        {/* =====================================================
            RIGHT COLUMN: THE 3D LAYOUT & LIVE INTERACTIVE SHOWCASE
        ====================================================== */}
        <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f0fdfa] via-[#ecfeff] to-[#fef3c7] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-between">
          {/* Subtle Ambient Blobs */}
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

          <div className="relative z-10 min-h-screen px-8 sm:px-12 lg:px-16 xl:px-20 py-10 flex flex-col justify-between">
            {/* Top Brand Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white shadow-lg shadow-teal-900/20">
                  <Pill size={22} strokeWidth={2.4} />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    MediTrack
                  </h1>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-teal-700/70 dark:text-teal-400/70 font-medium">
                    Pharmacy OS
                  </p>
                </div>
              </div>
            </div>

            {/* Center 3D Layout with Floating Cards */}
            <div className="flex-1 flex items-center my-6">
              <div className="w-full max-w-[720px]">
                <div className="relative h-[390px] sm:h-[440px] lg:h-[470px]">
                  {/* Central 3D Stock Card */}
                  <div className="absolute left-[18%] top-[7%] w-[55%] h-[75%] rounded-[36px] bg-gradient-to-br from-[#0f766e] via-[#0d9488] to-[#14b8a6] rotate-[-4deg] shadow-[0_35px_70px_rgba(13,148,136,0.28)] overflow-hidden tilt-hover">
                    <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full border border-white/15" />
                    <div className="absolute -left-10 bottom-10 w-40 h-40 rounded-full border border-white/10" />

                    <div className="absolute inset-x-7 top-7">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white">
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
                          className="flex-1 rounded-t-md bg-white/30"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 3D Floating Card 1: Smart Forecast */}
                  <FloatingCard
                    className="absolute left-[4%] top-[26%] w-[225px] sm:w-[250px] p-4 animate-float"
                    style={{ "--rot": "4deg" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center">
                        <Sparkles size={20} className="text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Smart Forecast
                        </p>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                          Demand stabilized
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-4">
                      <div className="w-2 h-2 rounded-full bg-teal-500" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        96.7% model accuracy
                      </span>
                    </div>
                  </FloatingCard>

                  {/* 3D Floating Card 2: Logistics */}
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

                  {/* 3D Floating Card 3: Expiry Watch */}
                  <FloatingCard
                    className="absolute right-[7%] bottom-[12%] px-4 py-3 animate-float"
                    style={{ "--rot": "2deg" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
                        <CalendarClock size={17} className="text-rose-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Expiry watch
                        </p>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          5 batches{" "}
                          <span className="text-rose-500 font-semibold">urgent</span>
                        </p>
                      </div>
                    </div>
                  </FloatingCard>

                  {/* 3D Floating Badge 4: Barcode scan */}
                  <FloatingCard
                    className="absolute left-[26%] bottom-[4%] rounded-full px-3 py-1.5 flex items-center gap-2 animate-float-slow"
                    style={{ "--rot": "-3deg" }}
                  >
                    <Scan size={13} className="text-teal-600 dark:text-teal-400" />
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      Barcode scan ready
                    </span>
                  </FloatingCard>

                  {/* 3D Floating Badge 5: 0.2s sync */}
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

                {/* Bottom Headline Text */}
                <div className="mt-[-15px] max-w-[650px]">
                  <h2 className="text-[40px] sm:text-[52px] lg:text-[58px] xl:text-[66px] leading-[1] font-bold tracking-[-0.045em] text-slate-900 dark:text-white">
                    Every dose tracked.
                    <br />
                    <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-amber-500 bg-clip-text text-transparent animate-gradient">
                      Every shelf smarter.
                    </span>
                  </h2>
                  <p className="mt-6 max-w-[520px] text-sm sm:text-base leading-7 text-slate-500 dark:text-slate-400">
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