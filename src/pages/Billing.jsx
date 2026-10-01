import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Receipt,
  User,
  Phone,
  Stethoscope,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  Pill,
  Calendar,
  Package,
  FileText,
  RotateCcw,
  Sparkles,
  Download,
} from "lucide-react";
import Navbar from "../components/dashboard/Navbar";
import { useAuth } from "../context/AuthContext";
import { inventoryFirebaseService } from "../services/inventoryFirebaseService";
import { billingFirebaseService } from "../services/billingFirebaseService";
import { patientsFirebaseService } from "../services/patientsFirebaseService";
import { deductCartFromInventory } from "../utils/inventoryDeduction";
import defaultMedicines from "../data/catalogMedicines.json";

const DRAFT_KEY = "meditrack_pos_active_draft";

function getSavedDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getInitialBillingCatalog() {
  if (typeof window === "undefined") return defaultMedicines;
  try {
    const deletedIds = new Set(
      JSON.parse(localStorage.getItem("meditrack_deleted_medicines") || "[]")
    );
    const overrides = JSON.parse(
      localStorage.getItem("meditrack_medicine_overrides") || "{}"
    );
    const custom = JSON.parse(
      localStorage.getItem("meditrack_custom_medicines") || "[]"
    );

    const merged = defaultMedicines
      .filter((m) => !deletedIds.has(String(m.id)) && !deletedIds.has(m.name))
      .map((m) => {
        const override = overrides[m.id] || overrides[m.name];
        if (!override) return m;
        return {
          ...m,
          stock: override.stock !== undefined ? override.stock : m.stock,
          batch: override.batch || m.batch,
          rack: override.rack || m.rack,
        };
      });

    const catalogIds = new Set(defaultMedicines.map((m) => String(m.id)));
    const catalogNames = new Set(
      defaultMedicines.map((m) => (m.name || "").toLowerCase())
    );

    const activeCustom = custom.filter(
      (m) =>
        !deletedIds.has(String(m.id)) &&
        !deletedIds.has(m.name) &&
        !catalogIds.has(String(m.id)) &&
        !catalogNames.has((m.name || "").toLowerCase())
    );

    return [...activeCustom, ...merged];
  } catch (err) {
    console.debug("Initial billing catalog fallback:", err);
    return defaultMedicines;
  }
}

function getLivePharmacyDetails() {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("meditrack_pharmacy_details");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) return parsed;
      }
      const rawUser = localStorage.getItem("meditrack_user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u?.pharmacy) {
          return {
            name: u.pharmacy,
            branch: u.branch || "Tiruvannamalai",
            license: u.license || "TN/PH/2026/0892",
            pharmacyId: u.pharmacyId || "DL-TN-CH-2024-0045",
          };
        }
      }
    } catch (_) {}
  }
  return {
    name: "MediTrack Pharmacy & Health Store",
    branch: "Tiruvannamalai",
    license: "TN/PH/2026/0892",
    pharmacyId: "DL-TN-CH-2024-0045",
  };
}

export default function Billing() {
  const { user } = useAuth();
  const savedDraft = useMemo(() => getSavedDraft(), []);
  const [pharmacyInfo, setPharmacyInfo] = useState(getLivePharmacyDetails);

  // Sync pharmacy details dynamically if edited in Profile & Settings
  useEffect(() => {
    const handlePharmUpdate = () => {
      setPharmacyInfo(getLivePharmacyDetails());
    };
    window.addEventListener("meditrack_pharmacy_updated", handlePharmUpdate);
    window.addEventListener("storage", handlePharmUpdate);
    return () => {
      window.removeEventListener("meditrack_pharmacy_updated", handlePharmUpdate);
      window.removeEventListener("storage", handlePharmUpdate);
    };
  }, []);

  // Inventory state initialized with all 505 catalog medicines + custom medicines
  const [catalog, setCatalog] = useState(getInitialBillingCatalog);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(() => savedDraft?.activeTab || "pos");

  // Cart & Draft state (persisted across tab changes)
  const [cart, setCart] = useState(() => savedDraft?.cart || []);
  const [patientName, setPatientName] = useState(() => savedDraft?.patientName || "");
  const [patientPhone, setPatientPhone] = useState(() => savedDraft?.patientPhone || "");
  const [doctorName, setDoctorName] = useState(() => savedDraft?.doctorName || "");
  const [paymentMethod, setPaymentMethod] = useState(() => savedDraft?.paymentMethod || "UPI / QR");
  const [patientVisitInfo, setPatientVisitInfo] = useState(null);

  // Invoices & Schedule H Register
  const [invoices, setInvoices] = useState([]);
  const [scheduleHLogs, setScheduleHLogs] = useState([]);
  const [dispensing, setDispensing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  const searchInputRef = useRef(null);

  /* =====================================================
     REAL-TIME INVENTORY STREAM & LOCAL STORAGE SYNC
  ===================================================== */
  useEffect(() => {
    // 1. Initial local sync
    setCatalog(getInitialBillingCatalog());

    // 2. Real-time Firestore sync
    const unsub = inventoryFirebaseService.subscribeToMedicines((fbMeds) => {
      if (fbMeds && fbMeds.length > 0) {
        setCatalog((prev) => {
          const map = new Map();
          prev.forEach((p) => map.set(String(p.id), p));
          fbMeds.forEach((m) => {
            const existing = map.get(String(m.id));
            if (existing) {
              map.set(String(m.id), { ...existing, ...m });
            } else if (m.isCustom) {
              map.set(String(m.id), m);
            }
          });
          return Array.from(map.values());
        });
      }
    });

    const handleStockUpdate = () => {
      setCatalog(getInitialBillingCatalog());
    };

    window.addEventListener("meditrack_stock_updated", handleStockUpdate);
    window.addEventListener("meditrack_medicines_updated", handleStockUpdate);

    return () => {
      if (typeof unsub === "function") unsub();
      window.removeEventListener("meditrack_stock_updated", handleStockUpdate);
      window.removeEventListener("meditrack_medicines_updated", handleStockUpdate);
    };
  }, []);

  /* Auto-save billing draft across tabs */
  useEffect(() => {
    try {
      if (cart.length > 0 || patientName || patientPhone || doctorName) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            cart,
            patientName,
            patientPhone,
            doctorName,
            paymentMethod,
            activeTab,
          })
        );
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (e) {
      console.debug("Billing draft auto-save note:", e);
    }
  }, [cart, patientName, patientPhone, doctorName, paymentMethod, activeTab]);

  /* Patient auto-lookup by mobile number */
  const handlePhoneChange = async (val) => {
    setPatientPhone(val);
    const clean = String(val || "").replace(/\D/g, "");
    if (clean.length >= 10) {
      const existing = await patientsFirebaseService.findByPhone(clean);
      if (existing) {
        if (!patientName.trim()) {
          setPatientName(existing.name || "");
        }
        setPatientVisitInfo({
          visitCount: Number(existing.visitCount || 1),
          lastVisit: existing.lastVisitFormatted || "Earlier",
          name: existing.name,
        });
        toast.info(`Patient recognized: ${existing.name || clean} (Visit #${Number(existing.visitCount || 1) + 1})`);
      } else {
        setPatientVisitInfo(null);
      }
    } else {
      setPatientVisitInfo(null);
    }
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("Are you sure you want to clear the active cart?")) {
      setCart([]);
      setPatientName("");
      setPatientPhone("");
      setDoctorName("");
      setPatientVisitInfo(null);
      localStorage.removeItem(DRAFT_KEY);
      toast.info("Cart cleared");
    }
  };

  /* Load sales and Schedule H records */
  useEffect(() => {
    if (activeTab === "history") {
      billingFirebaseService.getRecentInvoices(30).then(setInvoices);
    } else if (activeTab === "schedule_h") {
      billingFirebaseService.getScheduleHRegister(50).then(setScheduleHLogs);
    }
  }, [activeTab]);

  /* =====================================================
     FILTERED SEARCH (WITH FEFO ALLOCATION)
  ===================================================== */
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return catalog
      .filter((m) => {
        const name = String(m.name || "").toLowerCase();
        const brand = String(m.brandName || "").toLowerCase();
        const gen = String(m.generic || "").toLowerCase();
        const full = String(m.fullName || "").toLowerCase();
        const batch = String(m.batch || "").toLowerCase();
        return (
          name.includes(q) ||
          brand.includes(q) ||
          gen.includes(q) ||
          full.includes(q) ||
          batch.includes(q)
        );
      })
      .slice(0, 12);
  }, [catalog, searchQuery]);

  /* Add to Cart */
  const handleAddToCart = (medicine) => {
    if (!medicine || (medicine.stock || 0) <= 0) {
      toast.error(`${medicine?.name || "Item"} is currently out of stock`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((it) => it.id === medicine.id);
      if (existing) {
        if (existing.quantity >= (medicine.stock || 1)) {
          toast.error(`Maximum available stock reached (${medicine.stock})`);
          return prev;
        }
        return prev.map((it) =>
          it.id === medicine.id
            ? {
                ...it,
                quantity: it.quantity + 1,
                total: (it.quantity + 1) * it.price,
              }
            : it
        );
      }

      return [
        ...prev,
        {
          id: medicine.id,
          name: medicine.name,
          generic: medicine.generic || "",
          batch: medicine.batch || "BATCH-01",
          expiry: medicine.expiry || "2027-12-31",
          price: Number(medicine.price || medicine.sellingPrice || 45),
          hsn: medicine.hsn || "3004",
          gstRate: Number(medicine.gstRate ?? 12),
          schedule: medicine.schedule || "H",
          rack: medicine.rack || "R-1",
          maxStock: Number(medicine.stock || 100),
          quantity: 1,
          total: Number(medicine.price || medicine.sellingPrice || 45),
        },
      ];
    });

    setSearchQuery("");
    toast.success(`Added ${medicine.name}`);
  };

  const handleUpdateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const nextQty = it.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > it.maxStock) {
              toast.error(`Cannot exceed stock limit (${it.maxStock})`);
              return it;
            }
            return {
              ...it,
              quantity: nextQty,
              total: nextQty * it.price,
            };
          }
          return it;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveItem = (id) => {
    setCart((prev) => prev.filter((it) => it.id !== id));
  };

  /* Check if any drug in cart requires Schedule H prescription */
  const hasScheduleHDrug = useMemo(() => {
    return cart.some((it) => it.schedule && it.schedule !== "OTC");
  }, [cart]);

  /* =====================================================
     TAX & TOTALS (INDIAN GST SPEC)
  ===================================================== */
  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, it) => acc + it.total, 0);
    // Standard Indian GST computation (50% CGST + 50% SGST)
    const totalGst = subtotal * 0.12; // 12% blended GST
    const cgst = totalGst / 2; // 6% Central GST
    const sgst = totalGst / 2; // 6% State GST
    const grandTotal = Math.round(subtotal + totalGst);

    return {
      subtotal,
      cgst,
      sgst,
      totalGst,
      grandTotal,
    };
  }, [cart]);

  /* =====================================================
     DISPENSE & SAVE INVOICE (REAL-TIME CLOUD FIRESTORE)
  ===================================================== */
  const handleDispenseSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty. Add medicines to proceed.");
      return;
    }

    setDispensing(true);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    try {
      const activePharm = getLivePharmacyDetails();
      const result = await billingFirebaseService.createInvoice({
        invoiceNumber,
        customer: {
          name: patientName.trim() || "Walk-in Patient",
          phone: patientPhone.trim() || "+91-XXXXXXXXXX",
        },
        doctor: {
          name: doctorName.trim() || "Consulting Physician",
          mciRegNo: "",
          clinic: "General Practice",
        },
        items: cart,
        totals,
        paymentMethod,
        pharmacistName: user?.name || "Chief Pharmacist",
        pharmacyName: activePharm.name || user?.pharmacy || "MediTrack Pharmacy & Health Store",
        pharmacyBranch: activePharm.branch || user?.branch || "Tiruvannamalai",
        pharmacyLicense: activePharm.license || user?.license || "TN/PH/2026/0892",
        pharmacyId: activePharm.pharmacyId || user?.pharmacyId || "DL-TN-CH-2024-0045",
      });

      if (result.ok) {
        // 1. Live inventory deduction across entire app
        deductCartFromInventory(cart);

        // 2. Automatically record patient visit in dedicated patients database
        if (patientPhone.trim()) {
          try {
            await patientsFirebaseService.recordVisit({
              name: patientName.trim() || "Walk-in Patient",
              phone: patientPhone.trim(),
              invoiceNumber,
              billAmount: totals.grandTotal,
              itemsCount: cart.length,
            });
          } catch (pErr) {
            console.debug("Patient record error:", pErr);
          }
        }

        setCompletedSale({
          ...result.sale,
          invoiceNumber,
          date: new Date().toLocaleDateString("en-IN"),
          time: new Date().toLocaleTimeString("en-IN"),
          pharmacyName: activePharm.name || user?.pharmacy || "MediTrack Pharmacy & Health Store",
          pharmacyBranch: activePharm.branch || user?.branch || "Tiruvannamalai",
          pharmacyLicense: activePharm.license || user?.license || "TN/PH/2026/0892",
        });

        toast.success(`Invoice ${invoiceNumber} generated & dispensed!`);
        setCart([]);
        setPatientName("");
        setPatientPhone("");
        setDoctorName("");
        setPatientVisitInfo(null);
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (err) {
      console.error("[Billing] Dispense failed:", err);
      toast.error("Failed to complete sale. Check network connection.");
    } finally {
      setDispensing(false);
    }
  };

  /* Print thermal / A4 receipt */
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm">
                <Receipt size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Retail POS & GST Billing
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automated Indian Tax Invoicing (HSN 3004) & CDSCO Schedule H Compliance
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("pos")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "pos"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Billing Counter
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Sales History
            </button>
            <button
              onClick={() => setActiveTab("schedule_h")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "schedule_h"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <ShieldCheck size={14} />
              <span>Schedule H Register</span>
            </button>
          </div>
        </div>

        {/* =====================================================
            VIEW 1: POS BILLING COUNTER
        ====================================================== */}
        {activeTab === "pos" && (
          <div className="grid lg:grid-cols-[62%_38%] gap-6">
            {/* Left: Product Lookup & Cart Items */}
            <div className="space-y-4">
              {/* Quick Search & Barcode Lookup */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs relative">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by common brand (e.g. Dolo 650, Calpol, Pan 40, Rexonac) or composition..."
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 transition"
                  />
                </div>

                {/* Dropdown Results */}
                {searchQuery.trim().length > 0 && (
                  <div className="absolute left-4 right-4 top-[64px] z-30 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[340px] overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((med) => (
                        <div
                          key={med.id}
                          onClick={() => handleAddToCart(med)}
                          className="p-3 hover:bg-teal-50/60 dark:hover:bg-teal-950/30 cursor-pointer flex items-center justify-between transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                              <Pill size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {med.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {med.generic ? `${med.generic} · ` : ""}Batch: {med.batch} · Shelf: {med.rack}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-3">
                            <p className="text-sm font-bold text-teal-600 dark:text-teal-400">
                              ₹{Number(med.price || 45).toFixed(2)}
                            </p>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                (med.stock || 0) < 50
                                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                              }`}
                            >
                              Stock: {med.stock || 0}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          No medicines found matching "{searchQuery}"
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Try searching by common brand name (e.g. Dolo 650, Calpol, Pan 40) or chemical composition (e.g. Paracetamol).
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>Dispensary Cart</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {cart.length} {cart.length === 1 ? "item" : "items"}
                    </span>
                  </h3>
                  {cart.length > 0 && (
                    <button
                      onClick={handleClearCart}
                      className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="py-16 text-center">
                    <Receipt size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No medicines in cart
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Search above or scan a medicine barcode to begin billing.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="py-3.5 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                              {item.name}
                            </p>
                            {item.schedule && item.schedule !== "OTC" ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-300/60">
                                Sched {item.schedule}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-300/60">
                                OTC
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.generic && <span className="text-teal-600 dark:text-teal-400 font-medium mr-1.5">{item.generic} ·</span>}
                            Batch: <span className="font-mono">{item.batch}</span> · Exp: {item.expiry} · HSN: {item.hsn}
                          </p>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-slate-800 dark:text-slate-100">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {/* Price & Remove */}
                        <div className="text-right shrink-0 min-w-[70px]">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            ₹{item.total.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-slate-400">₹{item.price} each</p>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Customer Info, Prescribing Doctor & Checkout */}
            <div className="space-y-4">
              {/* Schedule H Regulatory Alert Banner */}
              {hasScheduleHDrug && (
                <div className="p-3.5 rounded-xl border border-amber-300/80 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-xs">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div className="leading-relaxed">
                    <p className="font-bold">CDSCO Schedule H Prescription Mandate</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      Antibiotics/Restricted drugs detected. Doctor Name and MCI Reg No. are required for statutory register logging.
                    </p>
                  </div>
                </div>
              )}

              {/* Patient & Doctor Form */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Patient & Prescriber Details
                </h4>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Santhosh Kumar"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Patient Mobile Number
                    </label>
                    {patientVisitInfo && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        Visit #{patientVisitInfo.visitCount + 1} (Returning)
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500 font-mono"
                  />
                  {patientVisitInfo && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                      Existing patient recognized · Last visited on {patientVisitInfo.lastVisit}
                    </p>
                  )}
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Prescribing Doctor Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Dr. Rajesh Kumar / Self"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Payment Mode & Bill Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Payment & Tax Summary
                </h4>

                {/* Payment Option Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {["UPI / QR", "Cash", "Card"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMethod(mode)}
                      className={`h-9 rounded-lg text-xs font-semibold border transition ${
                        paymentMethod === mode
                          ? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-700 dark:text-teal-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Breakdown */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex justify-between">
                    <span>Taxable Value:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ₹{totals.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Central GST (CGST 6%):</span>
                    <span>₹{totals.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>State GST (SGST 6%):</span>
                    <span>₹{totals.sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Total Payable:</span>
                    <span className="text-teal-600 dark:text-teal-400">
                      ₹{totals.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Dispense & Print Button */}
                <button
                  onClick={handleDispenseSale}
                  disabled={dispensing || cart.length === 0}
                  className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-900/10 transition disabled:opacity-50 cursor-pointer"
                >
                  {dispensing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Dispensing & Syncing...</span>
                    </span>
                  ) : (
                    <>
                      <Receipt size={17} />
                      <span>Dispense & Generate Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            VIEW 2: SALES HISTORY
        ====================================================== */}
        {activeTab === "history" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">
              Recent Dispensed Invoices (Cloud Firestore)
            </h3>

            {invoices.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 text-center">
                No past transactions recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider text-left">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Items Count</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-teal-600">
                          {inv.invoiceNumber || inv.id}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {inv.customer?.name} ({inv.customer?.phone || "N/A"})
                        </td>
                        <td className="py-3 px-4">{inv.items?.length || 0} SKUs</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                            {inv.paymentMethod || "Cash"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          ₹{inv.totals?.grandTotal?.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setCompletedSale(inv);
                            }}
                            className="text-xs font-semibold text-teal-600 hover:underline cursor-pointer"
                          >
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            VIEW 3: STATUTORY CDSCO SCHEDULE H REGISTER
        ====================================================== */}
        {activeTab === "schedule_h" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-500" />
                  <span>Statutory Schedule H / H1 Drug Register</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Audit-ready compliance register under Rule 65 of Drugs and Cosmetics Rules 1945
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold transition"
              >
                <Printer size={15} />
                <span>Print Statutory Register</span>
              </button>
            </div>

            {scheduleHLogs.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 text-center">
                No Schedule H drugs have been dispensed yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200/60 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-left">
                    <tr>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Patient Name</th>
                      <th className="py-3 px-3">Prescribing Doctor</th>
                      <th className="py-3 px-3">Doctor MCI Reg No</th>
                      <th className="py-3 px-3">Drug Name</th>
                      <th className="py-3 px-3">Batch No</th>
                      <th className="py-3 px-3">Qty Dispensed</th>
                      <th className="py-3 px-3">Registered Pharmacist</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {scheduleHLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono">{log.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-100">
                          {log.patientName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          {log.doctorName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-700 dark:text-amber-400">
                          {log.doctorMciReg}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-100">
                          {log.medicineName}
                        </td>
                        <td className="py-2.5 px-3 font-mono">{log.batchNumber}</td>
                        <td className="py-2.5 px-3 font-bold">{log.quantityDispensed}</td>
                        <td className="py-2.5 px-3 text-slate-500">{log.dispensingPharmacist}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            PRINTABLE TAX INVOICE MODAL
        ====================================================== */}
        {completedSale && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setCompletedSale(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>

              {/* Printable Invoice Sheet */}
              <div id="print-section" className="space-y-4">
                <div className="text-center pb-3 border-b border-slate-200">
                  <h2 className="text-lg font-bold uppercase tracking-wide">
                    {completedSale.pharmacyName || pharmacyInfo.name || user?.pharmacy || "MediTrack Pharmacy & Health Store"}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Drug License: {completedSale.pharmacyLicense || pharmacyInfo.license || "TN/PH/2026/0892"} · GSTIN: 33AAAAA0000A1Z5
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {completedSale.pharmacyBranch || pharmacyInfo.branch || "Tiruvannamalai"}
                  </p>
                  <div className="mt-2 inline-block px-3 py-0.5 rounded bg-slate-100 text-xs font-bold text-slate-700">
                    RETAIL TAX INVOICE (CASH / UPI MEMO)
                  </div>
                </div>

                <div className="grid grid-cols-2 text-xs gap-2 pt-1">
                  <div>
                    <p className="text-slate-500">Invoice No: <strong className="text-slate-800">{completedSale.invoiceNumber}</strong></p>
                    <p className="text-slate-500">Date: {completedSale.date || new Date().toLocaleDateString("en-IN")}</p>
                    <p className="text-slate-500">Payment: <strong>{completedSale.paymentMethod || "UPI"}</strong></p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">Patient: <strong className="text-slate-800">{completedSale.customer?.name}</strong></p>
                  </div>
                </div>

                {/* Items List */}
                <table className="w-full text-xs mt-3 border-t border-b border-slate-200">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-left">
                      <th className="py-2">Item</th>
                      <th className="py-2">HSN</th>
                      <th className="py-2">Batch</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedSale.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 font-medium">{it.name}</td>
                        <td className="py-1.5 font-mono text-[10px]">{it.hsn || "3004"}</td>
                        <td className="py-1.5 font-mono text-[10px]">{it.batch}</td>
                        <td className="py-1.5 text-right font-bold">{it.quantity}</td>
                        <td className="py-1.5 text-right">₹{Number(it.unitPrice || it.price).toFixed(2)}</td>
                        <td className="py-1.5 text-right font-bold">₹{Number(it.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tax Breakdown */}
                <div className="space-y-1 text-xs pt-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Taxable Subtotal:</span>
                    <span>₹{completedSale.totals?.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Central GST (CGST 6%):</span>
                    <span>₹{completedSale.totals?.cgst?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>State GST (SGST 6%):</span>
                    <span>₹{completedSale.totals?.sgst?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="text-teal-700">₹{completedSale.totals?.grandTotal?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-400">
                  <div>
                    <p>Computer-generated invoice.</p>
                    <p>Medicines once sold cannot be taken back.</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-700">{completedSale.pharmacistName || "Chief Pharmacist"}</p>
                    <p>Registered Pharmacist Signature</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-3 border-t border-slate-100">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Print Tax Invoice (A4 / Thermal)</span>
                </button>
                <button
                  onClick={() => setCompletedSale(null)}
                  className="px-4 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
