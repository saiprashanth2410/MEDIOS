import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "patients";
const REFILL_COLLECTION = "refill_reminders";
const LOCAL_STORAGE_KEY = "meditrack_patients_directory";
const LOCAL_REFILL_KEY = "meditrack_refill_reminders";

function getLocalPatients() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalPatients(data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.debug("Local patient cache save error:", e);
  }
}

function getLocalRefills() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_REFILL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRefills(data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_REFILL_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event("meditrack_refills_updated"));
  } catch (e) {
    console.debug("Local refills cache save error:", e);
  }
}

export const patientsFirebaseService = {
  /**
   * Look up a patient by phone number.
   * Checks local memory cache first for 0ms auto-fill, then Firestore.
   */
  async findByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length < 5) return null;

    // 1. Check local cache
    const local = getLocalPatients();
    if (local[cleanPhone]) {
      return local[cleanPhone];
    }

    // 2. Query Firestore
    try {
      const docRef = doc(db, COLLECTION_NAME, cleanPhone);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const patientData = { id: snap.id, ...snap.data() };
        local[cleanPhone] = patientData;
        saveLocalPatients(local);
        return patientData;
      }
    } catch (err) {
      if (err?.code !== "permission-denied") {
        console.debug("[patientsFirebase] findByPhone notice:", err?.message);
      }
    }

    return null;
  },

  /**
   * Records or updates a patient visit upon completing a sale.
   * Automatically increments visit count and updates visit history.
   */
  async recordVisit({ name, phone, invoiceNumber, billAmount, itemsCount }) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (!cleanPhone) return null;

    const patientName = String(name || "").trim() || "Walk-in Patient";
    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleDateString("en-IN");
    const amount = Number(billAmount || 0);

    const local = getLocalPatients();
    const existing = local[cleanPhone] || null;

    const visitEntry = {
      invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      date: formattedDate,
      time: new Date().toLocaleTimeString("en-IN"),
      amount,
      itemsCount: Number(itemsCount || 1),
    };

    let updatedPatient = null;

    if (existing) {
      const newVisitCount = Number(existing.visitCount || 1) + 1;
      const history = Array.isArray(existing.visits) ? existing.visits : [];
      updatedPatient = {
        ...existing,
        name: patientName !== "Walk-in Patient" ? patientName : existing.name,
        phone: cleanPhone,
        visitCount: newVisitCount,
        lastVisit: nowIso,
        lastVisitFormatted: formattedDate,
        totalSpent: Number(existing.totalSpent || 0) + amount,
        visits: [visitEntry, ...history.slice(0, 19)], // keep last 20 visits
      };
    } else {
      updatedPatient = {
        id: cleanPhone,
        name: patientName,
        phone: cleanPhone,
        visitCount: 1,
        firstVisit: nowIso,
        lastVisit: nowIso,
        lastVisitFormatted: formattedDate,
        totalSpent: amount,
        visits: [visitEntry],
      };
    }

    // 1. Save in local cache immediately
    local[cleanPhone] = updatedPatient;
    saveLocalPatients(local);

    // 2. Persist to Firestore
    try {
      const docRef = doc(db, COLLECTION_NAME, cleanPhone);
      await setDoc(
        docRef,
        {
          ...updatedPatient,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("[patientsFirebase] Cloud sync notice:", err.message);
    }

    return updatedPatient;
  },

  /**
   * List all registered patients.
   */
  async listPatients({ limitCount = 50 } = {}) {
    const local = getLocalPatients();
    const localList = Object.values(local);

    try {
      const colRef = collection(db, COLLECTION_NAME);
      const snap = await getDocs(colRef);
      const firestoreList = [];
      snap.forEach((d) => firestoreList.push({ id: d.id, ...d.data() }));

      if (firestoreList.length > 0) {
        firestoreList.forEach((p) => {
          local[p.id || p.phone] = p;
        });
        saveLocalPatients(local);
        return firestoreList.slice(0, limitCount);
      }
    } catch (err) {
      console.debug("[patientsFirebase] list fallback:", err.message);
    }

    return localList.slice(0, limitCount);
  },

  /* =====================================================
     SMART REFILL REMINDERS (1 DAY BEFORE EXHAUSTION)
  ===================================================== */

  /**
   * Automatically generate and store refill reminder schedules
   * for each medicine dispensed to a patient.
   */
  async recordRefillReminders({
    patientName,
    patientPhone,
    items = [],
    pharmacyName = "MediTrack Pharmacy",
    branch = "Main Branch",
  }) {
    if (!patientPhone || !Array.isArray(items) || items.length === 0) return [];
    const cleanPhone = String(patientPhone).replace(/\D/g, "");
    if (cleanPhone.length < 5) return [];

    const now = Date.now();
    const localRefills = getLocalRefills();
    const newReminders = [];

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      // Default: 1 tablet/unit per day. 30 tabs = 30 days.
      const durationDays = Math.max(2, qty);
      const refillDueDate = new Date(now + durationDays * 24 * 60 * 60 * 1000);
      // Reminder date is exactly 1 day before medicine runs out:
      const reminderDate = new Date(now + (durationDays - 1) * 24 * 60 * 60 * 1000);

      const reminderId = `REFILL-${cleanPhone}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 5)}`;

      const refillDueDateStr = refillDueDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const reminderDateStr = reminderDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });

      const messages = this.generateBilingualRefillMessage({
        patientName: patientName || "Customer",
        medicineName: item.name,
        quantity: qty,
        refillDueDateStr,
        pharmacyName,
        branch,
      });

      const reminderRecord = {
        id: reminderId,
        patientName: patientName || "Walk-in Patient",
        patientPhone: cleanPhone,
        medicineName: item.name,
        quantity: qty,
        durationDays,
        purchaseDateStr: new Date().toLocaleDateString("en-IN"),
        refillDueDateStr,
        reminderDateStr,
        refillDueTimestamp: refillDueDate.getTime(),
        reminderTimestamp: reminderDate.getTime(),
        status: "pending", // 'pending' | 'sent' | 'refilled'
        pharmacyName,
        branch,
        messages,
        createdAt: new Date().toISOString(),
      };

      newReminders.push(reminderRecord);

      // Async Firestore persistence
      try {
        await setDoc(doc(db, REFILL_COLLECTION, reminderId), {
          ...reminderRecord,
          serverTimestamp: serverTimestamp(),
        });
      } catch (e) {
        console.debug("Firestore refill sync notice:", e?.message);
      }
    }

    const updatedList = [...newReminders, ...localRefills];
    saveLocalRefills(updatedList);

    return newReminders;
  },

  /**
   * Generates bilingual refill reminder texts in both English and Tamil.
   */
  generateBilingualRefillMessage({
    patientName,
    medicineName,
    quantity,
    refillDueDateStr,
    pharmacyName,
    branch,
  }) {
    const english = `Dear ${patientName}, this is a gentle reminder from ${pharmacyName}. Your medicine ${medicineName} (${quantity} units) will be completed tomorrow (${refillDueDateStr}). To ensure your healthcare course continues without interruption, please visit us to collect your refill. Thank you!`;

    const tamil = `அன்புள்ள ${patientName}, ${pharmacyName}-ன் நினைவூட்டல் செய்தி. நீங்கள் வாங்கிய ${medicineName} மருந்து (${quantity} மாத்திரைகள்) நாளை (${refillDueDateStr}) முடிவடைகிறது. உங்கள் சிகிச்சையில் இடைவெளி ஏற்படாமல் இருக்க இன்றே எங்கள் மருந்தகத்தை அணுகி மருந்தை பெற்றுக்கொள்ளவும். நன்றி!`;

    const combined = `${english}\n\n━━━━━━━━━━━━━━━━━━━━\n${tamil}\n\n📍 ${pharmacyName} · ${branch}`;

    return {
      english,
      tamil,
      combined,
    };
  },

  /**
   * Helper to format a direct click-to-chat WhatsApp link.
   */
  getWhatsAppRefillLink(phone, messageText) {
    const clean = String(phone).replace(/\D/g, "");
    const formattedPhone = clean.startsWith("91") && clean.length === 12 ? clean : `91${clean.slice(-10)}`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
  },

  /**
   * Fetch all active refill reminders.
   */
  async getRefillReminders() {
    let list = getLocalRefills();

    try {
      const snap = await getDocs(collection(db, REFILL_COLLECTION));
      if (!snap.empty) {
        const cloudList = [];
        snap.forEach((d) => cloudList.push({ id: d.id, ...d.data() }));
        const map = new Map();
        list.forEach((r) => map.set(r.id, r));
        cloudList.forEach((r) => map.set(r.id, { ...map.get(r.id), ...r }));
        list = Array.from(map.values());
        saveLocalRefills(list);
      }
    } catch (e) {
      console.debug("Refill list cloud sync notice:", e?.message);
    }

    const now = Date.now();

    // Dynamically calculate due status and days remaining
    return list
      .map((item) => {
        const diffDays = Math.ceil(
          (item.refillDueTimestamp - now) / (1000 * 60 * 60 * 24)
        );
        const isDue =
          item.status === "pending" && (now >= item.reminderTimestamp || diffDays <= 1);
        return {
          ...item,
          daysRemaining: diffDays,
          isDue,
        };
      })
      .sort((a, b) => a.refillDueTimestamp - b.refillDueTimestamp);
  },

  /**
   * Marks a reminder as sent (WhatsApp/SMS dispatched).
   */
  async markRefillSent(id) {
    const list = getLocalRefills();
    const updated = list.map((r) =>
      r.id === id ? { ...r, status: "sent", sentAt: new Date().toISOString() } : r
    );
    saveLocalRefills(updated);

    try {
      await updateDoc(doc(db, REFILL_COLLECTION, id), {
        status: "sent",
        sentAt: serverTimestamp(),
      });
    } catch (_) {}

    return { ok: true };
  },

  /**
   * Marks a reminder as completed / refilled by customer.
   */
  async markRefillCompleted(id) {
    const list = getLocalRefills();
    const updated = list.map((r) =>
      r.id === id ? { ...r, status: "refilled", refilledAt: new Date().toISOString() } : r
    );
    saveLocalRefills(updated);

    try {
      await updateDoc(doc(db, REFILL_COLLECTION, id), {
        status: "refilled",
        refilledAt: serverTimestamp(),
      });
    } catch (_) {}

    return { ok: true };
  },

  /**
   * Removes a reminder from queue.
   */
  async deleteRefill(id) {
    const list = getLocalRefills();
    const updated = list.filter((r) => r.id !== id);
    saveLocalRefills(updated);

    try {
      await deleteDoc(doc(db, REFILL_COLLECTION, id));
    } catch (_) {}

    return { ok: true };
  },
};

export default patientsFirebaseService;
