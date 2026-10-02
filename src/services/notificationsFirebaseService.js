import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "notifications";
const LOCAL_NOTIFS_KEY = "meditrack_notifications";

const SEED_NOTIFICATIONS = [
  {
    id: "NOTIF-1",
    type: "expiry",
    title: "Medicine Expiring Soon",
    message: "Safedox (BATCH-1000) expires in 15 days",
    read: false,
    color: "amber",
    priority: "high",
    link: "/expiry",
    createdAt: new Date().toISOString(),
  },
  {
    id: "NOTIF-2",
    type: "stock",
    title: "Low Stock Alert",
    message: "Flucret stock is below 10 units",
    read: false,
    color: "red",
    priority: "high",
    link: "/medicines",
    createdAt: new Date().toISOString(),
  },
  {
    id: "NOTIF-3",
    type: "expiry",
    title: "Batch Expired",
    message: "BATCH-0998 expired yesterday — remove from shelf immediately",
    read: false,
    color: "red",
    priority: "critical",
    link: "/batches",
    createdAt: new Date().toISOString(),
  },
  {
    id: "NOTIF-4",
    type: "prescription",
    title: "New Prescription Pending",
    message: "Prescription RX-2024-001 awaiting pharmacist dispensing",
    read: false,
    color: "blue",
    priority: "medium",
    link: "/prescriptions",
    createdAt: new Date().toISOString(),
  },
  {
    id: "NOTIF-5",
    type: "order",
    title: "Purchase Order Pending",
    message: "PO-2026-045 waiting for supplier Sun Pharma confirmation",
    read: true,
    color: "blue",
    priority: "low",
    link: "/suppliers",
    createdAt: new Date().toISOString(),
  },
  {
    id: "NOTIF-6",
    type: "system",
    title: "System Backup Complete",
    message: "Automatic database and inventory backup completed successfully",
    read: true,
    color: "emerald",
    priority: "low",
    link: "/dashboard",
    createdAt: new Date().toISOString(),
  },
];

function getLocalNotifications() {
  if (typeof window === "undefined") return SEED_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  try {
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(SEED_NOTIFICATIONS));
  } catch (_) {}
  return SEED_NOTIFICATIONS;
}

function saveLocalNotifications(list) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("meditrack_notifications_updated"));
  } catch (err) {
    console.debug("Local notifications save error:", err);
  }
}

export const notificationsFirebaseService = {
  async list({ page = 1, limit = 50, search = "", status = "all", type = "all" } = {}) {
    let all = getLocalNotifications();

    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      if (!snap.empty) {
        const firestoreList = [];
        snap.forEach((d) => firestoreList.push({ id: d.id, ...d.data() }));
        const map = new Map();
        all.forEach((n) => map.set(n.id, n));
        firestoreList.forEach((n) => map.set(n.id, { ...map.get(n.id), ...n }));
        all = Array.from(map.values());
        saveLocalNotifications(all);
      }
    } catch (err) {
      console.debug("Firestore notifications fetch notice:", err.message);
    }

    let filtered = all;
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (n) => n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q)
      );
    }
    if (status === "unread") {
      filtered = filtered.filter((n) => !n.read);
    } else if (status === "read") {
      filtered = filtered.filter((n) => n.read);
    }
    if (type !== "all" && type) {
      filtered = filtered.filter((n) => n.type === type);
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      notifications: paginated,
      total: filtered.length,
      page: Number(page),
      totalPages: Math.ceil(filtered.length / limit) || 1,
    };
  },

  async stats() {
    const list = getLocalNotifications();
    const unread = list.filter((n) => !n.read).length;
    const highPriority = list.filter((n) => n.priority === "high" || n.priority === "critical").length;
    return {
      total: list.length,
      unread,
      highPriority,
    };
  },

  async markAllRead() {
    const list = getLocalNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    saveLocalNotifications(updated);

    try {
      for (const n of list) {
        if (!n.read) {
          updateDoc(doc(db, COLLECTION_NAME, n.id), { read: true, updatedAt: serverTimestamp() }).catch(() => {});
        }
      }
    } catch (_) {}

    return { ok: true, count: list.length };
  },

  async markRead(id) {
    const list = getLocalNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveLocalNotifications(updated);

    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), { read: true, updatedAt: serverTimestamp() });
    } catch (_) {}

    return { ok: true };
  },

  async update(id, data) {
    const list = getLocalNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, ...data } : n));
    saveLocalNotifications(updated);

    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), { ...data, updatedAt: serverTimestamp() });
    } catch (_) {}

    return { ok: true };
  },

  async delete(id) {
    const list = getLocalNotifications();
    const updated = list.filter((n) => n.id !== id);
    saveLocalNotifications(updated);

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (_) {}

    return { ok: true, deleted: id };
  },

  async clearAll() {
    saveLocalNotifications([]);

    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      snap.forEach((d) => deleteDoc(d.ref).catch(() => {}));
    } catch (_) {}

    return { ok: true };
  },

  async create(data) {
    const id = data.id || `NOTIF-${Date.now().toString().slice(-4)}`;
    const notif = {
      ...data,
      id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    const list = getLocalNotifications();
    saveLocalNotifications([notif, ...list]);

    try {
      await setDoc(doc(db, COLLECTION_NAME, id), {
        ...notif,
        serverTimestamp: serverTimestamp(),
      });
    } catch (_) {}

    return notif;
  },
};

export default notificationsFirebaseService;
