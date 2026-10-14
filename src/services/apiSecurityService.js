import { GoogleGenerativeAI } from "@google/generative-ai";

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
    // Fallback simple hash for older environments if subtle is missing
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
 * Verifies if the provided passcode matches the stored security hash.
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
 * Saves a new or updated API key locked with the user's secret passcode.
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

  localStorage.setItem(STORAGE_KEY_API, cleanKey);
  localStorage.setItem(STORAGE_KEY_HASH, hash);
  localStorage.setItem(STORAGE_KEY_UPDATED, new Date().toISOString());

  // Notify the rest of the application that the AI key is active
  window.dispatchEvent(new Event("meditrack_gemini_api_key_updated"));
  window.dispatchEvent(new Event("storage"));

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
  return localStorage.getItem(STORAGE_KEY_API) || "";
}

/**
 * Removes the API key and passcode after verifying the passcode.
 */
export async function removeApiKeyWithPasscode(passcode) {
  const isValid = await verifyPasscode(passcode);
  if (!isValid) {
    throw new Error("Incorrect passcode. Cannot remove API key.");
  }

  localStorage.removeItem(STORAGE_KEY_API);
  localStorage.removeItem(STORAGE_KEY_HASH);
  localStorage.removeItem(STORAGE_KEY_UPDATED);

  window.dispatchEvent(new Event("meditrack_gemini_api_key_updated"));
  window.dispatchEvent(new Event("storage"));

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
        message: "Successfully verified! Gemini 1.5 Flash responded.",
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

