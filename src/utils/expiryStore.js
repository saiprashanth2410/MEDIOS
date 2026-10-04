import { useState, useEffect, useMemo, useCallback } from "react";
import { calculateStatus } from "../data/expiryData";
import { recycleBinService } from "../services/recycleBinService";
import { getScopedKey, getUserScopeId } from "./userScope";

const STORAGE_KEY = "pharmacyExpiry";
const EXPIRY_UPDATED_EVENT = "meditrack_expiry_updated";

/**
 * Loads the current live expiry items from user-scoped localStorage.
 * Every user account starts with 0 items so they can track their own medicines.
 */
export function loadExpiryItems() {
  if (typeof window === "undefined") return [];
  const scopedKey = getScopedKey(STORAGE_KEY);

  try {
    const saved = localStorage.getItem(scopedKey);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Re-evaluate daysLeft and FEFO tier dynamically so dates never go stale
        return parsed.map((item, idx) => {
          const { status, daysLeft, color } = calculateStatus(item.expiryDate);
          return {
            ...item,
            id: item.id || `batch-${idx}`,
            daysLeft,
            status:
              item.status === "Quarantined" || item.status === "Returned"
                ? item.status
                : status,
            color:
              item.status === "Quarantined"
                ? "gray"
                : item.status === "Returned"
                ? "blue"
                : color,
          };
        });
      }
    }
  } catch (err) {
    console.warn("[expiryStore] Failed reading expiry items:", err);
  }

  // All user accounts start clean with 0 items
  try {
    localStorage.setItem(scopedKey, JSON.stringify([]));
  } catch {}
  return [];
}

/**
 * Saves expiry items to user-scoped localStorage and dispatches a cross-component notification event.
 */
export function saveExpiryItems(items) {
  if (typeof window === "undefined") return;
  const scopedKey = getScopedKey(STORAGE_KEY);
  try {
    localStorage.setItem(scopedKey, JSON.stringify(items));
    window.dispatchEvent(
      new CustomEvent(EXPIRY_UPDATED_EVENT, { detail: items })
    );
  } catch (err) {
    console.error("[expiryStore] Failed saving expiry items:", err);
  }
}

/**
 * Adds or updates an expiry item into the user's active FEFO tracking
 */
export function addExpiryItem(item) {
  if (!item || !item.expiryDate) return;
  const current = loadExpiryItems();
  const existsIndex = current.findIndex(
    (i) => i.id === item.id || (item.batchNumber && i.batchNumber === item.batchNumber)
  );

  const { status, daysLeft, color } = calculateStatus(item.expiryDate);
  const formatted = {
    id: item.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    medicineName: item.medicineName || item.name || "Unknown Medicine",
    batchNumber: item.batchNumber || item.batch || "N/A",
    quantity: Number(item.quantity ?? item.stock ?? 100),
    price: Number(item.price ?? item.sellingPrice ?? 50),
    expiryDate: item.expiryDate,
    daysLeft,
    status: item.status || status,
    color: item.status === "Quarantined" ? "gray" : item.status === "Returned" ? "blue" : color,
    supplier: item.supplier || item.manufacturer || "Standard Supplier",
    location: item.location || item.rack || "Shelf A-1",
  };

  let next;
  if (existsIndex >= 0) {
    next = [...current];
    next[existsIndex] = { ...next[existsIndex], ...formatted };
  } else {
    next = [formatted, ...current];
  }

  saveExpiryItems(next);
  return formatted;
}

/**
 * Calculates live FEFO escalation statistics and monetary values for Dashboard & Expiry pages.
 */
export function computeExpiryStats(items = []) {
  const criticalItems = items.filter((i) => i.status === "Critical");
  const warningItems = items.filter((i) => i.status === "Warning");
  const reviewItems = items.filter((i) => i.status === "Review");
  const expiredItems = items.filter((i) => i.status === "Expired");
  const quarantinedItems = items.filter((i) => i.status === "Quarantined");
  const returnedItems = items.filter((i) => i.status === "Returned");
  const safeItems = items.filter((i) => i.status === "Safe");

  const criticalVal = criticalItems.reduce(
    (acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.price) || 0),
    0
  );
  const warningVal = warningItems.reduce(
    (acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.price) || 0),
    0
  );
  const reviewVal = reviewItems.reduce(
    (acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.price) || 0),
    0
  );

  return {
    total: items.length,
    critical: criticalItems.length,
    warning: warningItems.length,
    review: reviewItems.length,
    expired: expiredItems.length,
    quarantined: quarantinedItems.length,
    returned: returnedItems.length,
    safe: safeItems.length,
    criticalVal,
    warningVal,
    reviewVal,
    totalAtRiskVal: criticalVal + warningVal + reviewVal,
    alerts: {
      critical: {
        label: "Critical",
        days: "≤30 days",
        count: criticalItems.length,
        value: criticalVal,
        color: "rose",
        description: "Quarantine + process for credit",
      },
      warning: {
        label: "Warning",
        days: "31-60 days",
        count: warningItems.length,
        value: warningVal,
        color: "amber",
        description: "Return to wholesaler or redistribute",
      },
      review: {
        label: "Review",
        days: "61-90 days",
        count: reviewItems.length,
        value: reviewVal,
        color: "yellow",
        description: "AI velocity review needed",
      },
    },
  };
}

/**
 * Universal React Hook that connects both Dashboard and ExpiryManagement to the live expiry data.
 */
export function useExpiryData() {
  const [items, setItems] = useState(loadExpiryItems);

  useEffect(() => {
    // Sync on user change or mount
    setItems(loadExpiryItems());

    const handleUpdate = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setItems(e.detail);
      } else {
        setItems(loadExpiryItems());
      }
    };

    const handleStorage = (e) => {
      const currentKey = getScopedKey(STORAGE_KEY);
      if (e.key === currentKey || e.key === "meditrack_user") {
        setItems(loadExpiryItems());
      }
    };

    window.addEventListener(EXPIRY_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(EXPIRY_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const stats = useMemo(() => computeExpiryStats(items), [items]);

  const quarantineItem = useCallback((id) => {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, status: "Quarantined", color: "gray" } : item
      );
      saveExpiryItems(next);
      return next;
    });
  }, []);

  const returnItem = useCallback((id) => {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, status: "Returned", color: "blue" } : item
      );
      saveExpiryItems(next);
      return next;
    });
  }, []);

  const deleteItem = useCallback((id, reason = "Removed from active inventory", deletedBy = "Pharmacist Admin") => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        recycleBinService.moveToTrash(target, reason, deletedBy);
      }
      const next = prev.filter((item) => item.id !== id);
      saveExpiryItems(next);
      return next;
    });
  }, []);

  const restoreItem = useCallback((restored) => {
    if (!restored) return;
    setItems((prev) => {
      const exists = prev.some((i) => i.id === restored.id || i.batchNumber === restored.batchNumber);
      const next = exists
        ? prev.map((i) => (i.id === restored.id ? { ...restored } : i))
        : [restored, ...prev];
      saveExpiryItems(next);
      return next;
    });
  }, []);

  const resetItems = useCallback(() => {
    saveExpiryItems([]);
    setItems([]);
    return [];
  }, []);

  const loadSampleData = useCallback(() => {
    return [];
  }, []);

  const clearAllData = useCallback(() => {
    saveExpiryItems([]);
    setItems([]);
    return [];
  }, []);

  return {
    items,
    setItems,
    stats,
    expiryAlerts: stats.alerts,
    quarantineItem,
    returnItem,
    deleteItem,
    restoreItem,
    resetItems,
    loadSampleData,
    clearAllData,
  };
}
