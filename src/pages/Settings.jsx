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
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Package,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
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
    header: "Appearance",
    description: "Customize how MediTrack looks",
    items: [
      {
        id: "theme-light",
        icon: Sun,
        label: "Light Mode",
        desc: "Bright theme",
        type: "theme",
        themeValue: "light",
      },
      {
        id: "theme-dark",
        icon: Moon,
        label: "Dark Mode",
        desc: "Coming soon",
        type: "coming-soon",
      },
      {
        id: "theme-system",
        icon: Monitor,
        label: "System Default",
        desc: "Coming soon",
        type: "coming-soon",
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
        checked ? "bg-[#0284c7]" : "bg-slate-300"
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
    setToggles((prev) => {
      const next = { ...prev, [item.storageKey]: !prev[item.storageKey] };
      localStorage.setItem(item.storageKey, String(next[item.storageKey]));
      toast.success(
        `${item.label} ${next[item.storageKey] ? "enabled" : "disabled"}`
      );
      return next;
    });
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
        toast.success(`${item.label} is already active`);
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
    [navigate, handleToggle]
  );

  const clearSearch = useCallback(() => setSearchQuery(""), []);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#f0f9ff] text-slate-900">
      <Navbar onScanClick={() => {}} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-fit shadow-sm">
            {/* User header */}
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full bg-[#0284c7] flex items-center justify-center text-white font-semibold text-base shrink-0"
                  aria-hidden="true"
                >
                  {(user?.name || "P").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {user?.name || "Pharmacist"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {user?.email || "user@example.com"}
                  </p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-3 border-b border-slate-100">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  aria-label="Search settings"
                  className="w-full h-9 pl-9 pr-8 rounded-lg bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-[#0284c7]/30 placeholder:text-slate-400 transition"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-slate-200 flex items-center justify-center transition"
                  >
                    <X size={12} className="text-slate-500" />
                  </button>
                )}
              </div>
            </div>

            {/* Categories */}
            <nav className="p-2" aria-label="Settings categories">
              {filteredCategories.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-400">
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
                          : "hover:bg-slate-100"
                      }`}
                    >
                      <Icon
                        size={16}
                        className={`shrink-0 ${
                          isActive ? "text-white" : "text-slate-500"
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-white" : "text-slate-700"
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
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-fit shadow-sm"
            aria-live="polite"
          >
            {currentCategory ? (
              <>
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800">
                    {currentCategory.header}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {currentCategory.description}
                  </p>
                </div>

                {/* Items */}
                <div className="divide-y divide-slate-100">
                  {currentCategory.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isToggleOn =
                      item.type === "toggle" && toggles[item.storageKey];
                    const isComingSoon = item.type === "coming-soon";

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        disabled={isComingSoon}
                        className={`w-full flex items-center gap-4 px-6 py-4 transition text-left group focus-visible:outline-none ${
                          isComingSoon
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-slate-50 focus-visible:bg-slate-50"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-[#0284c7]/10 transition">
                          <ItemIcon
                            size={16}
                            className="text-slate-600 group-hover:text-[#0284c7] transition"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            <HighlightText
                              text={item.label}
                              query={trimmedQuery}
                            />
                          </p>
                          {item.desc && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              <HighlightText
                                text={item.desc}
                                query={trimmedQuery}
                              />
                            </p>
                          )}
                        </div>

                        {/* Right side control */}
                        {item.type === "toggle" ? (
                          <ToggleSwitch
                            checked={isToggleOn}
                            onChange={() => handleToggle(item)}
                          />
                        ) : isComingSoon ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-slate-100 text-slate-500 shrink-0">
                            Soon
                          </span>
                        ) : (
                          <ChevronRight
                            size={16}
                            className="text-slate-300 group-hover:text-[#0284c7] transition shrink-0"
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
                <p className="text-sm text-slate-500">
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