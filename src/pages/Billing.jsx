import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  ScanLine,
  Download,
  MessageSquare,
  Send,
  Copy,
  ExternalLink,
  MessageCircle,
  Check,
  Clock,
  Keyboard,
  Zap,
  DollarSign,
  XCircle,
  X,
  Info,
  Lock,
} from "lucide-react";
import Navbar from "../components/dashboard/Navbar";
import QRCodeSVG from "../components/common/QRCodeSVG";
import { useAuth } from "../context/AuthContext";
import { inventoryFirebaseService } from "../services/inventoryFirebaseService";
import { billingFirebaseService } from "../services/billingFirebaseService";
import { patientsFirebaseService } from "../services/patientsFirebaseService";
import { deductCartFromInventory } from "../utils/inventoryDeduction";
import { checkDrugInteractions } from "../utils/drugInteractionChecker";
import defaultMedicines from "../data/catalogMedicines.json";
import PrescriptionScanner from "../components/prescriptions/PrescriptionScanner";

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
      const savedUpi = localStorage.getItem("meditrack_upi_id");
      const saved = localStorage.getItem("meditrack_pharmacy_details");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) {
          return {
            ...parsed,
            upiId: savedUpi || parsed.upiId || "meditrack@upi",
          };
        }
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
            upiId: savedUpi || u.upiId || "meditrack@upi",
          };
        }
      }
      if (savedUpi) {
        return {
          name: "MediTrack Pharmacy & Health Store",
          branch: "Tiruvannamalai",
          license: "TN/PH/2026/0892",
          pharmacyId: "DL-TN-CH-2024-0045",
          upiId: savedUpi,
        };
      }
    } catch (_) {}
  }
  return {
    name: "MediTrack Pharmacy & Health Store",
    branch: "Tiruvannamalai",
    license: "TN/PH/2026/0892",
    pharmacyId: "DL-TN-CH-2024-0045",
    upiId: "meditrack@upi",
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
  const isRegisterTab = ["day_close", "schedule_h", "refills"].includes(activeTab);
  const [registerSubTab, setRegisterSubTab] = useState(() =>
    ["day_close", "schedule_h", "refills"].includes(savedDraft?.activeTab)
      ? savedDraft.activeTab
      : "day_close"
  );

  // Multi-Cart State: supports multiple concurrent customer carts (Cart 1, Cart 2, etc.)
  const initialCartsData = useMemo(() => {
    if (savedDraft?.carts && Array.isArray(savedDraft.carts) && savedDraft.carts.length > 0) {
      const renumbered = savedDraft.carts.map((c, idx) => {
        const isDefaultPattern = !c.name || /^Cart\s*\d+$/i.test(c.name.trim());
        return {
          ...c,
          name: isDefaultPattern ? `Cart ${idx + 1}` : c.name,
        };
      });
      return {
        carts: renumbered,
        activeCartId: savedDraft.activeCartId || renumbered[0].id,
      };
    }
    if (savedDraft?.cart && Array.isArray(savedDraft.cart) && savedDraft.cart.length > 0) {
      return {
        carts: [
          {
            id: "cart-1",
            name: "Cart 1",
            cart: savedDraft.cart,
            patientName: savedDraft.patientName || "",
            patientPhone: savedDraft.patientPhone || "",
            doctorName: savedDraft.doctorName || "",
            paymentMethod: savedDraft.paymentMethod || "UPI / QR",
            patientVisitInfo: null,
          },
        ],
        activeCartId: "cart-1",
      };
    }
    return {
      carts: [
        {
          id: "cart-1",
          name: "Cart 1",
          cart: [],
          patientName: "",
          patientPhone: "",
          doctorName: "",
          paymentMethod: "UPI / QR",
          patientVisitInfo: null,
        },
      ],
      activeCartId: "cart-1",
    };
  }, [savedDraft]);

  const [carts, setCarts] = useState(initialCartsData.carts);
  const [activeCartId, setActiveCartId] = useState(initialCartsData.activeCartId);

  // Active Cart extraction & updaters
  const activeCart = useMemo(() => {
    return (
      carts.find((c) => c.id === activeCartId) ||
      carts[0] || {
        id: "cart-1",
        name: "Cart 1",
        cart: [],
        patientName: "",
        patientPhone: "",
        doctorName: "",
        paymentMethod: "UPI / QR",
        patientVisitInfo: null,
      }
    );
  }, [carts, activeCartId]);

  const cart = activeCart.cart || [];
  const patientName = activeCart.patientName || "";
  const patientPhone = activeCart.patientPhone || "";
  const doctorName = activeCart.doctorName || "";
  const paymentMethod = activeCart.paymentMethod || "UPI / QR";
  const patientVisitInfo = activeCart.patientVisitInfo || null;

  const updateActiveCart = useCallback(
    (updater) => {
      setCarts((prevCarts) =>
        prevCarts.map((c) => {
          if (c.id === activeCartId) {
            return typeof updater === "function" ? updater(c) : { ...c, ...updater };
          }
          return c;
        })
      );
    },
    [activeCartId]
  );

  const setCart = useCallback(
    (updater) => {
      setCarts((prevCarts) =>
        prevCarts.map((c) => {
          if (c.id === activeCartId) {
            const nextCart = typeof updater === "function" ? updater(c.cart || []) : updater;
            return { ...c, cart: nextCart };
          }
          return c;
        })
      );
    },
    [activeCartId]
  );

  const setPatientName = useCallback(
    (val) => {
      updateActiveCart((c) => ({
        ...c,
        patientName: typeof val === "function" ? val(c.patientName || "") : val,
      }));
    },
    [updateActiveCart]
  );

  const setPatientPhone = useCallback(
    (val) => {
      updateActiveCart((c) => ({
        ...c,
        patientPhone: typeof val === "function" ? val(c.patientPhone || "") : val,
      }));
    },
    [updateActiveCart]
  );

  const setDoctorName = useCallback(
    (val) => {
      updateActiveCart((c) => ({
        ...c,
        doctorName: typeof val === "function" ? val(c.doctorName || "") : val,
      }));
    },
    [updateActiveCart]
  );

  const setPaymentMethod = useCallback(
    (val) => {
      updateActiveCart((c) => ({
        ...c,
        paymentMethod: typeof val === "function" ? val(c.paymentMethod || "UPI / QR") : val,
      }));
    },
    [updateActiveCart]
  );

  const setPatientVisitInfo = useCallback(
    (val) => {
      updateActiveCart((c) => ({
        ...c,
        patientVisitInfo: typeof val === "function" ? val(c.patientVisitInfo) : val,
      }));
    },
    [updateActiveCart]
  );

  // Add a new Cart tab
  const handleAddNewCart = () => {
    const newNum = carts.length + 1;
    const newId = `cart-${Date.now()}`;
    const newCart = {
      id: newId,
      name: `Cart ${newNum}`,
      cart: [],
      patientName: "",
      patientPhone: "",
      doctorName: "",
      paymentMethod: "UPI / QR",
      patientVisitInfo: null,
    };
    setCarts((prev) => [...prev, newCart]);
    setActiveCartId(newId);
    toast.success(`New Cart created: Cart ${newNum}`);
  };

  // Close / Delete a Cart tab & auto-rename remaining carts
  const handleRemoveCart = (cartIdToRemove) => {
    if (carts.length <= 1) {
      handleClearCart();
      return;
    }
    const targetCart = carts.find((c) => c.id === cartIdToRemove);
    if (targetCart && targetCart.cart && targetCart.cart.length > 0) {
      if (
        !window.confirm(
          `"${targetCart.name || "This cart"}" has ${targetCart.cart.length} item(s). Close and delete it?`
        )
      ) {
        return;
      }
    }
    setCarts((prev) => {
      const remaining = prev.filter((c) => c.id !== cartIdToRemove);
      const renumbered = remaining.map((c, idx) => {
        const isDefaultPattern = !c.name || /^Cart\s*\d+$/i.test(c.name.trim());
        return {
          ...c,
          name: isDefaultPattern ? `Cart ${idx + 1}` : c.name,
        };
      });

      if (activeCartId === cartIdToRemove) {
        const removedIndex = prev.findIndex((c) => c.id === cartIdToRemove);
        const nextIndex = Math.min(
          Math.max(0, removedIndex),
          renumbered.length - 1
        );
        const nextActive = renumbered[nextIndex]?.id || renumbered[0]?.id || "cart-1";
        setActiveCartId(nextActive);
      }
      return renumbered;
    });
    toast.info(`${targetCart?.name || "Cart"} closed`);
  };

  // Invoices & Schedule H Register
  const [invoices, setInvoices] = useState([]);
  const [scheduleHLogs, setScheduleHLogs] = useState([]);
  const [dispensing, setDispensing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  // Smart Refill Reminders State
  const [refillReminders, setRefillReminders] = useState([]);
  const [refillFilter, setRefillFilter] = useState("all");
  const [selectedPreviewReminder, setSelectedPreviewReminder] = useState(null);
  const [previewLang, setPreviewLang] = useState("combined");

  // UPI QR Code State (visible by default when UPI / QR payment is selected)
  const [showUpiQr, setShowUpiQr] = useState(true);

  // Prescription OCR Modal State
  const [showRxScanner, setShowRxScanner] = useState(false);

  // Loose Tablet editing: stores itemId → loose qty string being typed
  const [looseQtyEdit, setLooseQtyEdit] = useState({}); // { [itemId]: "2" }

  // Clinical Drug-Drug Interaction (DDI) & Overdose Alerts State
  const [dismissedDdiAlerts, setDismissedDdiAlerts] = useState({});

  // Keyboard Shortcuts State
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Day-End Cash Register & Z-Report State
  const [openingCashFloat, setOpeningCashFloat] = useState(1000);
  const [physicalCashCount, setPhysicalCashCount] = useState("");
  const [showZReportPrintModal, setShowZReportPrintModal] = useState(false);
  const [closingDayNote, setClosingDayNote] = useState("");
  const [dayCloseSuccess, setDayCloseSuccess] = useState(false);

  const searchInputRef = useRef(null);

  /* Load Smart Refill Reminders */
  useEffect(() => {
    let cancelled = false;
    const fetchRefills = async () => {
      try {
        const list = await patientsFirebaseService.getRefillReminders();
        if (!cancelled && Array.isArray(list)) {
          setRefillReminders(list);
        }
      } catch (err) {
        console.debug("Refill list load error:", err);
      }
    };
    fetchRefills();

    window.addEventListener("meditrack_refills_updated", fetchRefills);
    return () => {
      cancelled = true;
      window.removeEventListener("meditrack_refills_updated", fetchRefills);
    };
  }, []);

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
      const hasAnyContent = carts.some(
        (c) =>
          (c.cart && c.cart.length > 0) ||
          c.patientName ||
          c.patientPhone ||
          c.doctorName
      );
      if (hasAnyContent || carts.length > 1) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            carts,
            activeCartId,
            activeTab,
          })
        );
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (e) {
      console.debug("Billing draft auto-save note:", e);
    }
  }, [carts, activeCartId, activeTab]);

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
    if (cart.length === 0 && !patientName && !patientPhone && !doctorName) return;
    if (window.confirm(`Clear all items from ${activeCart.name || "active cart"}?`)) {
      updateActiveCart({
        cart: [],
        patientName: "",
        patientPhone: "",
        doctorName: "",
        patientVisitInfo: null,
      });
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
  const handleAddToCart = (medicine, desiredQty = 1, instructions = "") => {
    if (!medicine || (medicine.stock || 0) <= 0) {
      toast.error(`${medicine?.name || "Item"} is currently out of stock`);
      return;
    }

    const qtyToAdd = Math.max(1, Math.min(Number(desiredQty) || 1, medicine.stock || 9999));

    setCart((prev) => {
      const existing = prev.find((it) => it.id === medicine.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + qtyToAdd, medicine.stock || 9999);
        return prev.map((it) =>
          it.id === medicine.id
            ? {
                ...it,
                quantity: nextQty,
                instructions: instructions || it.instructions,
                total: nextQty * it.price,
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
          quantity: qtyToAdd,
          instructions: instructions || "",
          total: qtyToAdd * Number(medicine.price || medicine.sellingPrice || 45),
        },
      ];
    });

    setSearchQuery("");
    toast.success(`Added ${qtyToAdd > 1 ? `${qtyToAdd}x ` : ""}${medicine.name}`);
  };

  /* =====================================================
     PRESCRIPTION OCR TO CART HANDLER
  ===================================================== */
  const handleRxScanResult = (result) => {
    if (!result) return;

    // 1. Auto-fill Patient Name & Doctor Name into active cart if available
    if (result.patient?.name) {
      setPatientName(result.patient.name);
    }
    if (result.doctor?.name) {
      setDoctorName(result.doctor.name);
    }

    const rxMeds = result.prescription?.medicines || [];
    if (!Array.isArray(rxMeds) || rxMeds.length === 0) {
      toast.info("Prescription processed. No medicine items detected.");
      return;
    }

    let addedCount = 0;
    const missing = [];

    rxMeds.forEach((rxItem) => {
      const rawName = String(rxItem.name || "").trim();
      if (!rawName) return;

      // Clean common medicine prefixes (Tab, Cap, Syrup, Syp, Inj, etc.)
      const cleanName = rawName
        .toLowerCase()
        .replace(/^(tab|cap|syrup|syp|inj|tablet|capsule|ointment|drop|drops)\.?\s+/i, "")
        .trim();

      // Search catalog (fuzzy match brand name or generic composition)
      const match = catalog.find((m) => {
        const mName = String(m.name || "").toLowerCase();
        const mGen = String(m.generic || "").toLowerCase();
        return (
          mName === cleanName ||
          mName.includes(cleanName) ||
          cleanName.includes(mName) ||
          (mGen && (mGen.includes(cleanName) || cleanName.includes(mGen)))
        );
      });

      if (match) {
        // Calculate dosage quantity from frequency and duration
        let calcQty = 10;
        const freqParts = String(rxItem.frequency || "").match(/\d+/g);
        const durationMatch = String(rxItem.duration || "").match(/\d+/);
        if (freqParts && durationMatch) {
          const perDay = freqParts.reduce((acc, v) => acc + parseInt(v, 10), 0);
          const days = parseInt(durationMatch[0], 10);
          if (perDay > 0 && days > 0) calcQty = Math.max(1, perDay * days);
        } else if (rxItem.dosage) {
          const doseMatch = String(rxItem.dosage).match(/\d+/);
          if (doseMatch) calcQty = Math.max(1, parseInt(doseMatch[0], 10));
        }

        const instructions = rxItem.instructions || rxItem.frequency || "";
        handleAddToCart(match, calcQty, instructions);
        addedCount++;
      } else {
        missing.push(rawName);
      }
    });

    if (addedCount > 0) {
      toast.success(
        `Prescription OCR added ${addedCount} medicine(s) to Dispensary Cart!`,
        { icon: "📋" }
      );
    }

    if (missing.length > 0) {
      toast.warning(
        `Not in stock / catalog: ${missing.join(", ")} (add manually or check substitutes)`,
        { duration: 6000 }
      );
    }
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
    setLooseQtyEdit((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  /* Loose Tablet Handler — lets pharmacist type exact count (e.g. 3 from a 10-tab strip) */
  const handleLooseQtyCommit = (id, rawValue) => {
    const parsed = parseFloat(rawValue);
    if (isNaN(parsed) || parsed <= 0) {
      // Revert to 1 if invalid
      setCart((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, quantity: 1, total: it.price } : it
        )
      );
    } else {
      setCart((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          const qty = Math.min(parsed, it.maxStock);
          return { ...it, quantity: qty, total: parseFloat((qty * it.price).toFixed(2)) };
        })
      );
    }
    // Remove from edit mode
    setLooseQtyEdit((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  /* Check if any drug in cart requires Schedule H prescription */
  const hasScheduleHDrug = useMemo(() => {
    return cart.some((it) => it.schedule && it.schedule !== "OTC");
  }, [cart]);

  /* =====================================================
     CLINICAL DRUG-DRUG INTERACTION (DDI) & OVERDOSE ENGINE
  ===================================================== */
  const ddiAlerts = useMemo(() => checkDrugInteractions(cart), [cart]);
  const activeDdiAlerts = useMemo(
    () => ddiAlerts.filter((a) => !dismissedDdiAlerts[a.id]),
    [ddiAlerts, dismissedDdiAlerts]
  );


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

  /* ─── UPI QR Code: generate Google Charts URL for GPay/PhonePe/Paytm ─────
     Placed AFTER totals so totals.grandTotal is available.
     UPI deep-link format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
  ─────────────────────────────────────────────────────────────────────── */
  const upiPaymentString = useMemo(() => {
    if (!totals || totals.grandTotal <= 0) return null;
    const vpa =
      (typeof window !== "undefined"
        ? localStorage.getItem("meditrack_upi_id")
        : "") ||
      pharmacyInfo?.upiId ||
      user?.upiId ||
      "meditrack@upi";
    const name = encodeURIComponent(
      pharmacyInfo?.name || user?.pharmacy || "MediTrack Pharmacy"
    );
    const note = encodeURIComponent("Medicine Bill Payment");
    return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${name}&am=${totals.grandTotal}&cu=INR&tn=${note}`;
  }, [totals, pharmacyInfo, user]);

  /* =====================================================
     DAY-END CASH REGISTER & STATUTORY Z-REPORT METRICS
  ===================================================== */
  const todayDateStr = useMemo(() => new Date().toLocaleDateString("en-IN"), []);

  const todayInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv.date) return false;
      return (
        inv.date === todayDateStr ||
        inv.date.includes(new Date().getFullYear().toString())
      );
    });
  }, [invoices, todayDateStr]);

  const zReportMetrics = useMemo(() => {
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let grandRevenue = 0;
    const medSalesMap = new Map();

    todayInvoices.forEach((inv) => {
      const amt = Number(inv.totals?.grandTotal || inv.total || 0);
      grandRevenue += amt;
      const method = (inv.paymentMethod || "Cash").toLowerCase();
      if (method.includes("cash")) cashTotal += amt;
      else if (method.includes("upi") || method.includes("qr")) upiTotal += amt;
      else if (method.includes("card")) cardTotal += amt;
      else cashTotal += amt;

      if (Array.isArray(inv.items)) {
        inv.items.forEach((it) => {
          const prev = medSalesMap.get(it.name) || { name: it.name, qty: 0, revenue: 0 };
          medSalesMap.set(it.name, {
            name: it.name,
            qty: prev.qty + (Number(it.quantity) || 1),
            revenue: prev.revenue + (Number(it.total) || 0),
          });
        });
      }
    });

    const topSellingMeds = Array.from(medSalesMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);

    const expectedCashInDrawer = openingCashFloat + cashTotal;
    const physicalCashNum = physicalCashCount !== "" ? Number(physicalCashCount) : null;
    const cashDiscrepancy =
      physicalCashNum !== null ? physicalCashNum - expectedCashInDrawer : 0;

    return {
      todayInvoicesCount: todayInvoices.length,
      cashTotal,
      upiTotal,
      cardTotal,
      grandRevenue,
      topSellingMeds,
      expectedCashInDrawer,
      cashDiscrepancy,
      isBalanced: physicalCashNum !== null && Math.abs(cashDiscrepancy) < 1,
    };
  }, [todayInvoices, openingCashFloat, physicalCashCount]);

  /* Handle Day-End Closing Archive */
  const handleSaveDayClose = () => {
    const record = {
      id: `Z-${Date.now().toString().slice(-6)}`,
      date: todayDateStr,
      closedAt: new Date().toLocaleTimeString("en-IN"),
      pharmacistName: user?.name || "Chief Pharmacist",
      metrics: zReportMetrics,
      openingFloat: openingCashFloat,
      physicalCash: physicalCashCount,
      notes: closingDayNote,
      timestamp: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem("meditrack_day_closings") || "[]");
      localStorage.setItem("meditrack_day_closings", JSON.stringify([record, ...existing]));
      setDayCloseSuccess(true);
      toast.success("Day shift closed & statutory Z-Report archived!");
      setTimeout(() => setDayCloseSuccess(false), 4000);
    } catch {
      toast.error("Failed to archive day closing");
    }
  };

  /* =====================================================
     KEYBOARD SHORTCUTS & SEARCH NAVIGATION (SPEED POS)
  ===================================================== */
  useEffect(() => {
    setSelectedSearchIdx(0);
  }, [searchQuery]);

  const handleSearchKeyDown = (e) => {
    if (searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIdx((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIdx((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[selectedSearchIdx]) {
        handleAddToCart(searchResults[selectedSearchIdx]);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Escape: clear search or close shortcut modal / previews
      if (e.key === "Escape") {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (showZReportPrintModal) {
          setShowZReportPrintModal(false);
          return;
        }
        if (selectedPreviewReminder) {
          setSelectedPreviewReminder(null);
          return;
        }
        if (completedSale) {
          setCompletedSale(null);
          return;
        }
        setSearchQuery("");
        return;
      }

      // 2. '/' or 'F1' to focus search (when not in an input)
      if (
        (e.key === "/" || e.key === "F1") &&
        e.target.tagName !== "INPUT" &&
        e.target.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setActiveTab("pos");
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return;
      }

      // 3. 'F2' or 'Ctrl + Enter' / 'Cmd + Enter' to dispense sale
      if (e.key === "F2" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
        e.preventDefault();
        if (activeTab === "pos") {
          if (cart.length > 0 && !dispensing) {
            handleDispenseSale();
          } else if (cart.length === 0) {
            toast.error("Cart is empty. Add medicines before dispensing.");
          }
        }
        return;
      }

      // 4. '?' to show keyboard shortcuts
      if (
        e.key === "?" &&
        e.target.tagName !== "INPUT" &&
        e.target.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTab,
    cart,
    dispensing,
    showShortcutsModal,
    showZReportPrintModal,
    selectedPreviewReminder,
    completedSale,
  ]);


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

          // 3. Automatically schedule 1-day-before Refill Reminders (Tamil & English)
          try {
            await patientsFirebaseService.recordRefillReminders({
              patientName: patientName.trim() || "Customer",
              patientPhone: patientPhone.trim(),
              items: cart,
              pharmacyName: activePharm.name || user?.pharmacy || "MediTrack Pharmacy & Health Store",
              branch: activePharm.branch || user?.branch || "Tiruvannamalai",
            });
            const freshRefills = await patientsFirebaseService.getRefillReminders();
            setRefillReminders(freshRefills);
          } catch (rErr) {
            console.debug("Refill schedule error:", rErr);
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
        if (carts.length > 1) {
          const remaining = carts.filter((c) => c.id !== activeCartId);
          const renumbered = remaining.map((c, idx) => {
            const isDefaultPattern = !c.name || /^Cart\s*\d+$/i.test(c.name.trim());
            return {
              ...c,
              name: isDefaultPattern ? `Cart ${idx + 1}` : c.name,
            };
          });
          const nextWithItems =
            renumbered.find((c) => c.cart && c.cart.length > 0) || renumbered[0];
          setCarts(renumbered);
          setActiveCartId(nextWithItems.id);
        } else {
          updateActiveCart({
            cart: [],
            patientName: "",
            patientPhone: "",
            doctorName: "",
            patientVisitInfo: null,
          });
        }
      }
    } catch (err) {
      console.error("[Billing] Dispense failed:", err);
      toast.error("Failed to complete sale. Check network connection.");
    } finally {
      setDispensing(false);
    }
  };

  /* Refill Reminders Handlers */
  const handleSendWhatsAppRefill = async (reminder, lang = previewLang) => {
    try {
      const msg =
        lang === "tamil"
          ? reminder.messages?.tamil
          : lang === "english"
          ? reminder.messages?.english
          : reminder.messages?.combined;
      const waLink = patientsFirebaseService.getWhatsAppRefillLink(
        reminder.patientPhone,
        msg || reminder.messages?.combined
      );
      window.open(waLink, "_blank");
      await patientsFirebaseService.markRefillSent(reminder.id);
      setRefillReminders((prev) =>
        prev.map((r) =>
          r.id === reminder.id ? { ...r, status: "sent", sentAt: new Date().toISOString() } : r
        )
      );
      toast.success(`WhatsApp reminder opened for ${reminder.patientName}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to open WhatsApp reminder");
    }
  };

  const handleCopyRefillSMS = (reminder, lang = previewLang) => {
    try {
      const msg =
        lang === "tamil"
          ? reminder.messages?.tamil
          : lang === "english"
          ? reminder.messages?.english
          : reminder.messages?.combined;
      navigator.clipboard.writeText(msg);
      toast.success("Refill reminder message copied to clipboard!");
    } catch {
      toast.error("Failed to copy message");
    }
  };

  const handleMarkRefilled = async (id) => {
    try {
      await patientsFirebaseService.markRefillCompleted(id);
      setRefillReminders((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "refilled", refilledAt: new Date().toISOString() } : r
        )
      );
      toast.success("Medicine marked as refilled by patient!");
    } catch {
      toast.error("Failed to update refill status");
    }
  };

  const handleDeleteReminder = async (id) => {
    try {
      await patientsFirebaseService.deleteRefill(id);
      setRefillReminders((prev) => prev.filter((r) => r.id !== id));
      toast.success("Reminder deleted");
    } catch {
      toast.error("Failed to delete reminder");
    }
  };

  const dueSoonCount = useMemo(() => {
    return refillReminders.filter(
      (r) => r.status === "pending" && (r.isDue || r.daysRemaining <= 1)
    ).length;
  }, [refillReminders]);

  const filteredRefills = useMemo(() => {
    return refillReminders.filter((r) => {
      if (refillFilter === "all") return true;
      if (refillFilter === "due_soon")
        return r.status === "pending" && (r.isDue || r.daysRemaining <= 1);
      if (refillFilter === "pending") return r.status === "pending";
      if (refillFilter === "sent") return r.status === "sent";
      if (refillFilter === "refilled") return r.status === "refilled";
      return true;
    });
  }, [refillReminders, refillFilter]);

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

          {/* Streamlined Primary POS Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab("pos")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "pos"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Billing Counter
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Sales History
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab(registerSubTab || "day_close");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isRegisterTab
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ShieldCheck size={14} />
              <span>Registers & Compliance</span>
              {dueSoonCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {dueSoonCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* =====================================================
            REGISTERS & COMPLIANCE SECONDARY SUB-NAVIGATION
        ====================================================== */}
        {isRegisterTab && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 mb-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("day_close");
                  setRegisterSubTab("day_close");
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "day_close"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Clock size={14} />
                <span>Day-End Register (Z-Report)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("schedule_h");
                  setRegisterSubTab("schedule_h");
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "schedule_h"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <ShieldCheck size={14} />
                <span>CDSCO Schedule H Register</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("refills");
                  setRegisterSubTab("refills");
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "refills"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <MessageSquare size={14} />
                <span>Smart Refills (தமிழ் & EN)</span>
                {dueSoonCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {dueSoonCount} due
                  </span>
                )}
              </button>
            </div>

            <div className="text-[11px] text-slate-400 px-2 flex items-center gap-1.5">
              <span>Shortcuts configured in</span>
              <a
                href="/settings?tab=shortcuts"
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-0.5"
              >
                Settings →
              </a>
            </div>
          </div>
        )}

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
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search by common brand (e.g. Dolo 650, Calpol, Pan 40) or composition... (Press /)"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 transition"
                  />
                </div>

                {/* Keyboard Shortcut Hints Bar */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2 px-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        /
                      </kbd>
                      <span>Focus Search</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        ↓↑
                      </kbd>
                      <span>Navigate</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Enter
                      </kbd>
                      <span>Add to Cart</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium">
                    <kbd className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 font-mono text-[10px] border border-teal-200 dark:border-teal-800 font-bold">
                      F2
                    </kbd>
                    <span>Dispense & Bill</span>
                  </div>
                </div>

                {/* Dropdown Results */}
                {searchQuery.trim().length > 0 && (
                  <div className="absolute left-4 right-4 top-[84px] z-30 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[340px] overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((med, idx) => {
                        const isSelected = idx === selectedSearchIdx;
                        return (
                          <div
                            key={med.id}
                            onClick={() => handleAddToCart(med)}
                            className={`p-3 cursor-pointer flex items-center justify-between transition ${
                              isSelected
                                ? "bg-teal-50 dark:bg-teal-950/80 border-l-4 border-teal-500 pl-2.5"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "bg-teal-600 text-white"
                                    : "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400"
                                }`}
                              >
                                <Pill size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                  <span>{med.name}</span>
                                  {isSelected && (
                                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-200">
                                      Press Enter ↵
                                    </span>
                                  )}
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
                        );
                      })
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
                {/* Clinical Drug-Drug Interaction & Overdose Alert Banner */}
                {activeDdiAlerts.length > 0 && (
                  <div className="mb-4 space-y-2.5">
                    {activeDdiAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 shadow-xs ${
                          alert.severity === "CRITICAL"
                            ? "bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-950 dark:text-red-200"
                            : alert.severity === "HIGH"
                            ? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200"
                            : "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center font-bold text-xs ${
                              alert.severity === "CRITICAL" || alert.severity === "HIGH"
                                ? "bg-red-600 text-white animate-pulse"
                                : "bg-amber-500 text-white"
                            }`}
                          >
                            !
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs uppercase tracking-wide">
                                ⚠️ {alert.title}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/80 dark:bg-slate-900 border border-current">
                                {alert.severity}
                              </span>
                            </div>
                            <p className="mt-1 font-medium leading-relaxed">{alert.messageEn}</p>
                            <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed font-sans">{alert.messageTa}</p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            setDismissedDdiAlerts((prev) => ({ ...prev, [alert.id]: true }))
                          }
                          className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                          title="Override warning after verifying doctor's prescription"
                        >
                          Verified ✓
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 shrink-0">
                      Dispensary Cart
                    </span>

                    {/* Cart Tabs Pill Bar */}
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5 scrollbar-none">
                      {carts.map((c, idx) => {
                        const isActive = c.id === activeCartId;
                        const count = (c.cart || []).length;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setActiveCartId(c.id)}
                            className={`group flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer select-none shrink-0 ${
                              isActive
                                ? "bg-teal-600 text-white shadow-xs ring-2 ring-teal-600/30"
                                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <span>{c.name || `Cart ${idx + 1}`}</span>
                            {c.patientName && (
                              <span
                                className={`text-[10px] max-w-[70px] truncate ${
                                  isActive ? "text-teal-100" : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                • {c.patientName}
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                isActive
                                  ? "bg-teal-700 text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {count}
                            </span>
                            {carts.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCart(c.id);
                                }}
                                className={`ml-0.5 rounded-full p-0.5 hover:bg-black/20 dark:hover:bg-white/20 transition ${
                                  isActive ? "text-white" : "text-slate-400 hover:text-rose-500"
                                }`}
                                title="Close this cart"
                              >
                                <X size={11} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Cart Button (+) */}
                      <button
                        type="button"
                        onClick={handleAddNewCart}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-teal-500/60 hover:border-teal-500 bg-teal-50/60 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs"
                        title="Create another cart for a parallel customer (+)"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                        <span>New Cart</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setShowRxScanner(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/70 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-semibold transition shadow-2xs cursor-pointer"
                      title="Upload or scan doctor prescription (OCR) to automatically populate medicines into this cart"
                    >
                      <ScanLine size={13} strokeWidth={2.5} />
                      <span>Scan Rx (OCR)</span>
                    </button>

                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {cart.length} {cart.length === 1 ? "item" : "items"}
                    </span>
                    {cart.length > 0 && (
                      <button
                        onClick={handleClearCart}
                        className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="py-16 text-center">
                    <Receipt size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No medicines in {activeCart.name || "cart"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      Search above or scan a prescription to auto-fill medicines.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowRxScanner(true)}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-semibold transition cursor-pointer shadow-2xs"
                    >
                      <ScanLine size={14} />
                      <span>Scan Prescription (OCR)</span>
                    </button>
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

                        {/* Quantity Stepper + Loose Tablet Input */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
                          >
                            <Minus size={13} />
                          </button>

                          {/* Click qty to enter loose / fractional amount */}
                          {looseQtyEdit[item.id] !== undefined ? (
                            <input
                              autoFocus
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={looseQtyEdit[item.id]}
                              onChange={(e) =>
                                setLooseQtyEdit((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              onBlur={(e) =>
                                handleLooseQtyCommit(item.id, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleLooseQtyCommit(item.id, e.target.value);
                                if (e.key === "Escape") {
                                  setLooseQtyEdit((prev) => {
                                    const n = { ...prev };
                                    delete n[item.id];
                                    return n;
                                  });
                                }
                              }}
                              className="w-14 h-7 text-center text-xs font-bold rounded-lg border-2 border-teal-500 bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 outline-none"
                            />
                          ) : (
                            <button
                              onClick={() =>
                                setLooseQtyEdit((prev) => ({
                                  ...prev,
                                  [item.id]: String(item.quantity),
                                }))
                              }
                              title="Click to enter loose / partial tablet count"
                              className="w-12 h-7 text-center text-sm font-bold text-slate-800 dark:text-slate-100 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 border border-transparent hover:border-teal-300 transition"
                            >
                              {Number.isInteger(item.quantity)
                                ? item.quantity
                                : item.quantity.toFixed(1)}
                            </button>
                          )}

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
                          <p className="text-[10px] text-slate-400">
                            ₹{item.price}/tab
                          </p>
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
                    placeholder=""
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

                {/* ── Dynamic UPI QR Code ─────────────────────────── */}
                {paymentMethod === "UPI / QR" && cart.length > 0 && (
                  <div className="border border-teal-200 dark:border-teal-800 rounded-xl overflow-hidden">
                    {/* Header toggle */}
                    <button
                      onClick={() => setShowUpiQr((v) => !v)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 text-xs font-bold transition"
                    >
                      <span className="flex items-center gap-2">
                        <QrCode size={15} />
                        <span>GPay / PhonePe / Paytm QR  — ₹{totals.grandTotal}</span>
                      </span>
                      <span className="text-teal-500 text-[11px]">
                        {showUpiQr ? "▲ Hide" : "▼ Show"}
                      </span>
                    </button>

                    {showUpiQr && (
                      <div className="p-4 bg-white dark:bg-slate-900 flex flex-col items-center gap-3">
                        {upiPaymentString ? (
                          <>
                            <div className="p-2 rounded-xl border-2 border-teal-400 bg-white shadow-md">
                              <QRCodeSVG
                                value={upiPaymentString}
                                size={160}
                                title={`UPI QR for ₹${totals.grandTotal}`}
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-black text-teal-700 dark:text-teal-300">
                                ₹{totals.grandTotal}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Scan with any UPI app to pay
                              </p>
                              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {pharmacyInfo?.upiId || (typeof window !== "undefined" && localStorage.getItem("meditrack_upi_id")) || user?.upiId || "meditrack@upi"}
                              </p>
                            </div>
                            <div className="flex gap-2 w-full">
                              
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400">
                            Add items to cart to generate dynamic payment QR
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
            VIEW 4: SMART BILINGUAL REFILL REMINDERS (1-DAY PRIOR)
        ====================================================== */}
        {activeTab === "refills" && (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Due In 24 Hours
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                    !
                  </span>
                </div>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
                  {dueSoonCount}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  1-day alert window active
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Total Tracked Patients
                  </span>
                  <Package size={16} className="text-teal-500" />
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">
                  {refillReminders.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scheduled refill records
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    WhatsApp Sent
                  </span>
                  <MessageCircle size={16} className="text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  {refillReminders.filter((r) => r.status === "sent").length}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Reminders dispatched
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Successfully Refilled
                  </span>
                  <CheckCircle2 size={16} className="text-teal-500" />
                </div>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-2">
                  {refillReminders.filter((r) => r.status === "refilled").length}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Retained customer sales
                </p>
              </div>
            </div>

            {/* Main Content & Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <MessageSquare size={18} className="text-teal-600 dark:text-teal-400" />
                    <span>Patient Medication Exhaustion & Refill Registry</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Send 1-click WhatsApp alerts in தமிழ் & English or copy SMS notifications directly.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setRefillFilter("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      refillFilter === "all"
                        ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    All ({refillReminders.length})
                  </button>
                  <button
                    onClick={() => setRefillFilter("due_soon")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      refillFilter === "due_soon"
                        ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <span>Due Soon (1-Day)</span>
                    {dueSoonCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </button>
                  <button
                    onClick={() => setRefillFilter("pending")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      refillFilter === "pending"
                        ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Pending ({refillReminders.filter((r) => r.status === "pending").length})
                  </button>
                  <button
                    onClick={() => setRefillFilter("sent")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      refillFilter === "sent"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Sent ({refillReminders.filter((r) => r.status === "sent").length})
                  </button>
                  <button
                    onClick={() => setRefillFilter("refilled")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      refillFilter === "refilled"
                        ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Refilled ({refillReminders.filter((r) => r.status === "refilled").length})
                  </button>
                </div>
              </div>

              {/* Table */}
              {filteredRefills.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600 mx-auto flex items-center justify-center mb-3">
                    <MessageSquare size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Refill Schedules Found
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    When you bill medicines with a customer phone number at the POS counter, 1-day prior refill schedules are automatically created here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider text-left">
                      <tr>
                        <th className="py-3 px-4">Patient & Phone</th>
                        <th className="py-3 px-4">Dispensed Medicine</th>
                        <th className="py-3 px-4">Units / Dosage Days</th>
                        <th className="py-3 px-4">Purchased On</th>
                        <th className="py-3 px-4">Finishes On</th>
                        <th className="py-3 px-4">Refill Status</th>
                        <th className="py-3 px-4 text-right">Quick Dispatch (தமிழ் & EN)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRefills.map((rem) => {
                        const isFinishingTomorrow = rem.daysRemaining === 1 || rem.daysRemaining === 0;
                        const isOverdue = rem.daysRemaining < 0 && rem.status !== "refilled";

                        return (
                          <tr
                            key={rem.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                              isFinishingTomorrow && rem.status === "pending"
                                ? "bg-rose-50/40 dark:bg-rose-950/10"
                                : ""
                            }`}
                          >
                            {/* Patient Info */}
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-800 dark:text-slate-100">
                                {rem.patientName}
                              </p>
                              <a
                                href={`tel:${rem.patientPhone}`}
                                className="font-mono text-[11px] text-teal-600 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <Phone size={10} />
                                <span>{rem.patientPhone}</span>
                              </a>
                            </td>

                            {/* Medicine */}
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {rem.medicineName}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                Regular Chronic Cycle
                              </span>
                            </td>

                            {/* Quantity & Estimated Course */}
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {rem.quantity} units
                              </span>
                              <p className="text-[10px] text-slate-400">
                                ~{rem.durationDays || rem.quantity} days supply
                              </p>
                            </td>

                            {/* Purchased Date */}
                            <td className="py-3 px-4 text-slate-500">
                              {rem.purchaseDateStr || "Recent"}
                            </td>

                            {/* Refill Due Date & Days left */}
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {rem.refillDueDateStr}
                              </p>
                              <div className="mt-1">
                                {rem.status === "refilled" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-400 px-2 py-0.5 rounded-full">
                                    <Check size={10} />
                                    <span>Refilled</span>
                                  </span>
                                ) : isFinishingTomorrow ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-950/80 dark:text-rose-300 px-2 py-0.5 rounded-full animate-pulse">
                                    Runs out tomorrow! (1-day alert)
                                  </span>
                                ) : isOverdue ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                    Medicine finished ({Math.abs(rem.daysRemaining)}d ago)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    In {rem.daysRemaining} days
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4">
                              {rem.status === "sent" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-0.5 rounded-full">
                                  <MessageCircle size={10} />
                                  <span>WhatsApp Sent</span>
                                </span>
                              ) : rem.status === "refilled" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-400 px-2.5 py-0.5 rounded-full">
                                  <Check size={10} />
                                  <span>Cycle Done</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 px-2.5 py-0.5 rounded-full">
                                  <span>Awaiting Dispatch</span>
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Send WhatsApp Click */}
                                <button
                                  onClick={() => handleSendWhatsAppRefill(rem, "combined")}
                                  title="Send WhatsApp Alert (Tamil & English)"
                                  className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                                >
                                  <MessageCircle size={12} />
                                  <span>WhatsApp</span>
                                </button>

                                {/* Preview & Choose Language */}
                                <button
                                  onClick={() => setSelectedPreviewReminder(rem)}
                                  title="Preview & Customize Tamil/English Message"
                                  className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
                                >
                                  <ExternalLink size={13} />
                                </button>

                                {/* Copy Message */}
                                <button
                                  onClick={() => handleCopyRefillSMS(rem, "combined")}
                                  title="Copy SMS Message"
                                  className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
                                >
                                  <Copy size={13} />
                                </button>

                                {/* Mark Refilled */}
                                {rem.status !== "refilled" && (
                                  <button
                                    onClick={() => handleMarkRefilled(rem.id)}
                                    title="Mark as Refilled"
                                    className="h-7 w-7 rounded-lg border border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center transition cursor-pointer"
                                  >
                                    <Check size={13} />
                                  </button>
                                )}

                                {/* Delete */}
                                <button
                                  onClick={() => handleDeleteReminder(rem.id)}
                                  title="Remove reminder"
                                  className="h-7 w-7 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================
            VIEW 5: DAY-END CASH REGISTER & STATUTORY Z-REPORT
        ====================================================== */}
        {activeTab === "day_close" && (
          <div className="space-y-6">
            {/* Top Gradient Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider">
                    Statutory Day-End Close
                  </span>
                  <span className="text-xs text-teal-200">
                    Date: {todayDateStr}
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight">
                  Daily Cash Drawer Closing & Z-Report (கடை கணக்கு முடிவு)
                </h2>
                <p className="text-xs text-teal-100/90 mt-1 max-w-xl">
                  Reconcile physical cash drawer with system sales, verify UPI settlements, and generate official audit Z-Reports.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowZReportPrintModal(true)}
                  className="px-4 h-10 rounded-xl bg-white text-teal-900 font-bold text-xs flex items-center justify-center gap-2 hover:bg-teal-50 transition shadow-sm cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Print Official Z-Report</span>
                </button>
                <button
                  onClick={handleSaveDayClose}
                  className="px-4 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                >
                  <Lock size={15} />
                  <span>Archive & Close Shift</span>
                </button>
              </div>
            </div>

            {dayCloseSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Shift Closed & Archived Successfully!</p>
                  <p className="text-[11px] mt-0.5">
                    Official Z-Report saved to permanent audit ledger. Safe to power down POS counter.
                  </p>
                </div>
              </div>
            )}

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Gross Sales Today
                  </span>
                  <DollarSign size={16} className="text-teal-600 dark:text-teal-400" />
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  ₹{zReportMetrics.grandRevenue.toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Across {zReportMetrics.todayInvoicesCount} dispensed bills
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Cash in Till
                  </span>
                  <Banknote size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  ₹{zReportMetrics.cashTotal.toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Physical currency collection
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    UPI / QR Received
                  </span>
                  <QrCode size={16} className="text-teal-600 dark:text-teal-400" />
                </div>
                <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-2">
                  ₹{zReportMetrics.upiTotal.toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  GPay, PhonePe, Paytm QR
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Card / POS Machine
                  </span>
                  <CreditCard size={16} className="text-sky-600 dark:text-sky-400" />
                </div>
                <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
                  ₹{zReportMetrics.cardTotal.toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Debit / Credit swipe terminal
                </p>
              </div>
            </div>

            {/* Physical Cash Drawer Reconciliation Panel */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <Banknote size={18} className="text-teal-600 dark:text-teal-400" />
                <span>Physical Till Reconciliation (கல்லாப்பண கணக்கீடு)</span>
              </h3>

              <div className="grid md:grid-cols-3 gap-6 items-center">
                {/* 1. Opening Cash Float */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Opening Cash Float (சில்லறை இருப்பு)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={openingCashFloat}
                      onChange={(e) => setOpeningCashFloat(Number(e.target.value) || 0)}
                      placeholder="1000"
                      className="w-full h-11 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Change given at counter opening
                  </p>
                </div>

                {/* 2. Physical Cash Counted */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Physical Cash Counted in Drawer (எண்ணிய பணம்)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={physicalCashCount}
                      onChange={(e) => setPhysicalCashCount(e.target.value)}
                      placeholder={`Expected: ₹${zReportMetrics.expectedCashInDrawer.toFixed(0)}`}
                      className="w-full h-11 pl-8 pr-3 rounded-xl border-2 border-teal-500 bg-teal-50/40 dark:bg-teal-950/40 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                  <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                    Expected in Till: ₹{zReportMetrics.expectedCashInDrawer.toFixed(2)}
                  </p>
                </div>

                {/* 3. Discrepancy Status */}
                <div className="p-4 rounded-xl border flex flex-col justify-center h-full bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Till Balancing Audit
                  </span>
                  {physicalCashCount === "" ? (
                    <p className="text-xs text-slate-400 mt-1">
                      Enter physical cash counted above to audit variance.
                    </p>
                  ) : zReportMetrics.isBalanced ? (
                    <div className="mt-1 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <CheckCircle2 size={18} />
                      <span>Perfect Match (₹0.00 Variance)</span>
                    </div>
                  ) : zReportMetrics.cashDiscrepancy < 0 ? (
                    <div className="mt-1 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                      <AlertTriangle size={18} />
                      <span>Shortage: -₹{Math.abs(zReportMetrics.cashDiscrepancy).toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                      <Info size={18} />
                      <span>Excess: +₹{zReportMetrics.cashDiscrepancy.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fast Moving Drugs & Invoices List */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Fast Moving Medicines */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">
                  Top Dispensed Medicines Today
                </h4>
                {zReportMetrics.topSellingMeds.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No medicine sales dispensed yet today.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {zReportMetrics.topSellingMeds.map((med, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-500">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {med.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-teal-600 dark:text-teal-400">
                            {med.qty} units
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2">
                            (₹{med.revenue.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Today's Invoices List */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">
                  Today's Invoices Audit Log ({todayInvoices.length})
                </h4>
                {todayInvoices.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No sales invoices logged for today yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-slate-400 border-b border-slate-100 dark:border-slate-800 text-left sticky top-0 bg-white dark:bg-slate-900">
                        <tr>
                          <th className="py-2">Invoice</th>
                          <th className="py-2">Patient</th>
                          <th className="py-2">Mode</th>
                          <th className="py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {todayInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2 font-mono font-bold text-teal-600">
                              {inv.invoiceNumber || inv.id}
                            </td>
                            <td className="py-2 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                              {inv.customer?.name || "Walk-in"}
                            </td>
                            <td className="py-2">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                                {inv.paymentMethod || "Cash"}
                              </span>
                            </td>
                            <td className="py-2 text-right font-bold text-slate-900 dark:text-white">
                              ₹{Number(inv.totals?.grandTotal || inv.total || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            BILINGUAL MESSAGE PREVIEW & DISPATCH MODAL
        ====================================================== */}
        {selectedPreviewReminder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
              <button
                onClick={() => setSelectedPreviewReminder(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Refill Reminder Dispatch (நினைவூட்டல் செய்தி)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Patient: {selectedPreviewReminder.patientName} ({selectedPreviewReminder.patientPhone})
                  </p>
                </div>
              </div>

              {/* Language Selection Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 text-xs font-semibold">
                <button
                  onClick={() => setPreviewLang("combined")}
                  className={`py-1.5 rounded-lg transition ${
                    previewLang === "combined"
                      ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  English + தமிழ்
                </button>
                <button
                  onClick={() => setPreviewLang("tamil")}
                  className={`py-1.5 rounded-lg transition ${
                    previewLang === "tamil"
                      ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  தமிழ் மட்டும்
                </button>
                <button
                  onClick={() => setPreviewLang("english")}
                  className={`py-1.5 rounded-lg transition ${
                    previewLang === "english"
                      ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  English Only
                </button>
              </div>

              {/* Simulated WhatsApp Chat Bubble */}
              <div className="bg-[#efeae2] dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 font-sans">
                <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg rounded-tl-none p-3 shadow-xs text-xs whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto font-sans">
                  {previewLang === "tamil"
                    ? selectedPreviewReminder.messages?.tamil
                    : previewLang === "english"
                    ? selectedPreviewReminder.messages?.english
                    : selectedPreviewReminder.messages?.combined}
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 px-1">
                  <span>Target: +91 {selectedPreviewReminder.patientPhone}</span>
                  <span>1-Day Prior Alert</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    handleSendWhatsAppRefill(selectedPreviewReminder, previewLang);
                    setSelectedPreviewReminder(null);
                  }}
                  className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>Send on WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    handleCopyRefillSMS(selectedPreviewReminder, previewLang);
                  }}
                  className="px-4 h-10 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Copy size={14} />
                  <span>Copy Message</span>
                </button>

                <button
                  onClick={() => setSelectedPreviewReminder(null)}
                  className="px-3 h-10 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
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

                {/* Printable UPI QR Code on Bill Slip */}
                {completedSale.paymentMethod?.includes("UPI") && (
                  <div className="py-2.5 px-3 rounded-xl border border-dashed border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/30 flex items-center justify-between gap-3 text-left">
                    <div>
                      <p className="text-[11px] font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                        <QrCode size={13} className="text-teal-600" />
                        <span>Scan & Pay via GPay / PhonePe / Paytm</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        VPA: {pharmacyInfo?.upiId || user?.upiId || localStorage.getItem("meditrack_upi_id") || "meditrack@upi"}
                      </p>
                      <p className="text-xs text-teal-700 dark:text-teal-300 font-black mt-1">
                        Amount: ₹{Number(completedSale.totals?.grandTotal || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="shrink-0 p-1 bg-white border border-teal-200 rounded-lg shadow-2xs">
                      <QRCodeSVG
                        value={`upi://pay?pa=${pharmacyInfo?.upiId || user?.upiId || localStorage.getItem("meditrack_upi_id") || "meditrack@upi"}&pn=${encodeURIComponent(
                          completedSale.pharmacyName || "Pharmacy"
                        )}&am=${completedSale.totals?.grandTotal}&cu=INR&tn=${encodeURIComponent(
                          completedSale.invoiceNumber || "Bill"
                        )}`}
                        size={64}
                        title="UPI Receipt QR"
                      />
                    </div>
                  </div>
                )}

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

        {/* =====================================================
            KEYBOARD SHORTCUTS CHEAT-SHEET MODAL
        ====================================================== */}
        {showShortcutsModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Keyboard size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    POS Speed Billing Keyboard Shortcuts
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    High-speed mouse-free retail pharmacy checkout
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Focus Search Bar</span>
                  <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                    / or F1
                  </kbd>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Navigate Search Results</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                      ↑
                    </kbd>
                    <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                      ↓
                    </kbd>
                  </div>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Add Selected Item to Cart</span>
                  <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                    Enter
                  </kbd>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Dispense & Generate Bill</span>
                  <div className="flex gap-1.5 items-center">
                    <kbd className="px-2 py-1 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono text-[11px] font-bold border border-teal-200 dark:border-teal-800">
                      F2
                    </kbd>
                    <span className="text-slate-400">or</span>
                    <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                      Ctrl + Enter
                    </kbd>
                  </div>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Close Modal / Clear Search</span>
                  <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                    Esc
                  </kbd>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Open Shortcuts Cheat-Sheet</span>
                  <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                    ?
                  </kbd>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <a
                  href="/settings?tab=shortcuts"
                  className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  Configure in Settings →
                </a>
                <button
                  onClick={() => setShowShortcutsModal(false)}
                  className="px-4 h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition"
                >
                  Got it (Esc)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            PRINTABLE STATUTORY Z-REPORT MODAL
        ====================================================== */}
        {showZReportPrintModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowZReportPrintModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>

              {/* Printable Z-Report Sheet */}
              <div id="print-section" className="space-y-4 font-mono text-xs">
                <div className="text-center pb-3 border-b-2 border-dashed border-slate-300 font-sans">
                  <h2 className="text-lg font-black uppercase tracking-wide">
                    {pharmacyInfo.name || user?.pharmacy || "MediTrack Pharmacy & Health Store"}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {pharmacyInfo.branch || "Tiruvannamalai"} · Lic: {pharmacyInfo.license || "TN/PH/2026/0892"}
                  </p>
                  <div className="mt-2 inline-block px-3 py-1 rounded bg-slate-100 text-xs font-black tracking-wider uppercase text-slate-800">
                    DAILY REGISTER CLOSING SUMMARY (Z-REPORT)
                  </div>
                </div>

                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Z-Report No:</span>
                    <strong className="text-slate-900 font-mono">Z-{todayDateStr.replace(/\//g, "")}-001</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span>{todayDateStr} · {new Date().toLocaleTimeString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pharmacist on Duty:</span>
                    <strong className="text-slate-800">{user?.name || "Chief Pharmacist"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Invoices Dispensed:</span>
                    <strong>{zReportMetrics.todayInvoicesCount} Bills</strong>
                  </div>
                </div>

                {/* Sales Mode Breakdown */}
                <div className="border-t border-b border-dashed border-slate-300 py-2.5 space-y-1.5">
                  <div className="flex justify-between text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <span>Payment Mode</span>
                    <span>Collection</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1. Cash In Till:</span>
                    <span className="font-bold">₹{zReportMetrics.cashTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2. UPI / QR Settlements:</span>
                    <span className="font-bold">₹{zReportMetrics.upiTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3. Card / POS Swipes:</span>
                    <span className="font-bold">₹{zReportMetrics.cardTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                    <span>GROSS DAY SALES:</span>
                    <span className="text-teal-700">₹{zReportMetrics.grandRevenue.toFixed(2)}</span>
                  </div>
                </div>

                {/* Cash Drawer Reconciliation */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                  <p className="font-bold text-[11px] text-slate-800 uppercase tracking-wider font-sans">
                    Cash Till Reconciliation Audit
                  </p>
                  <div className="flex justify-between">
                    <span>Opening Float:</span>
                    <span>₹{openingCashFloat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Today Cash Dispensed:</span>
                    <span>+ ₹{zReportMetrics.cashTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1">
                    <span>Expected Cash in Till:</span>
                    <span>₹{zReportMetrics.expectedCashInDrawer.toFixed(2)}</span>
                  </div>
                  {physicalCashCount !== "" && (
                    <>
                      <div className="flex justify-between font-bold">
                        <span>Actual Physical Count:</span>
                        <span>₹{Number(physicalCashCount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-black text-[12px] pt-1 border-t border-slate-200">
                        <span>Reconciliation Variance:</span>
                        <span className={zReportMetrics.isBalanced ? "text-emerald-600" : zReportMetrics.cashDiscrepancy < 0 ? "text-rose-600" : "text-sky-600"}>
                          {zReportMetrics.isBalanced
                            ? "₹0.00 (Balanced)"
                            : `${zReportMetrics.cashDiscrepancy < 0 ? "-" : "+"}₹${Math.abs(zReportMetrics.cashDiscrepancy).toFixed(2)}`}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Fast Moving Drugs Summary */}
                {zReportMetrics.topSellingMeds.length > 0 && (
                  <div className="border-t border-dashed border-slate-300 pt-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Top Dispensed Drugs
                    </p>
                    <div className="space-y-1 text-[11px]">
                      {zReportMetrics.topSellingMeds.slice(0, 4).map((m, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{m.name}</span>
                          <span className="font-bold">{m.qty} tabs (₹{m.revenue.toFixed(0)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t-2 border-dashed border-slate-300 flex justify-between items-end font-sans text-[11px] text-slate-500">
                  <div>
                    <p>Statutory CDSCO Record.</p>
                    <p>Preserve in pharmacy register.</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{user?.name || "Chief Pharmacist"}</p>
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
                  <span>Print Official Z-Report (Thermal / A4)</span>
                </button>
                <button
                  onClick={() => setShowZReportPrintModal(false)}
                  className="px-4 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            PRESCRIPTION OCR SCANNER MODAL
        ====================================================== */}
        {showRxScanner && (
          <PrescriptionScanner
            onResult={handleRxScanResult}
            onClose={() => setShowRxScanner(false)}
          />
        )}
      </main>
    </div>
  );
}
