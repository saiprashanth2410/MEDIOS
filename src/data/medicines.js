import { getScopedKey } from "../utils/userScope";
import catalogMedicines from "./catalogMedicines.json";

/* =====================================================
   MEDICINES DATABASE
===================================================== */

export const MEDICINES = [
  {
    id: "MED-001",
    barcode: "8901234567890",
    name: "Amoxicillin 500mg",
    generic: "Amoxicillin",
    manufacturer: "Cipla Ltd",
    batch: "AMX-2026-042",
    expiry: "2027-12-31",
    stock: 240,
    price: 45.0,
    category: "Antibiotic",
    schedule: "H",
    rack: "A-12",
  },
  {
    id: "MED-002",
    barcode: "8901234567891",
    name: "Paracetamol 650mg",
    generic: "Acetaminophen",
    manufacturer: "Sun Pharma",
    batch: "PCM-2026-018",
    expiry: "2027-08-15",
    stock: 850,
    price: 12.5,
    category: "Analgesic",
    schedule: "OTC",
    rack: "B-04",
  },
  {
    id: "MED-003",
    barcode: "8901234567892",
    name: "Insulin Glargine 100IU",
    generic: "Insulin Glargine",
    manufacturer: "Novo Nordisk",
    batch: "INS-2026-007",
    expiry: "2026-11-20",
    stock: 18,
    price: 850.0,
    category: "Antidiabetic",
    schedule: "H1",
    rack: "COLD-01",
  },
  {
    id: "MED-004",
    barcode: "8901234567893",
    name: "Azithromycin 500mg",
    generic: "Azithromycin",
    manufacturer: "Alkem Labs",
    batch: "AZI-2026-033",
    expiry: "2027-06-30",
    stock: 65,
    price: 78.0,
    category: "Antibiotic",
    schedule: "H",
    rack: "A-08",
  },
  {
    id: "MED-005",
    barcode: "8901234567894",
    name: "Cetirizine 10mg",
    generic: "Cetirizine HCl",
    manufacturer: "Dr. Reddy's",
    batch: "CTZ-2026-021",
    expiry: "2028-03-10",
    stock: 420,
    price: 22.0,
    category: "Antihistamine",
    schedule: "OTC",
    rack: "C-15",
  },
];

export function findMedicineByBarcode(barcode) {
  if (!barcode) return null;
  const clean = String(barcode).trim().toLowerCase();

  // 1. Check user-scoped custom inventory
  try {
    const customKey = getScopedKey("meditrack_custom_medicines");
    const rawCustom = typeof window !== "undefined" ? localStorage.getItem(customKey) : null;
    if (rawCustom) {
      const customList = JSON.parse(rawCustom);
      const match = customList.find(
        (m) =>
          String(m.barcode || "").toLowerCase() === clean ||
          String(m.id || "").toLowerCase() === clean ||
          String(m.code || "").toLowerCase() === clean ||
          String(m.batch || "").toLowerCase() === clean
      );
      if (match) return match;
    }
  } catch (_) {}

  // 2. Check user-scoped batches
  try {
    const batchesKey = getScopedKey("meditrack_batches");
    const rawBatches = typeof window !== "undefined" ? localStorage.getItem(batchesKey) : null;
    if (rawBatches) {
      const batchesList = JSON.parse(rawBatches);
      const match = batchesList.find(
        (b) =>
          String(b.barcode || "").toLowerCase() === clean ||
          String(b.batchNumber || "").toLowerCase() === clean ||
          String(b.id || "").toLowerCase() === clean
      );
      if (match) {
        return {
          id: match.id || match.batchNumber,
          barcode: match.barcode || clean,
          name: match.medicineName || match.name,
          generic: match.generic || "",
          batch: match.batchNumber || match.batch,
          expiry: match.expiryDate || match.expiry,
          stock: match.quantity || match.stock || 0,
          price: match.price || match.mrp || 0,
          rack: match.rack || "R-1",
        };
      }
    }
  } catch (_) {}

  // 3. Check national catalog database
  try {
    if (Array.isArray(catalogMedicines)) {
      const catMatch = catalogMedicines.find(
        (m) =>
          String(m.barcode || "").toLowerCase() === clean ||
          String(m.id || "").toLowerCase() === clean ||
          String(m.code || "").toLowerCase() === clean
      );
      if (catMatch) return catMatch;
    }
  } catch (_) {}

  // 4. Reference match fallback
  return (
    MEDICINES.find(
      (m) =>
        String(m.barcode || "").toLowerCase() === clean ||
        String(m.id || "").toLowerCase() === clean
    ) || null
  );
}
