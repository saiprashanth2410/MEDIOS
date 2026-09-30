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
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/dashboard/Navbar";

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
    label: "Security",
    icon: Lock,
    header: "Security",
    description: "Keep your account safe",
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

  const initialCategory = searchParams.get("category") || "account";
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");

  // Toggle states (persisted)
  const [toggles, setToggles] = useState(() => ({
    "meditrack-push": localStorage.getItem("meditrack-push") === "true",
    "meditrack-expiry": localStorage.getItem("meditrack-expiry") === "true",
    "meditrack-lowstock": localStorage.getItem("meditrack-lowstock") === "true",
  }));

  const trimmedQuery = searchQuery.trim().toLowerCase();

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
    <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar onScanClick={() => {}} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden h-fit shadow-sm">
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
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden h-fit shadow-sm"
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