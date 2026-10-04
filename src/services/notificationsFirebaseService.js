import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getScopedKey, getUserCollectionRef, getUserDocRef } from "../utils/userScope";

const COLLECTION_NAME = "notifications";
const LOCAL_NOTIFS_KEY = "meditrack_notifications";
const DELETED_NOTIFS_KEY = "meditrack_deleted_notifications";
const CLEARED_NOTIFS_KEY = "meditrack_notifications_cleared";

function getDeletedSet() {
  if (typeof window === "undefined") return new Set();
  try {
    const scopedKey = getScopedKey(DELETED_NOTIFS_KEY);
    const raw = localStorage.getItem(scopedKey);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function getLocalNotifications() {
  if (typeof window === "undefined") return [];
  try {
    const clearedKey = getScopedKey(CLEARED_NOTIFS_KEY);
    const isCleared = localStorage.getItem(clearedKey) === "true";
    if (isCleared) return [];

    const deletedIds = getDeletedSet();
    const notifsKey = getScopedKey(LOCAL_NOTIFS_KEY);
    const raw = localStorage.getItem(notifsKey);

    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((n) => !deletedIds.has(n.id));
      }
    }

    // New user starts with clean welcome notification only
    const welcome = [
      {
        id: "notif-welcome",
        title: "Welcome to MediTrackOS",
        message: "Your new pharmacy account is active. Add medicines and batches to begin tracking.",
        type: "info",
        category: "system",
        time: "Just now",
        timestamp: new Date().toISOString(),
        read: false,
      },
    ].filter((n) => !deletedIds.has(n.id));

    localStorage.setItem(notifsKey, JSON.stringify(welcome));
    return welcome;
  } catch (_) {
    return [];
  }
}

function saveLocalNotifications(list) {
  if (typeof window === "undefined") return;
  try {
    const deletedIds = getDeletedSet();
    const cleanList = (list || []).filter((n) => !deletedIds.has(n.id));
    const notifsKey = getScopedKey(LOCAL_NOTIFS_KEY);
    const clearedKey = getScopedKey(CLEARED_NOTIFS_KEY);
    localStorage.setItem(notifsKey, JSON.stringify(cleanList));
    if (cleanList.length === 0) {
      localStorage.setItem(clearedKey, "true");
    } else {
      localStorage.removeItem(clearedKey);
    }
    window.dispatchEvent(new Event("meditrack_notifications_updated"));
  } catch (err) {
    console.debug("Local notifications save error:", err);
  }
}

export const notificationsFirebaseService = {
  async list({ page = 1, limit = 50, search = "", status = "all", type = "all" } = {}) {
    let all = getLocalNotifications();
    const deletedIds = getDeletedSet();

    try {
      const isCleared = typeof window !== "undefined" && localStorage.getItem(getScopedKey(CLEARED_NOTIFS_KEY)) === "true";
      if (!isCleared) {
        const snap = await getDocs(getUserCollectionRef(db, COLLECTION_NAME));
        if (!snap.empty) {
          const firestoreList = [];
          snap.forEach((d) => {
            if (!deletedIds.has(d.id)) {
              firestoreList.push({ id: d.id, ...d.data() });
            }
          });

          if (firestoreList.length > 0) {
            const map = new Map();
            all.forEach((n) => map.set(n.id, n));
            firestoreList.forEach((n) => {
              if (!deletedIds.has(n.id)) {
                const existing = map.get(n.id);
                const isRead = existing ? (existing.read || n.read) : n.read;
                map.set(n.id, { ...existing, ...n, read: isRead });
              }
            });
            all = Array.from(map.values()).filter((n) => !deletedIds.has(n.id));
            saveLocalNotifications(all);
          }
        }
      }
    } catch (err) {
      console.debug("Firestore notifications fetch notice:", err.message);
    }

    let filtered = all.filter((n) => !deletedIds.has(n.id));

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

    const total = filtered.length;
    const start = (Number(page) - 1) * Number(limit);
    const paginated = filtered.slice(start, start + Number(limit));

    return {
      notifications: paginated,
      total,
      unreadCount: filtered.filter((n) => !n.read).length,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  },

  async stats() {
    const list = getLocalNotifications();
    const unread = list.filter((n) => !n.read).length;
    const stockCount = list.filter((n) => n.type === "stock").length;
    const expiryCount = list.filter((n) => n.type === "expiry").length;
    const prescriptionCount = list.filter((n) => n.type === "prescription").length;
    const highPriority = list.filter((n) => n.priority === "high" || n.priority === "critical").length;

    return {
      total: list.length,
      unread,
      stockCount,
      expiryCount,
      prescriptionCount,
      highPriority,
    };
  },

  async markAllRead() {
    const list = getLocalNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    saveLocalNotifications(updated);

    try {
      await Promise.all(
        updated.map((n) =>
          setDoc(
            getUserDocRef(db, COLLECTION_NAME, n.id),
            { ...n, read: true, updatedAt: serverTimestamp() },
            { merge: true }
          ).catch(() => {})
        )
      );
    } catch (_) {}

    return { success: true, count: updated.length };
  },

  async markRead(id) {
    const list = getLocalNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveLocalNotifications(updated);

    try {
      const target = updated.find((n) => n.id === id) || { id, read: true };
      await setDoc(
        getUserDocRef(db, COLLECTION_NAME, id),
        { ...target, read: true, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (_) {}

    return { success: true, id };
  },

  async update(id, data) {
    const list = getLocalNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, ...data } : n));
    saveLocalNotifications(updated);

    try {
      await setDoc(
        getUserDocRef(db, COLLECTION_NAME, id),
        { ...data, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (_) {}

    return { success: true, id, data };
  },

  async delete(id) {
    const deletedIds = getDeletedSet();
    deletedIds.add(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(getScopedKey(DELETED_NOTIFS_KEY), JSON.stringify(Array.from(deletedIds)));
      } catch (_) {}
    }

    const list = getLocalNotifications();
    const updated = list.filter((n) => n.id !== id);
    saveLocalNotifications(updated);

    try {
      await deleteDoc(getUserDocRef(db, COLLECTION_NAME, id));
    } catch (_) {}

    return { success: true, deleted: id };
  },

  async clearAll() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(getScopedKey(CLEARED_NOTIFS_KEY), "true");
        localStorage.setItem(getScopedKey(LOCAL_NOTIFS_KEY), "[]");
      } catch (_) {}
    }
    saveLocalNotifications([]);

    try {
      const snap = await getDocs(getUserCollectionRef(db, COLLECTION_NAME));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
    } catch (_) {}

    return { success: true, message: "All notifications cleared" };
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
      await setDoc(getUserDocRef(db, COLLECTION_NAME, id), {
        ...notif,
        serverTimestamp: serverTimestamp(),
      });
    } catch (_) {}

    return notif;
  },
};

export default notificationsFirebaseService;
