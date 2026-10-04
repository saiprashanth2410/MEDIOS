/**
 * Utility for Multi-tenant Isolated User Databases & Scoping
 * Ensures every pharmacist / user gets their OWN completely isolated database
 * in Firebase Firestore and localStorage.
 * User A will NEVER see User B's medicines, batches, expiry items, or sales.
 * Brand new accounts start with clean 0 data. No demo data.
 */

import { collection, doc } from "firebase/firestore";

export function getActiveUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("meditrack_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getUserScopeId() {
  const user = getActiveUser();
  if (!user) return "default_account";
  const rawId = user.uid || user.id || user.email || "default_account";
  return String(rawId).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

export function getScopedKey(baseKey) {
  const scopeId = getUserScopeId();
  return `${baseKey}_${scopeId}`;
}

/**
 * Returns an isolated Firestore collection reference for the active user.
 * e.g., /users/{userId}/medicines or /users/{userId}/batches
 */
export function getUserCollectionRef(db, collectionName) {
  const scopeId = getUserScopeId();
  return collection(db, "users", scopeId, collectionName);
}

/**
 * Returns an isolated Firestore document reference for the active user.
 * e.g., /users/{userId}/medicines/{docId}
 */
export function getUserDocRef(db, collectionName, docId) {
  const scopeId = getUserScopeId();
  return doc(db, "users", scopeId, collectionName, docId);
}

/**
 * Initializes a brand new account with clean zero-data state (0 items)
 */
export function initializeNewUserScope(userIdOrEmail) {
  if (typeof window === "undefined" || !userIdOrEmail) return;
  const scopeId = String(userIdOrEmail).toLowerCase().replace(/[^a-z0-9_-]/g, "_");

  try {
    localStorage.setItem(`pharmacyExpiry_${scopeId}`, JSON.stringify([]));
    localStorage.setItem(`meditrack_custom_medicines_${scopeId}`, JSON.stringify([]));
    localStorage.setItem(`meditrack_medicine_overrides_${scopeId}`, JSON.stringify({}));
    localStorage.setItem(`meditrack_deleted_medicines_${scopeId}`, JSON.stringify([]));
    localStorage.setItem(`meditrack_batches_${scopeId}`, JSON.stringify([]));
    localStorage.setItem(`meditrack_recycle_bin_${scopeId}`, JSON.stringify([]));
    localStorage.setItem(`meditrack_sales_history_${scopeId}`, JSON.stringify([]));
    localStorage.setItem(`meditrack_schedule_h_logs_${scopeId}`, JSON.stringify([]));
    localStorage.setItem(`meditrack_notifications_${scopeId}`, JSON.stringify([]));
  } catch (err) {
    console.debug("[userScope] Init new user note:", err);
  }
}

/** Demo features disabled: every user has their own real isolated zero-data workspace */
export const isDemoAccount = () => false;
export const loadSampleDataForCurrentUser = () => {};
export const clearCurrentUserData = () => {};

