/* =====================================================
   MEDICINES DATABASE (Demo)
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
  const clean = String(barcode).trim();
  return MEDICINES.find((m) => m.barcode === clean) || null;
}
