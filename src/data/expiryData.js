// Helper function to calculate status based on expiry date
const calculateStatus = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { status: 'Expired', daysLeft: diffDays, color: 'red' };
  if (diffDays <= 30) return { status: 'Critical', daysLeft: diffDays, color: 'red' };
  if (diffDays <= 60) return { status: 'Warning', daysLeft: diffDays, color: 'yellow' };
  if (diffDays <= 90) return { status: 'Review', daysLeft: diffDays, color: 'blue' };
  return { status: 'Safe', daysLeft: diffDays, color: 'green' };
};

// Mock data
const rawExpiryData = [
  {
    id: "EXP-001",
    medicineName: "Amoxicillin 250mg",
    batchNumber: "AMX2023B",
    quantity: 20,
    expiryDate: "2024-05-15",
    supplier: "MediSource Ltd",
    location: "Shelf A-12",
  },
  {
    id: "EXP-002",
    medicineName: "Paracetamol 500mg",
    batchNumber: "PCM2024A",
    quantity: 150,
    expiryDate: "2026-12-31",
    supplier: "PharmaDistributors Inc",
    location: "Shelf B-04",
  },
  {
    id: "EXP-003",
    medicineName: "Ibuprofen 400mg",
    batchNumber: "IBU2022C",
    quantity: 3,
    expiryDate: "2025-10-19",
    supplier: "Global Meds",
    location: "Shelf C-08",
  },
  {
    id: "EXP-004",
    medicineName: "Insulin Glargine 100IU",
    batchNumber: "INS-2026-007",
    quantity: 18,
    expiryDate: "2026-11-20",
    supplier: "Novo Nordisk",
    location: "Cold Storage",
  },
  {
    id: "EXP-005",
    medicineName: "Cetirizine 10mg",
    batchNumber: "CET2025X",
    quantity: 200,
    expiryDate: "2027-06-30",
    supplier: "Sun Pharma",
    location: "Shelf D-02",
  },
];

// Export with calculated status
export const initialExpiryData = rawExpiryData.map(item => {
  const { status, daysLeft, color } = calculateStatus(item.expiryDate);
  return { ...item, status, daysLeft, color };
});