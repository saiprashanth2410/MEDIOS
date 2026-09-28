import { useState, useRef, useEffect } from "react";
import { Bell, Package, AlertTriangle, Clock, CheckCheck, X } from "lucide-react";

/* =====================================================
   MOCK NOTIFICATIONS — Later replace with real data
===================================================== */

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    type: "expiry",
    icon: AlertTriangle,
    title: "Medicine expiring soon",
    message: "Safedox (BATCH-1000) expires in 15 days",
    time: "2 min ago",
    read: false,
    color: "amber",
  },
  {
    id: 2,
    type: "stock",
    icon: Package,
    title: "Low stock alert",
    message: "Flucret stock is below 10 units",
    time: "1 hr ago",
    read: false,
    color: "red",
  },
  {
    id: 3,
    type: "expiry",
    icon: AlertTriangle,
    title: "Batch expired",
    message: "BATCH-0998 expired yesterday — remove from shelf",
    time: "3 hrs ago",
    read: false,
    color: "red",
  },
  {
    id: 4,
    type: "order",
    icon: Clock,
    title: "Purchase order pending",
    message: "PO-2024-045 waiting for supplier confirmation",
    time: "Yesterday",
    read: true,
    color: "blue",
  },
];

/* =====================================================
   COLOR MAP
===================================================== */

const COLOR_MAP = {
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    dot: "bg-amber-500",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-500",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    dot: "bg-blue-500",
  },
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* =====================================================
     CLOSE ON OUTSIDE CLICK
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

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOneRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
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
        className={`absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 origin-top-right transition-all duration-200 ease-out ${
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
        role="dialog"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#0284c7]/10 text-[#0284c7]">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-medium text-[#0284c7] hover:bg-[#0284c7]/10 px-2 py-1 rounded-md transition flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck size={12} />
                Mark all
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Bell size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                All caught up!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                No new notifications
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = n.icon;
              const colors = COLOR_MAP[n.color] || COLOR_MAP.blue;

              return (
                <button
                  key={n.id}
                  onClick={() => markOneRead(n.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition border-b border-slate-50 last:border-0 ${
                    n.read
                      ? "hover:bg-slate-50"
                      : "bg-[#0284c7]/[0.03] hover:bg-[#0284c7]/[0.06]"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={16} className={colors.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs font-semibold text-slate-800 ${
                          !n.read && "pr-3"
                        }`}
                      >
                        {n.title}
                      </p>
                      {!n.read && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${colors.dot} shrink-0 mt-1.5`}
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={clearAll}
              className="text-[11px] font-medium text-slate-500 hover:text-red-500 transition flex items-center gap-1"
            >
              <X size={12} />
              Clear all
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-[11px] font-medium text-[#0284c7] hover:underline"
            >
              View all →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}