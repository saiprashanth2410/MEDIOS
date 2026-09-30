import { useState, useEffect, useMemo, useCallback } from "react";
import { getInitialExpiryData, calculateStatus } from "../data/expiryData";

const STORAGE_KEY = "pharmacyExpiry";
const EXPIRY_UPDATED_EVENT = "meditrack_expiry_updated";

/**
 * Loads the current live expiry items from localStorage or initializes with master FEFO items.
 */
export function loadExpiryItems() {
  if (typeof window === "undefined") return getInitialExpiryData();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
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
    console.warn("[expiryStore] Failed reading pharmacyExpiry from localStorage:", err);
  }

  // Initialize and persist default 48 FEFO items
  const fresh = getInitialExpiryData();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch (err) {
    console.debug("[expiryStore] Could not persist default:", err);
  }
  return fresh;
}

/**
 * Saves expiry items to localStorage and dispatches a cross-component notification event.
 */
export function saveExpiryItems(items) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(
      new CustomEvent(EXPIRY_UPDATED_EVENT, { detail: items })
    );
  } catch (err) {
    console.error("[expiryStore] Failed saving pharmacyExpiry:", err);
  }
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
    const handleUpdate = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setItems(e.detail);
      } else {
        setItems(loadExpiryItems());
      }
    };

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
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

  const deleteItem = useCallback((id) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveExpiryItems(next);
      return next;
    });
  }, []);

  const resetItems = useCallback(() => {
    const fresh = getInitialExpiryData();
    saveExpiryItems(fresh);
    setItems(fresh);
    return fresh;
  }, []);

  return {
    items,
    setItems,
    stats,
    expiryAlerts: stats.alerts,
    quarantineItem,
    returnItem,
    deleteItem,
    resetItems,
  };
}
