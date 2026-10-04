/**
 * Utility for Multi-tenant User Scoping
 * Ensures every user / ID gets their own isolated data storage in MediTrack.
 * Brand new accounts start with 0 data across inventory, expiry, batches, and recycle bin,
 * while allowing pharmacists to optionally load sample demo data with 1-click.
 */

import { getInitialExpiryData } from "../data/expiryData";
import defaultMedicines from "../data/catalogMedicines.json";

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
  if (!user) return "guest";
  const rawId = user.uid || user.id || user.email || "guest";
  return String(rawId).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

export function getScopedKey(baseKey) {
  const scopeId = getUserScopeId();
  return `${baseKey}_${scopeId}`;
}

export function isDemoAccount() {
  const user = getActiveUser();
  if (!user) return false;
  return (
    user.email === "demo@meditrack.com" ||
    user.email === "demo@meditrackos.com" ||
    user.isDemo === true
  );
}

/**
 * Initializes a brand new account with a clean zero-data state (0 items)
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
    localStorage.setItem(`meditrack_is_new_account_${scopeId}`, "true");
  } catch (err) {
    console.debug("[userScope] Init new user note:", err);
  }
}

/**
 * Loads sample demo data into the current user's scoped stores.
 * (48 FEFO expiry items, batches, and sample catalog inventory)
 */
export function loadSampleDataForCurrentUser() {
  if (typeof window === "undefined") return;
  const scopeId = getUserScopeId();

  try {
    const sampleExpiry = getInitialExpiryData();
    localStorage.setItem(`pharmacyExpiry_${scopeId}`, JSON.stringify(sampleExpiry));

    const sampleMeds = defaultMedicines.slice(0, 30).map((m) => ({
      ...m,
      isCustom: true,
      stock: Number(m.stock) || 50,
      price: Number(m.price || m.sellingPrice) || 45,
    }));
    localStorage.setItem(`meditrack_custom_medicines_${scopeId}`, JSON.stringify(sampleMeds));

    const sampleBatches = sampleExpiry.slice(0, 15).map((exp, idx) => ({
      id: `batch-sample-${idx}`,
      batchNumber: exp.batchNumber || `BT-SMP-${idx + 100}`,
      medicineName: exp.medicineName,
      quantity: exp.quantity || 50,
      expiryDate: exp.expiryDate,
      supplier: exp.supplier || "Cipla Ltd",
      status: exp.status || "Active",
      createdAt: new Date().toISOString(),
    }));
    localStorage.setItem(`meditrack_batches_${scopeId}`, JSON.stringify(sampleBatches));

    // Dispatch update events
    window.dispatchEvent(new CustomEvent("meditrack_expiry_updated", { detail: sampleExpiry }));
    window.dispatchEvent(new Event("meditrack_medicines_updated"));
    window.dispatchEvent(new Event("meditrack_stock_updated"));
  } catch (err) {
    console.error("[userScope] Failed to load sample demo data:", err);
  }
}

/**
 * Wipes the current user's data completely back to 0 across all stores.
 */
export function clearCurrentUserData() {
  if (typeof window === "undefined") return;
  const scopeId = getUserScopeId();

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

    // Dispatch events
    window.dispatchEvent(new CustomEvent("meditrack_expiry_updated", { detail: [] }));
    window.dispatchEvent(new CustomEvent("meditrack_recycle_bin_updated", { detail: [] }));
    window.dispatchEvent(new Event("meditrack_medicines_updated"));
    window.dispatchEvent(new Event("meditrack_stock_updated"));
    window.dispatchEvent(new Event("meditrack_sales_updated"));
  } catch (err) {
    console.error("[userScope] Failed to clear user data:", err);
  }
}
