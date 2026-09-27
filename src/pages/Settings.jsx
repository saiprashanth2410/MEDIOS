import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  X,
  Search,
  User,
  Lock,
  Bell,
  Palette,
  Users,
  BarChart3,
  FileText,
  HelpCircle,
  LogOut,
  ChevronRight,
  Package,
  AlertTriangle,
  Database,
  Navigation,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

/* =====================================================
   SETTINGS DATA — MediTrack Specific
===================================================== */

const SETTINGS_SECTIONS = [
  {
    id: "quick",
    items: [
      {
        id: "account",
        icon: User,
        label: "Account",
        subtitle: "Personal information",
        path: "/profile",
        tab: "profile",
      },
      {
        id: "security",
        icon: Lock,
        label: "Security",
        subtitle: "Password & sessions",
        path: "/profile",
        tab: "security",
      },
      {
        id: "notifications",
        icon: Bell,
        label: "Notifications",
        subtitle: "Alerts & reminders",
        path: "/profile",
        tab: "preferences",
      },
      {
        id: "appearance",
        icon: Palette,
        label: "Appearance",
        subtitle: "Theme & display",
        path: "/profile",
        tab: "preferences",
      },
    ],
  },
  {
    id: "pharmacy",
    items: [
      {
        id: "prescriptions",
        icon: FileText,
        label: "Prescriptions",
        subtitle: "Manage prescriptions",
        path: "/prescriptions",
      },
      {
        id: "medicines",
        icon: Package,
        label: "Medicines",
        subtitle: "Inventory management",
        path: "/medicines",
      },
      {
        id: "expiry",
        icon: AlertTriangle,
        label: "Expiry Alerts",
        subtitle: "Near-expiry items",
        path: "/expiry",
      },
      {
        id: "pharmacists",
        icon: Users,
        label: "Team",
        subtitle: "Manage pharmacists",
        path: "/pharmacists",
      },
    ],
  },
  {
    id: "data",
    items: [
      {
        id: "reports",
        icon: BarChart3,
        label: "Reports",
        subtitle: "Sales & analytics",
        path: "/reports",
      },
      {
        id: "storage",
        icon: Database,
        label: "Storage & data",
        subtitle: "Backup & sync",
        action: () => toast.info("Storage settings coming soon"),
      },
    ],
  },
  {
    id: "support",
    items: [
      {
        id: "help",
        icon: HelpCircle,
        label: "Help & feedback",
        action: () => toast.info("Help & feedback coming soon"),
      },
    ],
  },
];

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");

  const userName = user?.name || "Pharmacist";
  const userEmail = user?.email || "user@meditrack.ai";

  /* Handlers */
  const handleClose = () => navigate(-1);

  const handleUserClick = () => navigate("/profile");

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login", { replace: true });
  };

  const handleItemClick = (item) => {
    if (item.path) {
      // ✨ Pass tab as router state
      navigate(item.path, item.tab ? { state: { tab: item.tab } } : undefined);
    } else if (item.action) {
      item.action();
    }
  };

  /* Filter by search */
  const filteredSections = SETTINGS_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        (item.subtitle &&
          item.subtitle.toLowerCase().includes(search.toLowerCase()))
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="min-h-screen bg-[#f2f2f7] dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* =====================================================
          TOP BAR — iOS Style
      ====================================================== */}

      <header className="sticky top-0 z-40 bg-[#f2f2f7]/95 dark:bg-slate-950/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700/60 dark:border-slate-800">
        <div className="max-w-[600px] mx-auto px-4 py-3 relative flex items-center justify-center">
          {/* X Button */}
          <button
            onClick={handleClose}
            className="absolute left-4 w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            aria-label="Close"
          >
            <X
              size={20}
              className="text-slate-700 dark:text-slate-300"
              strokeWidth={2.5}
            />
          </button>

          {/* Title */}
          <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        </div>
      </header>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="max-w-[600px] mx-auto px-4 py-5 pb-20">

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-white dark:bg-slate-900 border-0 text-sm outline-none placeholder:text-slate-400 dark:text-slate-500 shadow-sm focus:ring-2 focus:ring-[#0284c7]/20"
            />
          </div>
        </div>

        {/* USER CARD — Clickable → Profile */}
        <div className="mb-6">
          <button
            onClick={handleUserClick}
            className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm text-left"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0284c7] to-[#0369a1] flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
              {userName[0]?.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-slate-800 dark:text-white truncate">
                {userName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 truncate">
                {userEmail}
              </p>
            </div>

            <ChevronRight size={20} className="text-slate-300 shrink-0" />
          </button>
        </div>

        {/* SETTINGS SECTIONS */}
        {filteredSections.map((section) => (
          <div key={section.id} className="mb-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm">
              {section.items.map((item, iIdx) => {
                const Icon = item.icon;
                const isLast = iIdx === section.items.length - 1;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left relative"
                  >
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Icon
                        size={16}
                        className="text-slate-700 dark:text-slate-300"
                        strokeWidth={2}
                      />
                    </div>

                    {/* Label + Subtitle */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white">
                        {item.label}
                      </p>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Chevron */}
                    <ChevronRight
                      size={18}
                      className="text-slate-300 dark:text-slate-600 dark:text-slate-300 shrink-0"
                    />

                    {/* Divider */}
                    {!isLast && (
                      <span className="absolute bottom-0 left-16 right-0 h-px bg-slate-100 dark:bg-slate-800" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Empty State */}
        {filteredSections.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center shadow-sm">
            <Search size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-white mb-1">
              No results found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Try a different search term
            </p>
          </div>
        )}

        {/* LOGOUT BUTTON */}
        {!search && (
          <div className="mt-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                  <LogOut
                    size={16}
                    className="text-rose-600 dark:text-rose-400"
                    strokeWidth={2}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    Log out
                  </p>
                </div>
                <ChevronRight size={18} className="text-rose-300 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-8">
          MediTrack v2.4.1
        </p>

      </main>
    </div>
  );
}