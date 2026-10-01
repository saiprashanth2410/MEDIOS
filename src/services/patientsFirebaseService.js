import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "patients";
const LOCAL_STORAGE_KEY = "meditrack_patients_directory";

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
};

export default patientsFirebaseService;
