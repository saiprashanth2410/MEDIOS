import { getScopedKey } from "./userScope";

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
  if (/ipad|tablet/i.test(ua)) return { type: "tablet", name: "Tablet" };
  if (/iphone/i.test(ua)) return { type: "mobile", name: "Apple iPhone" };
  if (/android/i.test(ua) && /mobile/i.test(ua)) return { type: "mobile", name: "Android Smartphone" };
  if (/android/i.test(ua)) return { type: "tablet", name: "Android Tablet" };
  if (/mac/i.test(ua)) return { type: "desktop", name: "Apple Mac / MacBook" };
  if (/win/i.test(ua)) return { type: "desktop", name: "Windows PC / Laptop" };
  if (/linux/i.test(ua)) return { type: "desktop", name: "Linux Station" };
  return { type: "desktop", name: "Workstation" };
}

export function getClientDeviceString() {
  const browser = detectBrowser();
  const os = detectOS();
  return `${browser} · ${os}`;
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

// ─── Build Real Current Active Session ──────────────────────────────────
export function getOrCreateCurrentSession(user) {
  const entryDate = getSessionStartTime();
  const now = new Date();
  const durationSeconds = Math.max(1, Math.floor((now.getTime() - entryDate.getTime()) / 1000));
  const deviceStr = getClientDeviceString();

  const userName =
    user?.name ||
    user?.displayName ||
    user?.email?.split("@")[0]?.replace(/\./g, " ") ||
    "Chief Pharmacist";

  const email = user?.email || "pharmacist@meditrack.in";
  const provider = user?.provider || (user?.email?.includes("@") ? "credentials" : "firebase");

  return {
    _id: "current-active-session",
    id: "current-active-session",
    userId: user?.uid || user?.id || "user_current",
    userName,
    email,
    action: "login",
    provider,
    entryTime: entryDate.toISOString(),
    logoutTime: null, // null means ACTIVE
    sessionDurationSeconds: durationSeconds,
    device: deviceStr,
    ip: "127.0.0.1 (Localhost)",
    status: "success",
    isCurrent: true,
  };
}

// ─── Local Scoped Session Logs Storage ──────────────────────────────────
export function getSavedSessionLogs() {
  if (typeof window === "undefined") return [];
  try {
    const key = getScopedKey("meditrack_auth_session_logs");
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSessionLog(log) {
  if (typeof window === "undefined" || !log) return;
  try {
    const key = getScopedKey("meditrack_auth_session_logs");
    const existing = getSavedSessionLogs();
    // Prepend new log and keep up to 50
    const filtered = existing.filter((item) => item.id !== log.id && item._id !== log._id);
    const updated = [log, ...filtered].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to persist session log:", err);
  }
}

