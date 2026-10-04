import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Package,
  AlertTriangle,
  Clock,
  CheckCheck,
  X,
  FileText,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { notificationsAPI } from "../../services/api";
import { toast } from "sonner";
import { getScopedKey } from "../../utils/userScope";

/* =====================================================
   COLOR & ICON MAPS
===================================================== */

const COLOR_MAP = {
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  red: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  blue: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-500",
  },
};

const TYPE_ICONS = {
  expiry: AlertTriangle,
  stock: Package,
  prescription: FileText,
  order: Clock,
  system: CheckCircle2,
};

function formatRelativeTime(dateStr) {
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

function getInitialBellNotifications() {
  if (typeof window === "undefined") return [];
  try {
    const isCleared =
      localStorage.getItem(getScopedKey("meditrack_notifications_cleared")) === "true";
    if (isCleared) return [];

    const saved = localStorage.getItem(getScopedKey("meditrack_notifications"));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.debug("Bell initial notifications fallback:", e);
  }
  return [
    {
      id: "notif-welcome",
      title: "Welcome to MediTrackOS",
      message: "Your new pharmacy account is active. Add medicines and batches to begin tracking.",
      type: "system",
      color: "emerald",
      createdAt: new Date().toISOString(),
      read: false,
      link: "/medicines",
    },
  ];
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(getInitialBellNotifications);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* =====================================================
     FETCH NOTIFICATIONS FROM BACKEND
  ===================================================== */

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const isCleared =
          localStorage.getItem(getScopedKey("meditrack_notifications_cleared")) === "true";
        if (isCleared) {
          if (!cancelled) setNotifications([]);
          return;
        }
        const data = await notificationsAPI.list({ limit: 15 });
        if (!cancelled && data?.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          localStorage.setItem(
            getScopedKey("meditrack_notifications"),
            JSON.stringify(data.notifications)
          );
          if (data.notifications.length === 0) {
            localStorage.setItem(getScopedKey("meditrack_notifications_cleared"), "true");
          }
        }
      } catch (err) {
        console.debug("Backend notifications fallback:", err?.message);
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
  }, []);

  // Refresh on opening dropdown
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const isCleared =
          localStorage.getItem(getScopedKey("meditrack_notifications_cleared")) === "true";
        if (isCleared) {
          if (!cancelled) setNotifications([]);
          return;
        }
        setLoading(true);
        const data = await notificationsAPI.list({ limit: 15 });
        if (!cancelled && data?.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          localStorage.setItem(
            getScopedKey("meditrack_notifications"),
            JSON.stringify(data.notifications)
          );
          if (data.notifications.length === 0) {
            localStorage.setItem(getScopedKey("meditrack_notifications_cleared"), "true");
          }
        }
      } catch (err) {
        console.debug("Backend notifications refresh fallback:", err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    refresh();
    return () => {
      cancelled = true;
    };
  }, [open]);

  /* =====================================================
     CLOSE ON OUTSIDE CLICK & ESCAPE
  ===================================================== */

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  /* =====================================================
     ACTIONS
  ===================================================== */

  const markAllRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    try {
      localStorage.setItem(getScopedKey("meditrack_notifications"), JSON.stringify(updated));
      await notificationsAPI.markAllRead();
      window.dispatchEvent(new Event("meditrack_notifications_updated"));
      toast.success("All notifications marked as read");
    } catch (err) {
      console.debug("markAllRead error:", err);
    }
  };

  const handleClickItem = async (notif) => {
    if (!notif.read) {
      const updated = notifications.map((n) =>
        n.id === notif.id ? { ...n, read: true } : n
      );
      setNotifications(updated);
      try {
        localStorage.setItem(getScopedKey("meditrack_notifications"), JSON.stringify(updated));
        await notificationsAPI.markRead(notif.id);
        window.dispatchEvent(new Event("meditrack_notifications_updated"));
      } catch (err) {
        console.debug("markRead error:", err);
      }
    }

    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id && n._id !== id);
    setNotifications(updated);
    try {
      localStorage.setItem(getScopedKey("meditrack_notifications"), JSON.stringify(updated));
      if (updated.length === 0) {
        localStorage.setItem(getScopedKey("meditrack_notifications_cleared"), "true");
      }
      await notificationsAPI.delete(id);
      window.dispatchEvent(new Event("meditrack_notifications_updated"));
      toast.success("Notification deleted");
    } catch (err) {
      console.debug("Delete notification error:", err);
    }
  };

  const clearAll = async () => {
    setNotifications([]);
    try {
      localStorage.setItem(getScopedKey("meditrack_notifications_cleared"), "true");
      localStorage.setItem(getScopedKey("meditrack_notifications"), "[]");
      await notificationsAPI.clearAll();
      window.dispatchEvent(new Event("meditrack_notifications_updated"));
      toast.success("Notifications cleared");
    } catch (err) {
      console.debug("clearAll error:", err);
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
          open ? "bg-white/20" : "hover:bg-white/10"
        }`}
      >
        <Bell size={18} className="text-white" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0284c7]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <div
        ref={dropdownRef}
        className={`absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 origin-top-right transition-all duration-200 ease-out ${
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
        role="dialog"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0284c7]/10 text-[#0284c7] dark:bg-[#0284c7]/20 dark:text-sky-300">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {loading && (
              <Loader2 size={13} className="text-slate-400 animate-spin" />
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-medium text-[#0284c7] hover:bg-[#0284c7]/10 px-2 py-1 rounded-md transition flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {notifications.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Bell size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                All caught up!
              </p>
              <p className="text-xs text-slate-400 mt-1">No new notifications</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] || Bell;
              const colors = COLOR_MAP[n.color] || COLOR_MAP.blue;
              const notifId = n.id || n._id;

              return (
                <div
                  key={notifId}
                  onClick={() => handleClickItem(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleClickItem(n);
                    }
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition cursor-pointer select-none ${
                    n.read
                      ? "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      : "bg-[#0284c7]/[0.04] dark:bg-sky-950/20 hover:bg-[#0284c7]/[0.08]"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <Icon size={16} className={colors.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs font-semibold text-slate-800 dark:text-slate-100 ${
                          !n.read ? "pr-1" : ""
                        }`}
                      >
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!n.read && (
                          <span
                            className={`w-2 h-2 rounded-full ${colors.dot} shrink-0 mt-0.5`}
                          />
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(e, notifId)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-60 hover:opacity-100"
                          title="Delete alert"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                      <span>{formatRelativeTime(n.createdAt)}</span>
                      {n.link && (
                        <span className="text-[#0284c7] hover:underline flex items-center gap-0.5 font-medium">
                          View details <ChevronRight size={10} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
          {notifications.length > 0 ? (
            <button
              onClick={clearAll}
              className="text-[11px] font-medium text-slate-500 hover:text-rose-500 transition flex items-center gap-1"
            >
              <X size={12} />
              Clear all
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            className="text-xs font-semibold text-[#0284c7] hover:text-[#0369a1] hover:underline flex items-center gap-1"
          >
            View all →
          </button>
        </div>
      </div>
    </div>
  );
}