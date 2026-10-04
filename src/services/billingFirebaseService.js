import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { inventoryFirebaseService } from "./inventoryFirebaseService";
import { getScopedKey, getUserCollectionRef, getUserDocRef } from "../utils/userScope";

const SALES_COLLECTION = "sales";
const SCHED_H_COLLECTION = "schedule_h_register";
const LOCAL_SALES_KEY = "meditrack_sales_history";
const LOCAL_SCHED_H_KEY = "meditrack_schedule_h_logs";

function getLocalSales() {
  if (typeof window === "undefined") return [];
  try {
    const scopedKey = getScopedKey(LOCAL_SALES_KEY);
    const raw = localStorage.getItem(scopedKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSale(sale) {
  if (typeof window === "undefined" || !sale) return;
  try {
    const scopedKey = getScopedKey(LOCAL_SALES_KEY);
    const existing = getLocalSales();
    const updated = [sale, ...existing.filter((s) => s.invoiceNumber !== sale.invoiceNumber)].slice(0, 100);
    localStorage.setItem(scopedKey, JSON.stringify(updated));
  } catch (err) {
    console.debug("Local sales save error:", err);
  }
}

function getLocalSchedHLogs() {
  if (typeof window === "undefined") return [];
  try {
    const scopedKey = getScopedKey(LOCAL_SCHED_H_KEY);
    const raw = localStorage.getItem(scopedKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSchedHLog(entry) {
  if (typeof window === "undefined" || !entry) return;
  try {
    const scopedKey = getScopedKey(LOCAL_SCHED_H_KEY);
    const existing = getLocalSchedHLogs();
    const updated = [entry, ...existing.filter((s) => s.registerId !== entry.registerId)].slice(0, 150);
    localStorage.setItem(scopedKey, JSON.stringify(updated));
  } catch (err) {
    console.debug("Local Schedule H save error:", err);
  }
}

export const billingFirebaseService = {
  /* =====================================================
     PROCESS SALE / DISPENSE (RESILIENT POS TRANSACTION)
  ===================================================== */
  async createInvoice({
    invoiceNumber,
    customer,
    doctor,
    items,
    totals,
    paymentMethod = "Cash",
    pharmacistName = "Chief Pharmacist",
    pharmacyName = "MediTrack Pharmacy & Health Store",
    pharmacyBranch = "Tiruvannamalai",
    pharmacyLicense = "TN/PH/2026/0892",
    pharmacyId = "DL-TN-CH-2024-0045",
  }) {
    const invId = invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleDateString("en-IN");
    const formattedTime = new Date().toLocaleTimeString("en-IN");

    const salePayload = {
      id: invId,
      invoiceNumber: invId,
      date: formattedDate,
      time: formattedTime,
      customer: {
        name: customer?.name || "Walk-in Patient",
        phone: customer?.phone || "",
        email: customer?.email || "",
      },
      doctor: {
        name: doctor?.name || "",
        mciRegNo: doctor?.mciRegNo || "",
        clinic: doctor?.clinic || "",
      },
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        generic: item.generic || "",
        batch: item.batch || "BATCH-01",
        expiry: item.expiry || "",
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.price) || 0,
        hsn: item.hsn || "3004",
        gstRate: Number(item.gstRate ?? 12),
        schedule: item.schedule || "OTC",
        total: Number(item.total) || (Number(item.price) || 0) * (Number(item.quantity) || 1),
      })),
      totals: {
        subtotal: Number(totals.subtotal) || 0,
        cgst: Number(totals.cgst) || 0,
        sgst: Number(totals.sgst) || 0,
        totalGst: Number(totals.totalGst) || 0,
        grandTotal: Number(totals.grandTotal) || 0,
      },
      paymentMethod,
      pharmacistName,
      pharmacyName,
      pharmacyBranch,
      pharmacyLicense,
      pharmacyId,
      timestampStr: nowIso,
    };

    // 1. Always save in reliable local storage immediately (zero permission failure)
    saveLocalSale(salePayload);

    // 2. Schedule H local persistence
    const schedHItems = items.filter(
      (it) => it.schedule && it.schedule !== "OTC"
    );

    for (const hItem of schedHItems) {
      const regId = `SCHED-H-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`;
      const hPayload = {
        id: regId,
        registerId: regId,
        invoiceNumber: invId,
        date: formattedDate,
        time: formattedTime,
        patientName: customer?.name || "Walk-in Patient",
        patientPhone: customer?.phone || "N/A",
        doctorName: doctor?.name || "Consulting Physician",
        doctorMciReg: doctor?.mciRegNo || "MCI-EXEMPT",
        medicineName: hItem.name,
        generic: hItem.generic || "",
        batchNumber: hItem.batch || "BATCH-01",
        expiryDate: hItem.expiry || "",
        quantityDispensed: Number(hItem.quantity) || 1,
        schedule: hItem.schedule || "H",
        dispensingPharmacist: pharmacistName,
        timestampStr: nowIso,
      };

      saveLocalSchedHLog(hPayload);

      // Background Firestore sync for Schedule H
      try {
        await setDoc(getUserDocRef(db, SCHED_H_COLLECTION, regId), {
          ...hPayload,
          createdAt: serverTimestamp(),
        });
      } catch (hErr) {
        console.debug("[billingFirebase] Schedule H cloud notice (saved locally):", hErr?.message);
      }
    }

    // 3. Background Firestore sync for invoice
    try {
      const saleDocRef = getUserDocRef(db, SALES_COLLECTION, invId);
      await setDoc(saleDocRef, {
        ...salePayload,
        createdAt: serverTimestamp(),
      }, { merge: true });
    } catch (fbErr) {
      console.debug("[billingFirebase] Invoice cloud notice (saved locally):", fbErr?.message);
    }

    // 4. Background Firestore stock deduction
    for (const item of items) {
      try {
        await inventoryFirebaseService.deductMedicineStock(item.id || item.name, item.quantity);
      } catch (dErr) {
        console.debug("[billingFirebase] Stock cloud sync notice:", dErr?.message);
      }
    }

    // 5. Trigger local broadcast so open tabs update
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("meditrack_stock_updated"));
      window.dispatchEvent(new Event("meditrack_medicines_updated"));
    }

    return { ok: true, invoiceNumber: invId, sale: salePayload };
  },

  /* =====================================================
     FETCH RECENT SALES (MERGES LOCAL + FIRESTORE)
  ===================================================== */
  async getRecentInvoices(maxCount = 30) {
    const local = getLocalSales();
    try {
      const colRef = getUserCollectionRef(db, SALES_COLLECTION);
      const q = query(colRef, orderBy("createdAt", "desc"), limit(maxCount));
      const snap = await getDocs(q);
      const firestoreList = [];
      snap.forEach((d) => firestoreList.push({ id: d.id, ...d.data() }));

      if (firestoreList.length > 0) {
        const map = new Map();
        local.forEach((it) => map.set(it.invoiceNumber || it.id, it));
        firestoreList.forEach((it) => map.set(it.invoiceNumber || it.id, { ...map.get(it.invoiceNumber || it.id), ...it }));
        return Array.from(map.values()).slice(0, maxCount);
      }
    } catch (err) {
      console.debug("[billingFirebase] Cloud invoices fallback to local:", err.message);
    }

    return local.slice(0, maxCount);
  },

  /* =====================================================
     FETCH CDSCO STATUTORY SCHEDULE H / H1 REGISTER
  ===================================================== */
  async getScheduleHRegister(maxCount = 100) {
    const local = getLocalSchedHLogs();
    try {
      const colRef = getUserCollectionRef(db, SCHED_H_COLLECTION);
      const q = query(colRef, orderBy("createdAt", "desc"), limit(maxCount));
      const snap = await getDocs(q);
      const firestoreList = [];
      snap.forEach((d) => firestoreList.push({ id: d.id, ...d.data() }));

      if (firestoreList.length > 0) {
        const map = new Map();
        local.forEach((it) => map.set(it.registerId || it.id, it));
        firestoreList.forEach((it) => map.set(it.registerId || it.id, { ...map.get(it.registerId || it.id), ...it }));
        return Array.from(map.values()).slice(0, maxCount);
      }
    } catch (err) {
      console.debug("[billingFirebase] Cloud Schedule H fallback to local:", err.message);
    }

    return local.slice(0, maxCount);
  },
};

export default billingFirebaseService;
