import defaultMedicines from "../data/catalogMedicines.json";
import { medicinesAPI } from "../services/api";
import { inventoryFirebaseService } from "../services/inventoryFirebaseService";
import { suppliersFirebaseService } from "../services/suppliersFirebaseService";
import { getScopedKey } from "./userScope";

const STORAGE_CUSTOM_MEDICINES = "meditrack_custom_medicines";
const STORAGE_OVERRIDES = "meditrack_medicine_overrides";
const STORAGE_DELETED = "meditrack_deleted_medicines";

/**
 * Returns the current active inventory including custom created medicines
 * and any stock/batch overrides.
 */
export function getLiveInventory() {
  if (typeof window === "undefined") return defaultMedicines;
  try {
    const deletedIds = new Set(
      JSON.parse(localStorage.getItem(getScopedKey(STORAGE_DELETED)) || "[]")
    );
    const overrides = JSON.parse(
      localStorage.getItem(getScopedKey(STORAGE_OVERRIDES)) || "{}"
    );
    const custom = JSON.parse(
      localStorage.getItem(getScopedKey(STORAGE_CUSTOM_MEDICINES)) || "[]"
    );

    const mergedCatalog = defaultMedicines
      .filter((m) => !deletedIds.has(String(m.id)) && !deletedIds.has(m.name))
      .map((m) => {
        const override = overrides[m.id] || overrides[m.name];
        if (!override) return m;
        return {
          ...m,
          stock: override.stock !== undefined ? override.stock : m.stock,
          batch: override.batch || m.batch,
          rack: override.rack || m.rack,
        };
      });

    const mergedCustom = custom
      .filter((m) => !deletedIds.has(String(m.id)) && !deletedIds.has(m.name))
      .map((m) => {
        const override = overrides[m.id] || overrides[m.name];
        if (!override) return m;
        return {
          ...m,
          stock: override.stock !== undefined ? override.stock : m.stock,
          batch: override.batch || m.batch,
          rack: override.rack || m.rack,
        };
      });

    return [...mergedCustom, ...mergedCatalog];
  } catch (err) {
    console.debug("[medicineImportService] Read fallback:", err);
    return defaultMedicines;
  }
}

/**
 * Matches an extracted medicine name against the inventory.
 */
export function matchMedicineWithInventory(itemName = "", itemGeneric = "", inventory = null) {
  const inv = inventory || getLiveInventory();
  if (!itemName) return { matched: null, confidence: "none" };

  const cleanName = itemName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanGeneric = (itemGeneric || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const firstWord = itemName.trim().toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, "");

  // 1. Exact match
  for (const m of inv) {
    const mName = String(m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (mName === cleanName) {
      return { matched: m, confidence: "exact" };
    }
  }

  // 2. Contains match
  for (const m of inv) {
    const mName = String(m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const mFull = String(m.fullName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (mName.includes(cleanName) || cleanName.includes(mName) || mFull.includes(cleanName)) {
      return { matched: m, confidence: "high" };
    }
  }

  // 3. First significant word prefix (e.g. "Augmentin" or "Dolo")
  if (firstWord.length >= 4) {
    for (const m of inv) {
      const mName = String(m.name || "").toLowerCase();
      if (mName.startsWith(firstWord)) {
        return { matched: m, confidence: "medium" };
      }
    }
  }

  // 4. Generic match if available
  if (cleanGeneric && cleanGeneric.length >= 5) {
    for (const m of inv) {
      const mGen = String(m.generic || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (mGen && (mGen.includes(cleanGeneric) || cleanGeneric.includes(mGen))) {
        return { matched: m, confidence: "generic" };
      }
    }
  }

  return { matched: null, confidence: "none" };
}

/**
 * Executes a batch of medicine imports (creating new medicines and updating existing stocks).
 * Synchronizes with MongoDB Server API and browser localStorage.
 */
export async function applyImportBatch(itemsToApply) {
  if (!Array.isArray(itemsToApply) || itemsToApply.length === 0) {
    return { added: [], updated: [], total: 0 };
  }

  const added = [];
  const updated = [];

  // Read current storage
  let customMedicines = [];
  let overrides = {};

  try {
    const savedCustom = localStorage.getItem(getScopedKey(STORAGE_CUSTOM_MEDICINES));
    if (savedCustom) customMedicines = JSON.parse(savedCustom);
  } catch (e) {
    console.debug(e);
  }

  try {
    const savedOverrides = localStorage.getItem(getScopedKey(STORAGE_OVERRIDES));
    if (savedOverrides) overrides = JSON.parse(savedOverrides);
  } catch (e) {
    console.debug(e);
  }

  for (const item of itemsToApply) {
    const qty = Math.max(1, Number(item.quantity) || 100);
    const action = item.action || "increase";

    if (item.isMatched && item.matchedMedicine && action !== "create") {
      // --- UPDATE EXISTING STOCK ---
      const med = item.matchedMedicine;
      const currentOverride = overrides[med.id] || overrides[med.name];
      const currentStock = currentOverride?.stock !== undefined ? currentOverride.stock : (Number(med.stock) || 0);

      let finalStock = currentStock;
      if (action === "increase") finalStock = currentStock + qty;
      else if (action === "decrease") finalStock = Math.max(0, currentStock - qty);
      else if (action === "set") finalStock = qty;

      const updatedBatch = item.batch || currentOverride?.batch || med.batch;
      const updatedRack = item.rack || currentOverride?.rack || med.rack;
      const updatedPrice = Number(item.price) || med.price || 50;

      // Update override
      overrides[med.id] = {
        stock: finalStock,
        batch: updatedBatch,
        rack: updatedRack,
      };
      if (med.name) overrides[med.name] = overrides[med.id];

      // Update Firestore backend
      try {
        inventoryFirebaseService.updateStock(med.id, finalStock).catch(() => {});
      } catch (_) {}

      // Update API backend
      try {
        await medicinesAPI.update(med.id, {
          code: med.id,
          name: med.name,
          fullName: med.fullName || med.name,
          stock: finalStock,
          quantity: finalStock,
          batch: updatedBatch,
          rack: updatedRack,
          price: updatedPrice,
          sellingPrice: updatedPrice,
          expiry: item.expiry || med.expiry,
        });
      } catch (err) {
        console.warn("[medicineImportService] Backend update fallback:", err.message);
      }

      updated.push({
        id: med.id,
        name: med.name,
        previousStock: currentStock,
        newStock: finalStock,
        delta: finalStock - currentStock,
        action,
      });
    } else {
      // --- CREATE NEW MEDICINE ---
      const tempId = `med-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const newMed = {
        id: tempId,
        code: tempId,
        name: item.name,
        fullName: item.generic ? `${item.name} (${item.generic})` : item.name,
        brandName: item.name,
        generic: item.generic || "General Formulation",
        manufacturer: item.manufacturer || "Standard Pharma",
        category: item.category || "Other",
        batch: item.batch || `BAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        rack: item.rack || "R-1",
        stock: qty,
        quantity: qty,
        price: Number(item.price) || 50,
        sellingPrice: Number(item.price) || 50,
        schedule: item.schedule || "OTC",
        expiry: item.expiry || "2027-12-31",
        isCustom: true,
      };

      // Add to custom list
      customMedicines.unshift(newMed);

      // Save to Firestore
      try {
        inventoryFirebaseService.createMedicine(newMed).catch(() => {});
      } catch (_) {}

      // Save to API backend
      try {
        await medicinesAPI.create({
          ...newMed,
          mrp: (Number(item.price) || 50) * 1.2,
          reorderLevel: 20,
        });
      } catch (err) {
        console.warn("[medicineImportService] Backend create fallback:", err.message);
      }

      // Auto-sync supplier
      try {
        suppliersFirebaseService.syncWithMedicineAdded(newMed).catch(() => {});
      } catch (_) {}

      added.push(newMed);
    }
  }

  // Persist updated states to scoped localStorage
  try {
    localStorage.setItem(getScopedKey(STORAGE_CUSTOM_MEDICINES), JSON.stringify(customMedicines));
    localStorage.setItem(getScopedKey(STORAGE_OVERRIDES), JSON.stringify(overrides));
  } catch (err) {
    console.error("[medicineImportService] Persist error:", err);
  }

  // Broadcast sync events across entire application
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("meditrack_stock_updated"));
    window.dispatchEvent(new CustomEvent("meditrack_medicines_updated", {
      detail: { added, updated }
    }));
  }

  return {
    added,
    updated,
    total: added.length + updated.length,
  };
}
