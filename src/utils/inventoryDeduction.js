import defaultMedicines from "../data/catalogMedicines.json";
import { inventoryFirebaseService } from "../services/inventoryFirebaseService";

/**
 * Calculates the quantity of medicine to deduct based on prescription details.
 * e.g., frequency "1-0-1" (2/day) * duration "5 days" = 10 tablets
 */
export function calculateMedicineQuantity(med) {
  if (!med) return 10;
  if (med.quantity && Number(med.quantity) > 0) {
    return Number(med.quantity);
  }

  let perDay = 1;
  const freq = String(med.frequency || "").trim();
  if (freq.includes("-")) {
    const parts = freq.split("-").map((p) => Number(p.trim()) || 0);
    const sum = parts.reduce((a, b) => a + b, 0);
    if (sum > 0) perDay = sum;
  } else if (/bd|bid|twice/i.test(freq)) {
    perDay = 2;
  } else if (/tds|tid|thrice/i.test(freq)) {
    perDay = 3;
  } else if (/qid|4 times/i.test(freq)) {
    perDay = 4;
  } else if (/od|once|daily/i.test(freq)) {
    perDay = 1;
  }

  let days = 5;
  const dur = String(med.duration || "").trim();
  const durMatch = dur.match(/(\d+)\s*(day|days|week|weeks|month|months)?/i);
  if (durMatch) {
    const val = Number(durMatch[1]);
    const unit = (durMatch[2] || "days").toLowerCase();
    if (unit.startsWith("week")) days = val * 7;
    else if (unit.startsWith("month")) days = val * 30;
    else days = val;
  }

  const total = perDay * days;
  return total > 0 ? total : 10;
}

/**
 * Helper to get live in-memory/persisted inventory list
 */
function getActiveInventory() {
  if (typeof window === "undefined") return defaultMedicines;
  try {
    const deletedIds = new Set(
      JSON.parse(localStorage.getItem("meditrack_deleted_medicines") || "[]")
    );
    const overrides = JSON.parse(
      localStorage.getItem("meditrack_medicine_overrides") || "{}"
    );
    const custom = JSON.parse(
      localStorage.getItem("meditrack_custom_medicines") || "[]"
    );

    const merged = defaultMedicines
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

    const activeCustom = custom
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

    return [...activeCustom, ...merged];
  } catch (e) {
    console.debug("Failed to read active inventory:", e);
    return defaultMedicines;
  }
}

/**
 * Checks stock availability for a given prescribed medicine.
 * Returns: { status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_FOUND', availableStock, requestedQty, medicine }
 */
export function checkMedicineStock(med) {
  if (!med || !med.name) {
    return {
      status: "NOT_FOUND",
      availableStock: 0,
      requestedQty: 10,
      medicine: null,
    };
  }

  const requestedQty = calculateMedicineQuantity(med);
  const inventory = getActiveInventory();
  const searchName = med.name.trim().toLowerCase();
  const firstWord = searchName.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "");

  // Match by exact name or strong prefix
  const matched = inventory.find((m) => {
    const mName = String(m.name || "").toLowerCase();
    const mFull = String(m.fullName || "").toLowerCase();
    return (
      mName === searchName ||
      (firstWord.length >= 3 && mName.startsWith(firstWord)) ||
      mFull.includes(searchName)
    );
  });

  if (!matched) {
    return {
      status: "NOT_FOUND",
      availableStock: 0,
      requestedQty,
      medicine: null,
    };
  }

  const stock = Number(matched.stock) || 0;
  if (stock <= 0) {
    return {
      status: "OUT_OF_STOCK",
      availableStock: 0,
      requestedQty,
      medicine: matched,
    };
  }

  if (stock < requestedQty) {
    return {
      status: "LOW_STOCK",
      availableStock: stock,
      requestedQty,
      medicine: matched,
    };
  }

  return {
    status: "IN_STOCK",
    availableStock: stock,
    requestedQty,
    medicine: matched,
  };
}

/**
 * Finds in-stock generic or category substitutes for an unavailable medicine.
 */
export function findSubstitutes(med, maxResults = 3) {
  if (!med || !med.name) return [];

  const inventory = getActiveInventory();
  const medName = med.name.trim().toLowerCase();
  const firstWord = medName.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "");
  const targetGeneric = String(med.generic || "").trim().toLowerCase();

  // Extract significant words from name or generic (e.g. "Paracetamol", "Amoxicillin")
  const keywords = [
    targetGeneric,
    firstWord.length >= 4 ? firstWord : "",
  ].filter(Boolean);

  // Available medicines with actual stock > 0
  const availableMeds = inventory.filter(
    (m) =>
      Number(m.stock) > 0 &&
      m.name.toLowerCase() !== medName &&
      !m.name.toLowerCase().startsWith(firstWord)
  );

  const scored = [];

  for (const candidate of availableMeds) {
    const candName = String(candidate.name || "").toLowerCase();
    const candGeneric = String(candidate.generic || "").toLowerCase();
    const candFull = String(candidate.fullName || "").toLowerCase();
    const candCategory = String(candidate.category || "").toLowerCase();

    let score = 0;
    let matchReason = "";

    // 1. Generic salt match (highest clinical priority)
    for (const kw of keywords) {
      if (kw && (candGeneric.includes(kw) || candFull.includes(kw) || candName.includes(kw))) {
        score += 100;
        matchReason = `Exact generic salt match (${candidate.generic || kw})`;
        break;
      }
    }

    // 2. Therapeutic Category match (fallback when exact salt isn't in stock)
    if (score === 0 && med.category) {
      const medCat = String(med.category).toLowerCase();
      if (candCategory === medCat && candCategory !== "other") {
        score += 40;
        matchReason = `Same therapeutic category (${candidate.category})`;
      }
    }

    if (score > 0) {
      scored.push({
        id: candidate.id,
        name: candidate.name,
        fullName: candidate.fullName || candidate.name,
        generic: candidate.generic || candidate.name,
        category: candidate.category || "Pharmaceutical",
        stock: candidate.stock,
        rack: candidate.rack || "R-1",
        price: candidate.price || candidate.sellingPrice || 35,
        score,
        matchReason,
      });
    }
  }

  // Sort by highest match score, then highest available stock
  scored.sort((a, b) => b.score - a.score || b.stock - a.stock);
  return scored.slice(0, maxResults);
}

/**
 * Adds an out-of-stock medicine to the pharmacy's reorder list.
 */
export function addMedicineToReorder(medName, requestedQty = 50) {
  try {
    const saved = JSON.parse(
      localStorage.getItem("meditrack_reorder_list") || "[]"
    );
    const existingIndex = saved.findIndex(
      (item) => item.name.toLowerCase() === medName.toLowerCase()
    );
    if (existingIndex >= 0) {
      saved[existingIndex].quantity += requestedQty;
      saved[existingIndex].updatedAt = new Date().toISOString();
    } else {
      saved.push({
        id: `REORDER-${Date.now()}`,
        name: medName,
        quantity: Math.max(50, requestedQty * 2), // standard pack size
        status: "Pending Order",
        addedAt: new Date().toISOString(),
      });
    }
    localStorage.setItem("meditrack_reorder_list", JSON.stringify(saved));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("meditrack_reorder_updated"));
    }
    return true;
  } catch (e) {
    console.error("Failed to add to reorder list:", e);
    return false;
  }
}

/**
 * Automatically deducts stock from inventory when a prescription is dispensed.
 * Updates local overrides and dispatches an event so Medicines page reflects it immediately.
 */
export function deductPrescriptionInventory(prescription) {
  if (!prescription || !Array.isArray(prescription.medicines)) return [];

  const deductedItems = [];
  try {
    let overrides = {};
    try {
      const saved = localStorage.getItem("meditrack_medicine_overrides");
      if (saved) overrides = JSON.parse(saved);
    } catch (e) {
      console.debug("Overrides read error:", e);
    }

    let custom = [];
    try {
      const savedCustom = localStorage.getItem("meditrack_custom_medicines");
      if (savedCustom) custom = JSON.parse(savedCustom);
    } catch (e) {
      console.debug("Custom medicines read error:", e);
    }

    prescription.medicines.forEach((rxMed) => {
      if (!rxMed.name) return;
      const targetName = rxMed.name.trim().toLowerCase();
      const firstWord = targetName.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "");

      // Find in custom medicines or catalog
      const catalogMatch =
        custom.find(
          (m) =>
            m.name.toLowerCase() === targetName ||
            (firstWord.length >= 3 && m.name.toLowerCase().startsWith(firstWord))
        ) ||
        defaultMedicines.find(
          (m) =>
            m.name.toLowerCase() === targetName ||
            (firstWord.length >= 3 && m.name.toLowerCase().startsWith(firstWord)) ||
            m.fullName.toLowerCase().includes(firstWord)
        );

      const qty = calculateMedicineQuantity(rxMed);

      if (catalogMatch) {
        const id = catalogMatch.id;
        const currentOverride = overrides[id] || overrides[catalogMatch.name];
        const currentStock =
          currentOverride?.stock !== undefined
            ? currentOverride.stock
            : catalogMatch.stock;

        const newStock = Math.max(0, currentStock - qty);

        overrides[id] = {
          ...currentOverride,
          stock: newStock,
          batch: currentOverride?.batch || catalogMatch.batch,
          rack: currentOverride?.rack || catalogMatch.rack,
        };
        overrides[catalogMatch.name] = overrides[id];

        deductedItems.push({
          name: catalogMatch.name,
          deducted: qty,
          remaining: newStock,
        });
      } else {
        const currentStock = overrides[rxMed.name]?.stock ?? 50;
        const newStock = Math.max(0, currentStock - qty);
        overrides[rxMed.name] = {
          stock: newStock,
        };
        deductedItems.push({
          name: rxMed.name,
          deducted: qty,
          remaining: newStock,
        });
      }

      // Sync deduction with Firestore in real-time
      inventoryFirebaseService.deductMedicineStock(rxMed.name, qty).catch((fbErr) => {
        console.warn("[inventoryDeduction] Firestore stock sync notice:", fbErr?.message);
      });
    });

    localStorage.setItem(
      "meditrack_medicine_overrides",
      JSON.stringify(overrides)
    );

    // Notify any listening pages/tabs
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("meditrack_stock_updated"));
    }
  } catch (err) {
    console.error("Failed to deduct inventory locally:", err);
  }

  return deductedItems;
}

/**
 * Automatically deducts stock from inventory when a POS cart is dispensed.
 * Updates local overrides and dispatches an event so Medicines page reflects it immediately.
 */
export function deductCartFromInventory(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return [];

  const deductedItems = [];
  try {
    let overrides = {};
    try {
      const saved = localStorage.getItem("meditrack_medicine_overrides");
      if (saved) overrides = JSON.parse(saved);
    } catch (e) {
      console.debug("Overrides read error:", e);
    }

    let custom = [];
    try {
      const savedCustom = localStorage.getItem("meditrack_custom_medicines");
      if (savedCustom) custom = JSON.parse(savedCustom);
    } catch (e) {
      console.debug("Custom medicines read error:", e);
    }

    cartItems.forEach((cartItem) => {
      if (!cartItem || !cartItem.name) return;
      const targetName = cartItem.name.trim().toLowerCase();
      const targetId = cartItem.id ? String(cartItem.id) : null;
      const qty = Math.max(1, Number(cartItem.quantity) || 1);

      // Match in custom medicines or defaultMedicines catalog
      const catalogMatch =
        (targetId && custom.find((m) => String(m.id) === targetId)) ||
        custom.find((m) => m.name.toLowerCase() === targetName) ||
        (targetId && defaultMedicines.find((m) => String(m.id) === targetId)) ||
        defaultMedicines.find((m) => m.name.toLowerCase() === targetName);

      if (catalogMatch) {
        const id = catalogMatch.id;
        const currentOverride = overrides[id] || overrides[catalogMatch.name];
        const currentStock =
          currentOverride?.stock !== undefined
            ? currentOverride.stock
            : catalogMatch.stock;

        const newStock = Math.max(0, currentStock - qty);

        overrides[id] = {
          ...currentOverride,
          stock: newStock,
          batch: currentOverride?.batch || catalogMatch.batch,
          rack: currentOverride?.rack || catalogMatch.rack,
        };
        overrides[catalogMatch.name] = overrides[id];

        deductedItems.push({
          id,
          name: catalogMatch.name,
          deducted: qty,
          remaining: newStock,
        });
      } else {
        const key = targetId || cartItem.name;
        const currentStock = overrides[key]?.stock ?? 50;
        const newStock = Math.max(0, currentStock - qty);
        overrides[key] = {
          stock: newStock,
        };
        overrides[cartItem.name] = overrides[key];
        deductedItems.push({
          id: key,
          name: cartItem.name,
          deducted: qty,
          remaining: newStock,
        });
      }

      // Sync deduction with Firestore in real-time
      inventoryFirebaseService
        .deductMedicineStock(cartItem.id || cartItem.name, qty)
        .catch((fbErr) => {
          console.warn("[inventoryDeduction] Firestore stock sync notice:", fbErr?.message);
        });
    });

    localStorage.setItem(
      "meditrack_medicine_overrides",
      JSON.stringify(overrides)
    );

    // Notify any listening pages/tabs
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("meditrack_stock_updated"));
    }
  } catch (err) {
    console.error("Failed to deduct cart inventory locally:", err);
  }

  return deductedItems;
}
