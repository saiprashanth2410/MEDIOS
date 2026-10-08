import { doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { getUserDocRef, getUserCollectionRef, getUserScopeId, getScopedKey } from "./userScope";

// ─── Real Browser Detection ─────────────────────────────────────────────
export function detectBrowser() {
  if (typeof window === "undefined" || !navigator?.userAgent) return "Web Browser";
  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return "Microsoft Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/chrome|crios/i.test(ua)) return "Google Chrome";
  if (/firefox|fxios/i.test(ua)) return "Mozilla Firefox";
  if (/safari/i.test(ua)) return "Apple Safari";
  return "Web Browser";
}

// ─── Real OS Detection ──────────────────────────────────────────────────
export function detectOS() {
  if (typeof window === "undefined" || !navigator?.userAgent) return "Operating System";
  const ua = navigator.userAgent;
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  if (/mac/i.test(platform) || /macintosh|mac os x/i.test(ua)) return "macOS";
  if (/win/i.test(platform) || /windows/i.test(ua)) return "Windows";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(platform) || /linux/i.test(ua)) return "Linux";
  return "Desktop";
}

// ─── Real Device Info ───────────────────────────────────────────────────
export function detectDevice() {
  if (typeof window === "undefined" || !navigator?.userAgent) {
    return { type: "desktop", name: "Desktop Workstation" };
  }
  const ua = navigator.userAgent;
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  if (/ipad|tablet/i.test(ua)) return { type: "tablet", name: "Tablet" };
  if (/iphone/i.test(ua)) return { type: "mobile", name: "Apple iPhone" };
  if (/android/i.test(ua) && /mobile/i.test(ua)) return { type: "mobile", name: "Android Smartphone" };
  if (/android/i.test(ua)) return { type: "tablet", name: "Android Tablet" };
  if (/mac/i.test(platform) || /macintosh|mac os x/i.test(ua)) return { type: "desktop", name: "Apple Mac / MacBook" };
  if (/win/i.test(platform) || /windows/i.test(ua)) return { type: "desktop", name: "Windows PC / Laptop" };
  if (/linux/i.test(platform) || /linux/i.test(ua)) return { type: "desktop", name: "Linux Station" };
  return { type: "desktop", name: "Workstation" };
}

export function getClientDeviceString() {
  const browser = detectBrowser();
  const os = detectOS();
  return `${browser} · ${os}`;
}

// ─── Persistent Unique Device Session ID ─────────────────────────────────
export function getDeviceSessionId() {
  if (typeof window === "undefined") return "server_session";
  let id = localStorage.getItem("meditrack_device_session_id");
  if (!id) {
    id = "sess_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
    localStorage.setItem("meditrack_device_session_id", id);
  }
  return id;
}

// ─── Session Start Timestamp ────────────────────────────────────────────
export function getSessionStartTime() {
  if (typeof window === "undefined") return new Date();
  let start = sessionStorage.getItem("meditrack_session_start");
  if (!start) {
    start = new Date().toISOString();
    sessionStorage.setItem("meditrack_session_start", start);
  }
  return new Date(start);
}

// ─── Sync Device Session to Firestore ───────────────────────────────────
export async function syncActiveDeviceSession(user, extra = {}) {
  if (typeof window === "undefined" || !user) return;
  try {
    const scopeId = getUserScopeId();
    if (!scopeId || scopeId === "default_account") return;

    const sessionId = getDeviceSessionId();
    const browser = detectBrowser();
    const os = detectOS();
    const device = detectDevice();

    const createdAt =
      localStorage.getItem("meditrack_device_session_created") ||
      new Date().toISOString();
    localStorage.setItem("meditrack_device_session_created", createdAt);

    const docRef = getUserDocRef(db, "active_sessions", sessionId);
    await setDoc(
      docRef,
      {
        id: sessionId,
        browser,
        os,
        deviceType: device.type,
        deviceName: device.name,
        location: extra.location || "India (IST)",
        ip: extra.ip || "127.0.0.1 (Localhost)",
        userEmail: user?.email || "",
        userName: user?.name || user?.displayName || "",
        lastActive: new Date().toISOString(),
        createdAt,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.debug("[sessionManager] Sync session warning:", err?.message);
  }
}

// ─── Revoke a Session in Firestore ──────────────────────────────────────
export async function revokeDeviceSession(sessionId) {
  try {
    const docRef = getUserDocRef(db, "active_sessions", sessionId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("[sessionManager] Revoke error:", err);
    return false;
  }
}

// ─── Real-Time Listener across all devices ──────────────────────────────
export function subscribeToActiveSessions(callback) {
  try {
    const colRef = getUserCollectionRef(db, "active_sessions");
    return onSnapshot(
      colRef,
      (snapshot) => {
        const sessions = [];
        snapshot.forEach((d) => {
          sessions.push({ ...d.data(), id: d.id });
        });
        callback(sessions);
      },
      (err) => {
        console.warn("[sessionManager] Snapshot warning:", err?.message);
        callback([]);
      }
    );
  } catch {
    return () => {};
  }
}
