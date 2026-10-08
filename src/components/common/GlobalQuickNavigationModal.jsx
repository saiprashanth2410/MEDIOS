import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Command,
  Receipt,
  LayoutDashboard,
  Pill,
  FileText,
  Calendar,
  Bell,
  Settings,
  Clock,
  Keyboard,
  X,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function openQuickNavigation() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("meditrack_toggle_quick_nav"));
  }
}

export default function GlobalQuickNavigationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPosDetails, setShowPosDetails] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  /* =====================================================
     GLOBAL KEYBOARD LISTENER (ANY SCREEN)
  ===================================================== */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is actively typing in a form input
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(activeEl.tagName) ||
          activeEl.isContentEditable);

      // 1. Modal Toggle with "?" (Shift + /) when not typing
      if (e.key === "?" && !isTyping) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // 2. Close Modal with Escape
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      // 3. Global Alt / Option Navigation Keys
      // On macOS, Alt+key produces special characters (e.g. Alt+B -> ∫),
      // so checking e.code ('KeyB', etc.) ensures 100% reliable detection on Mac & Windows.
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const code = e.code;
        const key = e.key.toLowerCase();

        const navigateTo = (path, name, shortcut) => {
          e.preventDefault();
          setIsOpen(false);
          navigate(path);
          toast.info(`Navigated to ${name} (${shortcut})`, { duration: 1600 });
        };

        if (code === "KeyB" || key === "b") {
          navigateTo("/billing", "Retail POS Billing", "Alt + B");
          return;
        }
        if (code === "KeyD" || key === "d") {
          navigateTo("/dashboard", "Dashboard Overview", "Alt + D");
          return;
        }
        if (code === "KeyM" || key === "m") {
          navigateTo("/medicines", "Medicines Inventory", "Alt + M");
          return;
        }
        if (code === "KeyP" || key === "p") {
          navigateTo("/prescriptions", "Prescriptions", "Alt + P");
          return;
        }
        if (code === "KeyE" || key === "e") {
          navigateTo("/expiry", "Expiry Management", "Alt + E");
          return;
        }
        if (code === "KeyN" || key === "n") {
          navigateTo("/notifications", "Notifications & Alerts", "Alt + N");
          return;
        }
        if (code === "KeyS" || key === "s") {
          navigateTo("/settings", "Settings & Profile", "Alt + S");
          return;
        }
        if (code === "KeyZ" || key === "z") {
          navigateTo("/billing?tab=day_close", "Day-End Register", "Alt + Z");
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, navigate]);

  /* =====================================================
     CUSTOM EVENT LISTENER
  ===================================================== */
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener("meditrack_toggle_quick_nav", handleToggle);
    return () => window.removeEventListener("meditrack_toggle_quick_nav", handleToggle);
  }, []);

  const navItems = [
    {
      key: "Alt + B",
      label: "Retail POS Billing",
      path: "/billing",
      icon: Receipt,
      desc: "Fast dispensing, barcode scanning & patient invoices",
      color: "from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-400",
    },
    {
      key: "Alt + D",
      label: "Dashboard Overview",
      path: "/dashboard",
      icon: LayoutDashboard,
      desc: "Live revenue, analytics highlights & inventory metrics",
      color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    },
    {
      key: "Alt + M",
      label: "Medicines Inventory",
      path: "/medicines",
      icon: Pill,
      desc: "Stock catalog, batch management & low-stock alerts",
      color: "from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-400",
    },
    {
      key: "Alt + P",
      label: "Prescriptions",
      path: "/prescriptions",
      icon: FileText,
      desc: "Doctor prescriptions queue & AI-assisted verification",
      color: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-400",
    },
    {
      key: "Alt + E",
      label: "Expiry Management",
      path: "/expiry",
      icon: Calendar,
      desc: "Early 30-day alerts, batch disposal & quarantine logs",
      color: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400",
    },
    {
      key: "Alt + N",
      label: "Notifications & Alerts",
      path: "/notifications",
      icon: Bell,
      desc: "System alerts, safety recalls & low inventory notices",
      color: "from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400",
    },
    {
      key: "Alt + S",
      label: "Settings & Profile",
      path: "/settings",
      icon: Settings,
      desc: "Pharmacy licensing, UPI VPA & security preferences",
      color: "from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-300",
    },
    {
      key: "Alt + Z",
      label: "Day-End Register",
      path: "/billing?tab=day_close",
      icon: Clock,
      desc: "Cash drawer closeout, Z-Report archive & reconciliation",
      color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400",
    },
    {
      key: "?",
      label: "POS Cheat-Sheet",
      action: () => setShowPosDetails((p) => !p),
      icon: Keyboard,
      desc: "High-speed retail keyboard shortcut cheatsheet",
      color: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
      isAction: true,
    },
  ];

  const posShortcuts = [
    { key: "/ or F1", label: "Focus Medicine Search Bar", desc: "Instant focus to start barcode or name typing" },
    { key: "↑ / ↓", label: "Navigate Search Results", desc: "Move selection up/down through dropdown" },
    { key: "Enter", label: "Add Selected Item to Cart", desc: "Instantly adds selected item with default qty" },
    { key: "F2 or Ctrl+Enter", label: "Dispense & Generate Bill", desc: "Locks cart and initiates bill checkout" },
    { key: "Esc", label: "Clear Search / Close Modals", desc: "Clears query or closes open modals" },
    { key: "?", label: "Toggle Quick Nav Cheat-Sheet", desc: "Show/hide this quick navigation overview" },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-xs shrink-0">
              <Command size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-sky-400">
                  Global Pharmacy Quick Navigation
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  Any screen
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Press any hotkey combination or click a module to jump immediately
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* 3x3 Quick Navigation Grid */}
        <div className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path &&
                (location.pathname === item.path ||
                  (item.path.includes("?") &&
                    location.pathname + location.search === item.path));

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.path) {
                      setIsOpen(false);
                      navigate(item.path);
                    }
                  }}
                  className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all text-left group cursor-pointer ${
                    isActive
                      ? "bg-sky-500/15 border-sky-500/60 ring-1 ring-sky-500/40"
                      : "bg-slate-800/70 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-700/80 ${
                          isActive ? "text-sky-300" : "text-slate-300 group-hover:text-sky-300"
                        }`}
                      >
                        <Icon size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                        {item.label}
                      </span>
                    </div>

                    <kbd className="px-2 py-0.5 font-mono text-[10px] font-bold bg-slate-900 text-sky-300 border border-slate-700 rounded-md shadow-2xs shrink-0">
                      {item.key}
                    </kbd>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* POS Speed Billing Cheat-Sheet (Toggleable or always handy) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setShowPosDetails((p) => !p)}
            >
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  Retail POS Speed Billing Shortcuts (Mouse-Free Checkout)
                </span>
              </div>
              <span className="text-[11px] text-sky-400 hover:underline flex items-center gap-1">
                {showPosDetails ? "Hide Cheat-Sheet" : "Show Full Cheat-Sheet"}
                <ArrowRight size={12} className={showPosDetails ? "rotate-90 transition-transform" : "transition-transform"} />
              </span>
            </div>

            {showPosDetails && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {posShortcuts.map((ps) => (
                  <div
                    key={ps.label}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-200">{ps.label}</p>
                      <p className="text-[10px] text-slate-400">{ps.desc}</p>
                    </div>
                    <kbd className="px-2 py-1 font-mono text-[10px] font-bold bg-slate-950 text-teal-300 rounded border border-slate-800 shrink-0">
                      {ps.key}
                    </kbd>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Sparkles size={13} className="text-sky-400" />
            <span>
              Tip: Press <kbd className="px-1 py-0.5 font-mono text-[10px] bg-slate-800 rounded text-slate-200">?</kbd> anywhere to open this screen or use <kbd className="px-1 py-0.5 font-mono text-[10px] bg-slate-800 rounded text-slate-200">Alt</kbd> keys directly!
            </span>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

