import defaultMedicines from "../data/catalogMedicines.json";

/**
 * Calculates the quantity of medicine to deduct based on prescription details.
 * e.g., frequency "1-0-1" (2/day) * duration "5 days" = 10 tablets
 */
export function calculateMedicineQuantity(med) {
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
      const firstWord = targetName.split(" ")[0];

      // Find in catalog or custom medicines
      const catalogMatch =
        custom.find(
          (m) =>
            m.name.toLowerCase() === targetName ||
            m.name.toLowerCase().startsWith(firstWord)
        ) ||
        defaultMedicines.find(
          (m) =>
            m.name.toLowerCase() === targetName ||
            m.name.toLowerCase().startsWith(firstWord) ||
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
