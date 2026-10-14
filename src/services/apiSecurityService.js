import { GoogleGenerativeAI } from "@google/generative-ai";
import api from "./api";
import { auth, db } from "../config/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const STORAGE_KEY_API = "meditrack_gemini_api_key";
const STORAGE_KEY_HASH = "meditrack_api_passcode_hash";
const STORAGE_KEY_UPDATED = "meditrack_api_key_updated_at";

/**
 * Computes a secure SHA-256 hash of the user's secret passcode.
 * The raw passcode is never stored in plaintext.
 */
export async function hashPasscode(passcode) {
  if (!passcode) return "";
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`meditrack_security_salt_${passcode.trim()}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    console.error("Crypto hashing error:", err);
    let hash = 0;
    const str = `meditrack_fallback_${passcode}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return String(Math.abs(hash));
  }
}

/**
 * Checks if a Gemini API key is currently stored.
 */
export function isApiKeyConfigured() {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_API);
    if (stored && stored.trim().length > 10) return true;
    return Boolean(import.meta.env?.VITE_GEMINI_API_KEY);
  } catch {
    return false;
  }
}

/**
 * Returns the currently active Gemini API key from local cache or environment.
 */
export function getActiveApiKey() {
  if (typeof window === "undefined") return "";
  try {
    const stored = localStorage.getItem(STORAGE_KEY_API);
    if (stored && stored.trim().length > 10) return stored.trim();
  } catch {}
  return import.meta.env?.VITE_GEMINI_API_KEY || "";
}

/**
 * Checks if a security passcode has been created to lock the API key.
 */
export function hasPasscode() {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY_HASH));
  } catch {
    return false;
  }
}

/**
 * Retrieves the timestamp of when the key was last modified.
 */
export function getApiKeyLastUpdated() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY_UPDATED) || null;
  } catch {
    return null;
  }
}

/**
 * Synchronizes AI config changes to MongoDB and Cloud Firestore database.
 */
export async function syncToDatabase({ apiKey, passcodeHash }) {
  const payload = {};
  if (apiKey !== undefined) payload.apiKey = apiKey;
  if (passcodeHash !== undefined) payload.passcodeHash = passcodeHash;
  payload.isLocked = Boolean(passcodeHash);

  // 1. Sync to Express / MongoDB backend
  try {
    await api.put("/settings/ai-config", payload);
  } catch (err) {
    console.debug("MongoDB aiConfig sync fallback:", err?.message);
  }

  // 2. Sync to Firebase Firestore database
  try {
    if (db) {
      await setDoc(
        doc(db, "settings", "aiConfig"),
        {
          ...payload,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (auth?.currentUser?.uid) {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            aiConfig: {
              ...payload,
              updatedAt: serverTimestamp(),
            },
          },
          { merge: true }
        );
      }
    }
  } catch (err) {
    console.debug("Firestore aiConfig sync fallback:", err?.message);
  }
}

/**
 * Fetches the latest AI credentials & passcode hash from the database on startup.
 */
export async function fetchAiConfigFromDatabase() {
  let fetchedKey = "";
  let fetchedHash = "";
  let fetchedUpdated = null;

  // 1. Try Express / MongoDB backend
  try {
    const res = await api.get("/settings/ai-config");
    if (res?.data) {
      if (res.data.apiKey) fetchedKey = res.data.apiKey;
      if (res.data.passcodeHash) fetchedHash = res.data.passcodeHash;
      if (res.data.updatedAt) fetchedUpdated = res.data.updatedAt;
    }
  } catch (err) {
    console.debug("MongoDB aiConfig fetch notice:", err?.message);
  }

  // 2. If not found, try Firebase Firestore
  if (!fetchedKey && db) {
    try {
      if (auth?.currentUser?.uid) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data()?.aiConfig) {
          const c = userDoc.data().aiConfig;
          fetchedKey = c.apiKey || "";
          fetchedHash = c.passcodeHash || "";
        }
      }

      if (!fetchedKey) {
        const snap = await getDoc(doc(db, "settings", "aiConfig"));
        if (snap.exists()) {
          const c = snap.data();
          fetchedKey = c.apiKey || "";
          fetchedHash = c.passcodeHash || "";
        }
      }
    } catch (err) {
      console.debug("Firestore aiConfig fetch notice:", err?.message);
    }
  }

  // If DB returned valid config, persist locally
  if (typeof window !== "undefined") {
    let changed = false;
    if (fetchedKey && !localStorage.getItem(STORAGE_KEY_API)) {
      localStorage.setItem(STORAGE_KEY_API, fetchedKey);
      changed = true;
    }
    if (fetchedHash && !localStorage.getItem(STORAGE_KEY_HASH)) {
      localStorage.setItem(STORAGE_KEY_HASH, fetchedHash);
      changed = true;
    }
    if (fetchedUpdated && !localStorage.getItem(STORAGE_KEY_UPDATED)) {
      localStorage.setItem(STORAGE_KEY_UPDATED, fetchedUpdated);
      changed = true;
    }

    if (changed) {
      window.dispatchEvent(new Event("meditrack_gemini_api_key_updated"));
      window.dispatchEvent(new Event("storage"));
    }
  }

  return {
    apiKey: fetchedKey || getActiveApiKey(),
    hasPasscode: Boolean(fetchedHash || hasPasscode()),
    isConfigured: Boolean(fetchedKey || isApiKeyConfigured()),
  };
}

/**
 * Verifies if the entered passcode matches the stored security hash.
 */
export async function verifyPasscode(passcode) {
  if (typeof window === "undefined") return false;
  try {
    const storedHash = localStorage.getItem(STORAGE_KEY_HASH);
    if (!storedHash) return false;
    const computedHash = await hashPasscode(passcode);
    return computedHash === storedHash;
  } catch (err) {
    console.error("Verify passcode error:", err);
    return false;
  }
}

/**
 * Saves a new or updated API key with passcode locking. Syncs to DB.
 */
export async function saveApiKeyWithPasscode({ apiKey, passcode }) {
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error("Please enter a valid Google Gemini API Key.");
  }
  if (!passcode || passcode.trim().length < 4) {
    throw new Error("Security Passcode must be at least 4 characters long.");
  }

  const cleanKey = apiKey.trim();
  const hash = await hashPasscode(passcode);
  const now = new Date().toISOString();

  localStorage.setItem(STORAGE_KEY_API, cleanKey);
  localStorage.setItem(STORAGE_KEY_HASH, hash);
  localStorage.setItem(STORAGE_KEY_UPDATED, now);

  window.dispatchEvent(new Event("meditrack_gemini_api_key_updated"));
  window.dispatchEvent(new Event("storage"));

  // Persist asynchronously to DB
  syncToDatabase({ apiKey: cleanKey, passcodeHash: hash });

  return true;
}

/**
 * Updates the API key directly while retaining the existing passcode protection.
 */
export async function updateApiKeyDirect(newApiKey) {
  if (!newApiKey || newApiKey.trim().length < 10) {
    throw new Error("Please enter a valid Google Gemini API Key.");
  }

  const cleanKey = newApiKey.trim();
  const now = new Date().toISOString();

  localStorage.setItem(STORAGE_KEY_API, cleanKey);
  localStorage.setItem(STORAGE_KEY_UPDATED, now);

  window.dispatchEvent(new Event("meditrack_gemini_api_key_updated"));
  window.dispatchEvent(new Event("storage"));

  syncToDatabase({ apiKey: cleanKey });

  return true;
}

/**
 * Changes the security passcode after verifying the current passcode.
 */
export async function changeSecurityPasscode({ currentPasscode, newPasscode }) {
  const isValid = await verifyPasscode(currentPasscode);
  if (!isValid) {
    throw new Error("Incorrect current passcode. Unable to change passcode.");
  }

  if (!newPasscode || newPasscode.trim().length < 4) {
    throw new Error("New passcode must be at least 4 characters long.");
  }

  const newHash = await hashPasscode(newPasscode);
  const now = new Date().toISOString();

  localStorage.setItem(STORAGE_KEY_HASH, newHash);
  localStorage.setItem(STORAGE_KEY_UPDATED, now);

  window.dispatchEvent(new Event("meditrack_gemini_api_key_updated"));
  window.dispatchEvent(new Event("storage"));

  syncToDatabase({ passcodeHash: newHash });

  return true;
}

/**
 * Retrieves the raw API key only if the correct passcode is supplied.
 */
export async function getRawKeyWithPasscode(passcode) {
  const isValid = await verifyPasscode(passcode);
  if (!isValid) {
    throw new Error("Incorrect passcode. Access denied.");
  }
  return localStorage.getItem(STORAGE_KEY_API) || getActiveApiKey();
}

/**
 * Removes the API key and passcode after verifying passcode. Clears from DB.
 */
export async function removeApiKeyWithPasscode(passcode) {
  if (hasPasscode()) {
    const isValid = await verifyPasscode(passcode);
    if (!isValid) {
      throw new Error("Incorrect passcode. Cannot remove API key.");
    }
  }

  localStorage.removeItem(STORAGE_KEY_API);
  localStorage.removeItem(STORAGE_KEY_HASH);
  localStorage.removeItem(STORAGE_KEY_UPDATED);

  window.dispatchEvent(new Event("meditrack_gemini_api_key_updated"));
  window.dispatchEvent(new Event("storage"));

  syncToDatabase({ apiKey: "", passcodeHash: "" });

  return true;
}

/**
 * Emergency reset of API key and passcode (used if user forgot passcode).
 */
export function resetAllApiSecurity() {
  localStorage.removeItem(STORAGE_KEY_API);
  localStorage.removeItem(STORAGE_KEY_HASH);
  localStorage.removeItem(STORAGE_KEY_UPDATED);

  window.dispatchEvent(new Event("meditrack_gemini_api_key_updated"));
  window.dispatchEvent(new Event("storage"));

  syncToDatabase({ apiKey: "", passcodeHash: "" });

  return true;
}

/**
 * Tests connection to Google Gemini 1.5 Flash using the supplied API key.
 */
export async function testGeminiApiKey(key) {
  if (!key || key.trim().length < 10) {
    return { success: false, error: "Please enter an API key to test." };
  }

  try {
    const genAI = new GoogleGenerativeAI(key.trim());
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Reply with the single word 'CONNECTED'");
    const text = result?.response?.text()?.trim() || "";

    if (text.toUpperCase().includes("CONNECTED") || text.length > 0) {
      return {
        success: true,
        message: "Verified! Gemini 1.5 Flash responded successfully.",
      };
    }
    return {
      success: true,
      message: "Connection verified with Google Gemini API.",
    };
  } catch (err) {
    console.error("Gemini test failed:", err);
    let msg = err.message || "Failed to reach Google Gemini API.";
    if (msg.includes("API_KEY_INVALID")) {
      msg = "Invalid API Key. Please verify key from Google AI Studio.";
    } else if (msg.includes("PERMISSION_DENIED")) {
      msg = "Permission denied. Check if the Gemini API is enabled.";
    }
    return { success: false, error: msg };
  }
}
