import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  User,
  Lock,
  Bell,
  Palette,
  AlertTriangle,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Package,
  X,
  Check,
  Keyboard,
  Command,
  Sparkles,
  Zap,
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  QrCode,
  CreditCard,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/dashboard/Navbar";
import QRCodeSVG from "../components/common/QRCodeSVG";
import ActiveSessionsCard from "../components/settings/ActiveSessionsCard";

/* =====================================================
   CATEGORIES
===================================================== */

const CATEGORIES = [
  {
    id: "account",
    label: "Account",
    icon: User,
    header: "Account",
    description: "Manage your personal information",
    items: [
      {
        id: "view-profile",
        icon: User,
        label: "View Profile",
        desc: "See your profile details",
        type: "link",
        action: "/profile",
      },
      {
        id: "edit-profile",
        icon: User,
        label: "Edit Profile",
        desc: "Update name, email, phone",
        type: "link",
        action: "/profile",
      },
    ],
  },
  {
    id: "security",
    label: "Security & Sessions",
    icon: Lock,
    header: "Security & Active Sessions",
    description: "Manage account password, authenticated devices, and active sessions",
    items: [
      {
        id: "change-password",
        icon: Lock,
        label: "Change Password",
        desc: "Update your account password",
        type: "link",
        action: "/profile",
        tab: "security",
      },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    header: "Notifications",
    description: "Choose what alerts you want to receive",
    items: [
      {
        id: "push-notifications",
        icon: Bell,
        label: "Push Notifications",
        desc: "Mobile & desktop alerts",
        type: "toggle",
        storageKey: "meditrack-push",
      },
      {
        id: "expiry-alerts",
        icon: AlertTriangle,
        label: "Expiry Alerts",
        desc: "Notify when medicines are near expiry",
        type: "toggle",
        storageKey: "meditrack-expiry",
      },
      {
        id: "low-stock-alerts",
        icon: Package,
        label: "Low Stock Alerts",
        desc: "Notify when stock falls below threshold",
        type: "toggle",
        storageKey: "meditrack-lowstock",
      },
    ],
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    header: "Appearance & Theme",
    description: "Customize how MediTrack looks on your screen",
    items: [
      {
        id: "theme-light",
        icon: Sun,
        label: "Light Mode",
        desc: "Bright, clean appearance for daytime usage",
        type: "theme",
        themeValue: "light",
      },
      {
        id: "theme-dark",
        icon: Moon,
        label: "Dark Mode",
        desc: "Deep slate theme designed to reduce eye strain in low light",
        type: "theme",
        themeValue: "dark",
      },
      {
        id: "theme-system",
        icon: Monitor,
        label: "System Default",
        desc: "Automatically adapts to your device operating system theme",
        type: "theme",
        themeValue: "system",
      },
    ],
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    icon: Keyboard,
    header: "Keyboard Shortcuts & POS Fast Controls",
    description: "Speed up counter billing with fast cashier hotkeys and navigation shortcuts",
    items: [
      {
        id: "enable-pos-shortcuts",
        icon: Keyboard,
        label: "Enable POS Keyboard Shortcuts",
        desc: "Allow / for instant search, ↑↓ arrows, Enter to add, F2 to dispense, and Esc to clear",
        type: "toggle",
        storageKey: "meditrack-shortcuts-enabled",
      },
      {
        id: "f2-instant-dispense",
        icon: Zap,
        label: "F2 Instant Invoice Dispense",
        desc: "Pressing F2 anywhere on the billing counter automatically completes invoice generation",
        type: "toggle",
        storageKey: "meditrack-f2-dispense",
      },
    ],
  },
  {
    id: "payments",
    label: "Payments & UPI",
    icon: QrCode,
    header: "UPI QR & Payment Settings",
    description: "Configure pharmacy UPI VPA ID and payment settings for counter checkout",
    items: [
      {
        id: "enable-upi-qr",
        icon: QrCode,
        label: "Dynamic POS QR Code",
        desc: "Auto-encode pharmacy VPA and exact payable bill amount into instant scannable QR on POS",
        type: "toggle",
        storageKey: "meditrack-upi-qr-enabled",
      },
    ],
  },
];

/* =====================================================
   HIGHLIGHT COMPONENT
===================================================== */

function HighlightText({ text = "", query = "" }) {
  if (!query || !text) return <>{text}</>;

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#0284c7]/20 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* =====================================================
   TOGGLE SWITCH
===================================================== */

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7]/40 ${
        checked ? "bg-[#0284c7]" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/* =====================================================
   MAIN SETTINGS PAGE
===================================================== */

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, actualTheme, setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCategory =
    searchParams.get("category") || searchParams.get("tab") || "account";
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [testedKey, setTestedKey] = useState(null);

  // UPI ID configuration state
  const [upiIdInput, setUpiIdInput] = useState(() => {
    return (
      (typeof window !== "undefined" ? localStorage.getItem("meditrack_upi_id") : "") ||
      user?.upiId ||
      "meditrack@upi"
    );
  });
  const [savedUpiId, setSavedUpiId] = useState(() => {
    return (
      (typeof window !== "undefined" ? localStorage.getItem("meditrack_upi_id") : "") ||
      user?.upiId ||
      "meditrack@upi"
    );
  });

  // Toggle states (persisted)
  const [toggles, setToggles] = useState(() => ({
    "meditrack-push": localStorage.getItem("meditrack-push") === "true",
    "meditrack-expiry": localStorage.getItem("meditrack-expiry") === "true",
    "meditrack-lowstock": localStorage.getItem("meditrack-lowstock") === "true",
    "meditrack-shortcuts-enabled":
      localStorage.getItem("meditrack-shortcuts-enabled") !== "false",
    "meditrack-f2-dispense":
      localStorage.getItem("meditrack-f2-dispense") !== "false",
    "meditrack-upi-qr-enabled":
      localStorage.getItem("meditrack-upi-qr-enabled") !== "false",
  }));

  const handleSaveUpiId = (e) => {
    if (e) e.preventDefault();
    const cleanId = upiIdInput.trim();
    if (!cleanId) {
      toast.error("Please enter a valid UPI ID (e.g. pharmacy@upi)");
      return;
    }
    if (!cleanId.includes("@")) {
      toast.error("Invalid UPI format. Must contain '@' (e.g. storename@okaxis)");
      return;
    }
    localStorage.setItem("meditrack_upi_id", cleanId);
    setSavedUpiId(cleanId);
    toast.success("UPI ID saved! Dynamic QR code is active on POS billing counter.");
    window.dispatchEvent(new Event("meditrack_pharmacy_updated"));
    window.dispatchEvent(new Event("storage"));
  };

  const trimmedQuery = searchQuery.trim().toLowerCase();

  // Listen to keyboard testing in shortcuts tab
  useEffect(() => {
    if (activeCategory !== "shortcuts") return;
    const handleTestKey = (e) => {
      setTestedKey(e.key === " " ? "Space" : e.key);
    };
    window.addEventListener("keydown", handleTestKey);
    return () => window.removeEventListener("keydown", handleTestKey);
  }, [activeCategory]);

  /* =====================================================
     SYNC CATEGORY TO URL
  ===================================================== */

  useEffect(() => {
    setSearchParams({ category: activeCategory }, { replace: true });
  }, [activeCategory, setSearchParams]);

  /* =====================================================
     FILTERED CATEGORIES
  ===================================================== */

  const filteredCategories = useMemo(() => {
    if (!trimmedQuery) return CATEGORIES;

    return CATEGORIES.filter(
      (cat) =>
        cat.label.toLowerCase().includes(trimmedQuery) ||
        cat.items.some(
          (item) =>
            item.label.toLowerCase().includes(trimmedQuery) ||
            item.desc?.toLowerCase().includes(trimmedQuery)
        )
    );
  }, [trimmedQuery]);

  const currentCategory = useMemo(() => {
    const found = filteredCategories.find((c) => c.id === activeCategory);
    return found || filteredCategories[0] || null;
  }, [filteredCategories, activeCategory]);

  /* =====================================================
     HANDLERS
  ===================================================== */

  const handleToggle = useCallback((item) => {
    const current = localStorage.getItem(item.storageKey) === "true";
    const nextVal = !current;
    localStorage.setItem(item.storageKey, String(nextVal));
    setToggles((prev) => ({ ...prev, [item.storageKey]: nextVal }));
    toast.success(
      `${item.label} ${nextVal ? "enabled" : "disabled"}`,
      { id: `setting-${item.storageKey}` }
    );
  }, []);

  const handleItemClick = useCallback(
    (item) => {
      if (item.type === "toggle") {
        handleToggle(item);
        return;
      }
      if (item.type === "coming-soon") {
        toast.info(`${item.label} — coming soon`);
        return;
      }
      if (item.type === "theme") {
        setTheme(item.themeValue);
        toast.success(`Theme set to ${item.label}`);
        return;
      }
      if (item.type === "link" && item.action?.startsWith("/")) {
        navigate(
          item.action,
          item.tab ? { state: { tab: item.tab } } : undefined
        );
        return;
      }
      toast.info(`${item.label} — coming soon`);
    },
    [navigate, handleToggle, setTheme]
  );

  const clearSearch = useCallback(() => setSearchQuery(""), []);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar onScanClick={() => {}} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden h-fit shadow-2xs">
            {/* User header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full bg-[#0284c7] flex items-center justify-center text-white font-semibold text-base shrink-0"
                  aria-hidden="true"
                >
                  {(user?.name || "P").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {user?.name || "Pharmacist"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user?.email || "user@example.com"}
                  </p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  aria-label="Search settings"
                  className="w-full h-9 pl-9 pr-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#0284c7]/30 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition"
                  >
                    <X size={12} className="text-slate-500 dark:text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Categories */}
            <nav className="p-2" aria-label="Settings categories">
              {filteredCategories.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  No settings match "{searchQuery}"
                </p>
              ) : (
                filteredCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = currentCategory?.id === cat.id;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7]/40 ${
                        isActive
                          ? "bg-[#0284c7] text-white shadow-sm"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <Icon
                        size={16}
                        className={`shrink-0 ${
                          isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-white" : "text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        <HighlightText text={cat.label} query={trimmedQuery} />
                      </span>
                    </button>
                  );
                })
              )}
            </nav>

            <div className="h-3" />
          </aside>

          {/* RIGHT PANEL */}
          <main
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden h-fit shadow-2xs"
            aria-live="polite"
          >
            {currentCategory ? (
              <>
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {currentCategory.header}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentCategory.description}
                  </p>
                </div>

                {/* THEME VISUAL SELECTOR (Only in Appearance tab) */}
                {currentCategory.id === "appearance" && (
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                      Theme Mode Selection
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          id: "light",
                          label: "Light Mode",
                          desc: "Bright & crisp",
                          icon: Sun,
                          previewBg: "bg-white border-slate-200",
                          previewHeader: "bg-[#0284c7]",
                        },
                        {
                          id: "dark",
                          label: "Dark Mode",
                          desc: "Reduced eye strain",
                          icon: Moon,
                          previewBg: "bg-slate-900 border-slate-700",
                          previewHeader: "bg-slate-800",
                        },
                        {
                          id: "system",
                          label: "System Default",
                          desc: "Syncs with device",
                          icon: Monitor,
                          previewBg: "bg-gradient-to-r from-white to-slate-900 border-slate-300 dark:border-slate-700",
                          previewHeader: "bg-gradient-to-r from-[#0284c7] to-slate-800",
                        },
                      ].map((t) => {
                        const isSelected = theme === t.id;
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setTheme(t.id);
                              toast.success(`Theme changed to ${t.label}`);
                            }}
                            className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all relative ${
                              isSelected
                                ? "border-[#0284c7] bg-white dark:bg-slate-900 ring-2 ring-[#0284c7]/20 shadow-sm"
                                : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#0284c7] text-white flex items-center justify-center shadow-sm">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            )}
                            {/* Visual Mini Mockup */}
                            <div
                              className={`w-full h-14 rounded-lg border ${t.previewBg} overflow-hidden mb-3 p-1.5 flex flex-col gap-1 shadow-inner`}
                            >
                              <div className={`w-full h-2 rounded ${t.previewHeader}`} />
                              <div className="flex gap-1 flex-1">
                                <div className="w-1/3 h-full rounded bg-slate-200 dark:bg-slate-700/60" />
                                <div className="flex-1 h-full rounded bg-slate-100 dark:bg-slate-800 flex flex-col gap-1 p-1">
                                  <div className="w-3/4 h-1.5 rounded bg-slate-300 dark:bg-slate-700" />
                                  <div className="w-1/2 h-1.5 rounded bg-slate-200 dark:bg-slate-700/50" />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-1">
                              <Icon
                                size={15}
                                className={isSelected ? "text-[#0284c7]" : "text-slate-500 dark:text-slate-400"}
                              />
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {t.label}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {t.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                      <span>
                        Active appearance: <strong className="text-slate-700 dark:text-slate-200 capitalize">{actualTheme}</strong> mode
                        {theme === "system" && " (detected from system)"}
                      </span>
                    </div>
                  </div>
                )}

                {/* SECURITY & ACTIVE SESSIONS PANEL (Only in Security tab) */}
                {currentCategory.id === "security" && (
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                    <ActiveSessionsCard />
                  </div>
                )}

                {/* KEYBOARD SHORTCUTS PANEL (Only in Shortcuts tab) */}
                {currentCategory.id === "shortcuts" && (
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-6">
                    {/* Live Keypress Tester */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                          <Keyboard size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            Interactive Key Tester
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Press any key on your keyboard to test its recognition
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Detected Key:</span>
                        <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-lg border border-teal-200 dark:border-teal-800 shadow-xs">
                          {testedKey || "Press any key"}
                        </kbd>
                      </div>
                    </div>

                    {/* Section 1: POS Billing Shortcuts */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Zap size={13} className="text-teal-600" />
                          <span>Point of Sale (POS) Fast Billing Controls</span>
                        </h3>
                        <span className="text-[10px] text-slate-400">Active on /billing</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          {
                            key: "/",
                            title: "Focus Medicine Search",
                            desc: "Instantly jump cursor into the medicine catalog search box",
                            badge: "Search",
                          },
                          {
                            key: "↓ / ↑",
                            title: "Navigate Results",
                            desc: "Arrow keys move selection up and down without touching mouse",
                            badge: "Navigate",
                          },
                          {
                            key: "Enter",
                            title: "Add to Cart",
                            desc: "Adds highlighted medicine with available batch directly into cart",
                            badge: "Dispense",
                          },
                          {
                            key: "F2",
                            title: "Dispense & Invoice",
                            desc: "Immediate checkout, deducting inventory and finalizing receipt",
                            badge: "Checkout",
                          },
                          {
                            key: "Esc",
                            title: "Clear Search / Close Modals",
                            desc: "Wipes search box or closes any open invoice/details popup",
                            badge: "Dismiss",
                          },
                          {
                            key: "Ctrl + P / ⌘ + P",
                            title: "Print Thermal Receipt",
                            desc: "Triggers instant thermal 80mm GST receipt slip printer dialog",
                            badge: "Print",
                          },
                        ].map((s) => (
                          <div
                            key={s.key}
                            className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-teal-400 transition"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span>{s.title}</span>
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  {s.badge}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                {s.desc}
                              </p>
                            </div>
                            <kbd className="px-2 py-1 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-300 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs shrink-0">
                              {s.key}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Global Navigation Hotkeys */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Command size={13} className="text-[#0284c7]" />
                          <span>Global Pharmacy Quick Navigation</span>
                        </h3>
                        <span className="text-[10px] text-slate-400">Any screen</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                          { key: "Alt + B", label: "Retail POS Billing" },
                          { key: "Alt + D", label: "Dashboard Overview" },
                          { key: "Alt + M", label: "Medicines Inventory" },
                          { key: "Alt + P", label: "Prescriptions" },
                          { key: "Alt + E", label: "Expiry Management" },
                          { key: "Alt + N", label: "Notifications & Alerts" },
                          { key: "Alt + S", label: "Settings & Profile" },
                          { key: "Alt + Z", label: "Day-End Register" },
                          { key: "?", label: "POS Cheat-Sheet" },
                        ].map((nav) => (
                          <div
                            key={nav.key}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                          >
                            <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                              {nav.label}
                            </span>
                            <kbd className="px-1.5 py-0.5 font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                              {nav.key}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PAYMENTS & UPI CONFIGURATION PANEL (Only in Payments tab) */}
                {currentCategory.id === "payments" && (
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-6">
                    {/* Setup Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                            <QrCode size={20} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              Pharmacy UPI Virtual Payment Address (VPA)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              This UPI ID is encoded into dynamic checkout QR codes on the Retail POS billing counter
                            </p>
                          </div>
                        </div>

                        {savedUpiId && (
                          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                            <CheckCircle2 size={13} className="text-emerald-500" />
                            <span>Active</span>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleSaveUpiId} className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            UPI ID / VPA Address
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={upiIdInput}
                              onChange={(e) => setUpiIdInput(e.target.value)}
                              placeholder="e.g. pharmacyname@okaxis or 9876543210@upi"
                              className="flex-1 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                            />
                            <button
                              type="submit"
                              className="h-10 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs shrink-0"
                            >
                              <Check size={14} />
                              <span>Save UPI ID</span>
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                            Supported: Google Pay (@okaxis, @okhdfcbank, @oksbi, @okicici), PhonePe (@ybl, @ibl, @axl), Paytm (@paytm), BHIM (@upi)
                          </p>
                        </div>
                      </form>

                      {/* Current Active UPI Banner */}
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Currently Active:</span>
                          <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800">
                            {savedUpiId || "None"}
                          </span>
                        </div>
                        {savedUpiId && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(savedUpiId);
                              toast.success("UPI ID copied to clipboard!");
                            }}
                            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition"
                          >
                            <Copy size={12} />
                            <span>Copy UPI ID</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Live Scanner Preview Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-teal-600 dark:text-teal-400" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            POS Counter Live QR Preview
                          </h3>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          Sample ₹100 Bill
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        {/* Dynamic QR preview image */}
                        <div className="flex flex-col items-center p-3 rounded-2xl border-2 border-teal-400 bg-white shadow-sm shrink-0">
                          <QRCodeSVG
                            value={`upi://pay?pa=${savedUpiId}&pn=MediTrack%20Pharmacy&am=100&cu=INR&tn=Sample%20Bill%20Payment`}
                            size={150}
                            title="Sample Test UPI QR"
                          />
                          <p className="text-[11px] font-bold text-teal-700 mt-2">₹100.00</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5 max-w-[140px] truncate text-center">
                            {savedUpiId}
                          </p>
                        </div>

                        {/* Explanatory points */}
                        <div className="space-y-3 flex-1 text-xs">
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              How it works at POS checkout:
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed text-[11px]">
                              When the cashier selects <strong>UPI / QR</strong> during checkout, the screen automatically generates and displays the scannable QR with the customer's exact bill total. The cashier never has to type or configure anything during busy counter hours.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-[11px] font-bold">
                              <span>📱</span> Google Pay
                            </div>
                            <div className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 text-[11px] font-bold">
                              <span>📱</span> PhonePe
                            </div>
                            <div className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400 text-[11px] font-bold">
                              <span>📱</span> Paytm
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            💡 You can test-scan this sample QR code with Google Pay, PhonePe, or Paytm right now to verify that funds will be directed to your pharmacy's registered bank account.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentCategory.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isToggleOn =
                      item.type === "toggle" && toggles[item.storageKey];
                    const isComingSoon = item.type === "coming-soon";
                    const isThemeItem = item.type === "theme";
                    const isCurrentTheme = isThemeItem && theme === item.themeValue;

                    if (item.type === "toggle") {
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggle(item)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleToggle(item);
                            }
                          }}
                          className="w-full flex items-center gap-4 px-6 py-4 transition text-left group hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer select-none"
                        >
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-[#0284c7]/10 dark:group-hover:bg-[#0284c7]/20 transition">
                            <ItemIcon
                              size={16}
                              className="text-slate-600 dark:text-slate-300 group-hover:text-[#0284c7] dark:group-hover:text-sky-400 transition"
                              aria-hidden="true"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              <HighlightText
                                text={item.label}
                                query={trimmedQuery}
                              />
                            </p>
                            {item.desc && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                <HighlightText
                                  text={item.desc}
                                  query={trimmedQuery}
                                />
                              </p>
                            )}
                          </div>
                          <ToggleSwitch
                            checked={isToggleOn}
                            onChange={() => handleToggle(item)}
                          />
                        </div>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        disabled={isComingSoon}
                        className={`w-full flex items-center gap-4 px-6 py-4 transition text-left group focus-visible:outline-none ${
                          isComingSoon
                            ? "opacity-50 cursor-not-allowed"
                            : isCurrentTheme
                            ? "bg-[#0284c7]/[0.05] dark:bg-sky-950/20 hover:bg-[#0284c7]/10 dark:hover:bg-sky-950/30"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/40"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-[#0284c7]/10 dark:group-hover:bg-[#0284c7]/20 transition">
                          <ItemIcon
                            size={16}
                            className={`transition ${
                              isCurrentTheme
                                ? "text-[#0284c7] dark:text-sky-400"
                                : "text-slate-600 dark:text-slate-300 group-hover:text-[#0284c7] dark:group-hover:text-sky-400"
                            }`}
                            aria-hidden="true"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            <HighlightText
                              text={item.label}
                              query={trimmedQuery}
                            />
                          </p>
                          {item.desc && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              <HighlightText
                                text={item.desc}
                                query={trimmedQuery}
                              />
                            </p>
                          )}
                        </div>

                        {isComingSoon ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                            Soon
                          </span>
                        ) : isThemeItem ? (
                          isCurrentTheme ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#0284c7]/10 dark:bg-sky-500/20 text-[#0284c7] dark:text-sky-300 shrink-0">
                              <Check size={12} strokeWidth={2.5} /> Active
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0 group-hover:text-[#0284c7] dark:group-hover:text-sky-400 transition">
                              Select
                            </span>
                          )
                        ) : (
                          <ChevronRight
                            size={16}
                            className="text-slate-300 dark:text-slate-600 group-hover:text-[#0284c7] dark:group-hover:text-sky-400 transition shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="h-3" />
              </>
            ) : (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No matching settings found.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}