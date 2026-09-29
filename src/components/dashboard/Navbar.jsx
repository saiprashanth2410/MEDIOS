import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Pill,
  ScanLine,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Boxes,
  AlertTriangle,
  Factory,
  Truck,
  Settings,
  Package,
  ClipboardList,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useScan } from "../../context/ScanContext";
import { medicinesAPI } from "../../services/api";
import BarcodeScanner from "../scanner/BarcodeScanner";
import NotificationBell from "./NotificationBell";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: Pill, label: "Medicines", path: "/medicines" },
      { icon: ClipboardList, label: "Prescriptions", path: "/prescriptions" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { icon: Boxes, label: "Batches", path: "/batches" },
      { icon: AlertTriangle, label: "Expiry", path: "/expiry" },
      { icon: Package, label: "Reorder", path: "/reorder" },
    ],
  },
  {
    label: "Supply Chain",
    items: [
      { icon: Factory, label: "Suppliers", path: "/suppliers" },
      { icon: Truck, label: "Shipments", path: "/shipments" },
    ],
  },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef(null);

  const userName = user?.name || "Pharmacist";
  const userEmail = user?.email || "user@meditrack.ai";
  const userRole = user?.role || "Chief Pharmacist";

  /* =====================================================
     HANDLERS
  ===================================================== */

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    toast.success("Logged out successfully");
    navigate("/login", { replace: true });
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  const { scan } = useScan();

  const handleScanResult = async (code) => {
    setShowScanner(false);
    try {
      const res = await scan(code);
      if (res?.medicine) {
        toast.success(`Found: ${res.medicine.name} (${res.medicine.batch})`);
        return;
      }
      const med = await medicinesAPI.get(code);
      if (med) {
        toast.success(`Found: ${med.name || med.fullName} (Stock: ${med.stock || 0})`);
        return;
      }
    } catch (err) {
      console.debug("Barcode lookup fallback:", err);
    }
    toast.success(`Scanned: ${code}`);
  };

  /* =====================================================
     EFFECTS
  ===================================================== */

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const currentPath = window.location.pathname;

  return (
    <>
      <header className="bg-[#0284c7] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md shrink-0">
              <Pill size={20} className="text-[#0284c7]" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold tracking-tight">MediTrack</h1>
              <p className="text-[9px] uppercase tracking-widest text-white/70 font-medium">
                Pharmacy OS
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_GROUPS.flatMap((group) => group.items).map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.path)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Scan */}
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-2.5 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition"
              title="Scan medicine"
              aria-label="Scan medicine"
            >
              <ScanLine size={14} />
              <span className="hidden sm:inline">Scan</span>
            </button>

            {/* Notifications — NEW component */}
            <NotificationBell />

            {/* USER MENU DROPDOWN */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 sm:gap-3 px-1.5 sm:px-2 py-1 rounded-md hover:bg-white/10 transition"
                aria-label="User menu"
                aria-expanded={userMenuOpen}
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold leading-tight">
                    {userName}
                  </p>
                  <p className="text-[10px] text-white/60 leading-tight">
                    {userRole}
                  </p>
                </div>

                <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                  {userName[0]?.toUpperCase()}
                </div>

                <ChevronDown
                  size={14}
                  className={`hidden sm:block transition-transform ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fade-up">
                  {/* User info header */}
                  <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-sky-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0284c7] to-[#0369a1] flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                        {userName[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {userName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {userEmail}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-100 text-[#0284c7] text-[10px] font-medium">
                      <ShieldCheck size={10} />
                      {userRole}
                    </div>
                  </div>

                  {/* Menu items — View Profile REMOVED */}
                  <div className="p-2">
                    <button
                      onClick={() => handleNavClick("/settings")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-[#0284c7] transition"
                    >
                      <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">
                        <Settings size={14} className="text-slate-600" />
                      </div>
                      Settings
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="p-2 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
                    >
                      <div className="w-8 h-8 rounded-md bg-rose-50 flex items-center justify-center">
                        <LogOut size={14} className="text-rose-600" />
                      </div>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-white/10 transition"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          MOBILE MENU DRAWER
      ====================================================== */}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="absolute right-0 top-0 h-full w-[280px] bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#0284c7] flex items-center justify-center">
                  <Pill size={18} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Menu</h2>
                  <p className="text-[10px] text-slate-500">{userName}</p>
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-md hover:bg-slate-100 transition"
                aria-label="Close menu"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="p-3">
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-3 mb-2">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPath === item.path;
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleNavClick(item.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition mb-1 ${
                          isActive
                            ? "bg-sky-50 text-[#0284c7]"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon size={16} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Bottom actions — Profile REMOVED */}
              <div className="border-t border-slate-100 pt-3 mt-3">
                <button
                  onClick={() => handleNavClick("/settings")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 transition mb-1"
                >
                  <Settings size={16} />
                  Settings
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}