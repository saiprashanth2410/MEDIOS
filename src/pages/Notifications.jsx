import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  Package,
  FileText,
  Clock,
  CheckCircle2,
  CheckCheck,
  Trash2,
  Search,
  X,
  Filter,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  CalendarClock,
  Inbox,
  Loader2,
} from "lucide-react";
import Navbar from "../components/dashboard/Navbar";
import { notificationsAPI } from "../services/api";
import { toast } from "sonner";

/* =====================================================
   CONFIG & HELPERS
===================================================== */

const TYPE_CONFIG = {
  all: { label: "All Alerts", icon: Bell },
  stock: { label: "Stock Alerts", icon: Package, color: "red" },
  expiry: { label: "Expiry Warnings", icon: AlertTriangle, color: "amber" },
  prescription: { label: "Prescriptions", icon: FileText, color: "blue" },
  order: { label: "Orders", icon: Clock, color: "purple" },
  system: { label: "System", icon: CheckCircle2, color: "emerald" },
};

const COLOR_CLASSES = {
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  red: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-700 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  },
  blue: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800",
    text: "text-sky-700 dark:text-sky-400",
    iconBg: "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  },
};

function formatFullTime(dateStr) {
  if (!dateStr) return "Recent";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(dateStr) {
  if (!dateStr) return "Just now";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getInitialPageNotifications() {
  if (typeof window === "undefined") return [];
  try {
    const isCleared =
      localStorage.getItem("meditrack_notifications_cleared") === "true";
    if (isCleared) return [];

    const saved = localStorage.getItem("meditrack_notifications");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.debug(e);
  }
  return [];
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(getInitialPageNotifications);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'unread' | 'read'
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    stockCount: 0,
    expiryCount: 0,
    prescriptionCount: 0,
  });

  /* =====================================================
     LOAD DATA
  ===================================================== */

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const isCleared =
          localStorage.getItem("meditrack_notifications_cleared") === "true";
        const [data, statsData] = await Promise.all([
          notificationsAPI.list({
            search: searchQuery,
            status: statusFilter,
            type: activeType,
            limit: 100,
          }),
          notificationsAPI.stats(),
        ]);

        if (!cancelled) {
          if (isCleared) {
            setNotifications([]);
            setStats({ total: 0, unread: 0, stockCount: 0, expiryCount: 0, prescriptionCount: 0, highPriority: 0 });
          } else if (data?.notifications && Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
            localStorage.setItem(
              "meditrack_notifications",
              JSON.stringify(data.notifications)
            );
            if (data.notifications.length === 0) {
              localStorage.setItem("meditrack_notifications_cleared", "true");
            }
          }
          if (!isCleared && statsData) setStats(statsData);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Notifications fetch error:", err);
          setLoading(false);
        }
      }
    };

    load();

    const handleUpdate = () => {
      load();
    };

    window.addEventListener("meditrack_notifications_updated", handleUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("meditrack_notifications_updated", handleUpdate);
    };
  }, [searchQuery, statusFilter, activeType]);

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      const isCleared = localStorage.getItem("meditrack_notifications_cleared") === "true";
      if (isCleared) {
        setNotifications([]);
        setStats({ total: 0, unread: 0, stockCount: 0, expiryCount: 0, prescriptionCount: 0, highPriority: 0 });
        toast.success("Notifications refreshed");
        return;
      }
      const [data, statsData] = await Promise.all([
        notificationsAPI.list({
          search: searchQuery,
          status: statusFilter,
          type: activeType,
          limit: 100,
        }),
        notificationsAPI.stats(),
      ]);

      if (data?.notifications && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        localStorage.setItem(
          "meditrack_notifications",
          JSON.stringify(data.notifications)
        );
        if (data.notifications.length === 0) {
          localStorage.setItem("meditrack_notifications_cleared", "true");
        }
      }
      if (statsData) setStats(statsData);
      toast.success("Notifications refreshed");
    } catch {
      toast.error("Failed to refresh notifications");
    } finally {
      setRefreshing(false);
    }
  };

  /* =====================================================
     ACTIONS
  ===================================================== */

  const notifyChange = () => {
    window.dispatchEvent(new Event("meditrack_notifications_updated"));
  };

  const handleMarkAllRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    setStats((prev) => ({ ...prev, unread: 0 }));
    try {
      localStorage.setItem("meditrack_notifications", JSON.stringify(updated));
      await notificationsAPI.markAllRead();
      notifyChange();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleToggleRead = async (notif) => {
    const notifId = notif.id || notif._id;
    const updatedStatus = !notif.read;
    const updated = notifications.map((n) =>
      (n.id === notifId || n._id === notifId) ? { ...n, read: updatedStatus } : n
    );
    setNotifications(updated);
    setStats((prev) => ({
      ...prev,
      unread: updatedStatus ? Math.max(0, prev.unread - 1) : prev.unread + 1,
    }));
    try {
      localStorage.setItem("meditrack_notifications", JSON.stringify(updated));
      await notificationsAPI.update(notifId, { read: updatedStatus });
      notifyChange();
      toast.success(updatedStatus ? "Marked as read" : "Marked as unread");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    const updated = notifications.filter((n) => n.id !== id && n._id !== id);
    setNotifications(updated);
    try {
      localStorage.setItem("meditrack_notifications", JSON.stringify(updated));
      if (updated.length === 0) {
        localStorage.setItem("meditrack_notifications_cleared", "true");
      }
      await notificationsAPI.delete(id);
      try {
        const statsData = await notificationsAPI.stats();
        if (statsData) setStats(statsData);
      } catch (e) {
        console.debug("Stats update error:", e);
      }
      notifyChange();
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete all notifications? This cannot be undone."
      )
    ) {
      return;
    }
    setNotifications([]);
    setStats({ total: 0, unread: 0, stockCount: 0, expiryCount: 0, prescriptionCount: 0 });
    try {
      localStorage.setItem("meditrack_notifications_cleared", "true");
      localStorage.setItem("meditrack_notifications", "[]");
      await notificationsAPI.clearAll();
      notifyChange();
      toast.success("All notifications cleared");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  /* =====================================================
     FILTERED COUNT
  ===================================================== */

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar onScanClick={() => {}} />

      <main className="max-w-[1300px] mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <span
                onClick={() => navigate("/dashboard")}
                className="hover:text-[#0284c7] cursor-pointer"
              >
                Dashboard
              </span>
              <span>/</span>
              <span className="text-[#0284c7] dark:text-sky-400 font-semibold">Notification Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Notification Center
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time monitoring of stock levels, expiring batches, and system alerts
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
              title="Refresh alerts"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin text-[#0284c7]" : ""}
              />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[#0284c7] dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
              >
                <CheckCheck size={14} />
                <span>Mark All Read ({unreadCount})</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition shadow-2xs"
              >
                <Trash2 size={14} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div
            onClick={() => {
              setActiveType("all");
              setStatusFilter("all");
            }}
            className={`p-4 rounded-xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-2xs ${
              activeType === "all" && statusFilter === "all"
                ? "border-[#0284c7] ring-2 ring-[#0284c7]/20"
                : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 dark:bg-sky-500/15 border border-sky-200/50 dark:border-sky-500/20 flex items-center justify-center text-[#0284c7] dark:text-sky-400">
                <Bell size={18} />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Alerts
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total || notifications.length}</p>
          </div>

          <div
            onClick={() => setStatusFilter((prev) => (prev === "unread" ? "all" : "unread"))}
            className={`p-4 rounded-xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-2xs ${
              statusFilter === "unread"
                ? "border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20 dark:bg-rose-950/20"
                : "border-slate-200/80 dark:border-slate-800 hover:border-rose-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 dark:bg-rose-500/15 border border-rose-200/50 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <ShieldAlert size={18} />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Unread Alerts
              </span>
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {stats.unread !== undefined ? stats.unread : unreadCount}
            </p>
          </div>

          <div
            onClick={() => setActiveType((prev) => (prev === "stock" ? "all" : "stock"))}
            className={`p-4 rounded-xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-2xs ${
              activeType === "stock"
                ? "border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20 dark:bg-rose-950/20"
                : "border-slate-200/80 dark:border-slate-800 hover:border-rose-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 dark:bg-rose-500/15 border border-rose-200/50 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Package size={18} />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Stock Warnings
              </span>
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {stats.stockCount || notifications.filter((n) => n.type === "stock").length}
            </p>
          </div>

          <div
            onClick={() => setActiveType((prev) => (prev === "expiry" ? "all" : "expiry"))}
            className={`p-4 rounded-xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-2xs ${
              activeType === "expiry"
                ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20 dark:bg-amber-950/20"
                : "border-slate-200/80 dark:border-slate-800 hover:border-amber-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200/50 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <CalendarClock size={18} />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Expiry Alerts
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.expiryCount || notifications.filter((n) => n.type === "expiry").length}
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 mb-6 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts by title, medicine name, batch number..."
                className="w-full h-10 pl-10 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-sm outline-none focus:border-[#0284c7] focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-[#0284c7]/10 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Read / Unread Status Select */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  statusFilter === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("unread")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                  statusFilter === "unread"
                    ? "bg-white dark:bg-slate-900 text-rose-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </button>
              <button
                onClick={() => setStatusFilter("read")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  statusFilter === "read"
                    ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Read
              </button>
            </div>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-xs">
            <Filter size={13} className="text-slate-400 shrink-0" />
            {Object.entries(TYPE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const isActive = activeType === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveType(key)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? "bg-[#0284c7] text-white shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={13} />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alerts List */}
        {loading ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <Loader2 size={32} className="text-[#0284c7] animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Loading notification center...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-2xs">
            <div className="w-16 h-16 rounded-full bg-sky-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Inbox size={28} className="text-[#0284c7] dark:text-sky-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              No notifications to display
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              Everything in your inventory, prescriptions, and batches is up to date and in order.
            </p>
            {(searchQuery || activeType !== "all" || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveType("all");
                  setStatusFilter("all");
                }}
                className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-[#0284c7] text-white hover:bg-[#0369a1] transition"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const typeCfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
              const Icon = typeCfg.icon || Bell;
              const theme = COLOR_CLASSES[notif.color] || COLOR_CLASSES.blue;

              return (
                <div
                  key={notif.id}
                  className={`p-4 sm:p-5 rounded-xl border transition-all duration-150 ${
                    !notif.read
                      ? `${theme.bg} ${theme.border} shadow-xs`
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Icon & Details */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}
                      >
                        <Icon size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {notif.title}
                          </h4>

                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                          )}

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${theme.badge}`}
                          >
                            {notif.type}
                          </span>

                          {notif.priority && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {notif.priority}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2.5">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                          <span>{formatFullTime(notif.createdAt)}</span>
                          <span>•</span>
                          <span>{formatRelative(notif.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                      {notif.link && (
                        <button
                          type="button"
                          onClick={() => navigate(notif.link)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0284c7] hover:bg-[#0369a1] text-white transition shadow-xs"
                        >
                          <span>Take Action</span>
                          <ChevronRight size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleRead(notif)}
                        className={`p-2 rounded-lg border transition ${
                          notif.read
                            ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800"
                            : "bg-white dark:bg-slate-900 border-sky-200 dark:border-slate-700 text-[#0284c7] hover:bg-sky-50"
                        }`}
                        title={notif.read ? "Mark as unread" : "Mark as read"}
                      >
                        <CheckCircle2 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(notif.id || notif._id)}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition"
                        title="Delete alert"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
