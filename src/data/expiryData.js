// Helper to calculate exact dynamic ISO date strings relative to today
const getRelativeDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

// Helper function to calculate FEFO 90/60/30 status based on expiry date
export const calculateStatus = (expiryDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: "Expired", daysLeft: diffDays, color: "red" };
  }
  if (diffDays <= 30) {
    return { status: "Critical", daysLeft: diffDays, color: "rose" };
  }
  if (diffDays <= 60) {
    return { status: "Warning", daysLeft: diffDays, color: "amber" };
  }
  if (diffDays <= 90) {
    return { status: "Review", daysLeft: diffDays, color: "yellow" };
  }
  return { status: "Safe", daysLeft: diffDays, color: "emerald" };
};

// Master FEFO 90/60/30 escalation dataset:
// Exactly 48 near-expiry items across 3 tiers:
// - 8 Critical (≤30d) = ₹24,500 at risk
// - 15 Warning (31–60d) = ₹67,800 at risk
// - 25 Review (61–90d) = ₹1,45,000 at risk
// Total = 48 items | Total At-Risk Value = ₹2,37,300
export const generateRawExpiryData = () => [
  /* =====================================================
     1. CRITICAL (≤30 DAYS) — EXACTLY 8 ITEMS (₹24,500 at risk)
  ===================================================== */
  {
    id: "EXP-CRT-01",
    medicineName: "Safedox 200mg (Cefpodoxime)",
    batchNumber: "SFD-2026-09",
    quantity: 45,
    expiryDate: getRelativeDate(4),
    price: 80,
    supplier: "Sun Life Sciences",
    location: "Shelf A-01",
  },
  {
    id: "EXP-CRT-02",
    medicineName: "Augmentin 625 Duo (Amoxicillin + Clav)",
    batchNumber: "AUG-2026-11",
    quantity: 60,
    expiryDate: getRelativeDate(8),
    price: 80,
    supplier: "GlaxoSmithKline",
    location: "Shelf A-02",
  },
  {
    id: "EXP-CRT-03",
    medicineName: "Paracetamol 650mg (Dolo)",
    batchNumber: "PCM-2026-22",
    quantity: 120,
    expiryDate: getRelativeDate(12),
    price: 20,
    supplier: "Micro Labs Ltd",
    location: "Shelf A-03",
  },
  {
    id: "EXP-CRT-04",
    medicineName: "Insulin Glargine 100IU",
    batchNumber: "INS-2026-07",
    quantity: 8,
    expiryDate: getRelativeDate(15),
    price: 525,
    supplier: "Novo Nordisk",
    location: "Cold Storage 01",
  },
  {
    id: "EXP-CRT-05",
    medicineName: "Azithromycin 500mg (Azee)",
    batchNumber: "AZI-2026-44",
    quantity: 35,
    expiryDate: getRelativeDate(19),
    price: 90,
    supplier: "Cipla Ltd",
    location: "Shelf A-04",
  },
  {
    id: "EXP-CRT-06",
    medicineName: "Pantocid 40mg (Pantoprazole)",
    batchNumber: "PAN-2026-03",
    quantity: 50,
    expiryDate: getRelativeDate(22),
    price: 45,
    supplier: "Sun Pharma",
    location: "Shelf A-05",
  },
  {
    id: "EXP-CRT-07",
    medicineName: "Cetirizine 10mg (Cetzine)",
    batchNumber: "CET-2026-88",
    quantity: 80,
    expiryDate: getRelativeDate(25),
    price: 20,
    supplier: "Dr. Reddy's",
    location: "Shelf A-06",
  },
  {
    id: "EXP-CRT-08",
    medicineName: "Amoxicillin 250mg (Novamox)",
    batchNumber: "AMX-2026-15",
    quantity: 50,
    expiryDate: getRelativeDate(28),
    price: 50,
    supplier: "Alkem Labs",
    location: "Shelf A-07",
  },

  /* =====================================================
     2. WARNING (31–60 DAYS) — EXACTLY 15 ITEMS (₹67,800 at risk)
  ===================================================== */
  {
    id: "EXP-WRN-01",
    medicineName: "Metformin 500mg (Glycomet)",
    batchNumber: "MET-2026-12",
    quantity: 150,
    expiryDate: getRelativeDate(33),
    price: 20,
    supplier: "USV Private Ltd",
    location: "Shelf B-01",
  },
  {
    id: "EXP-WRN-02",
    medicineName: "Telmisartan 40mg (Telma)",
    batchNumber: "TEL-2026-90",
    quantity: 110,
    expiryDate: getRelativeDate(35),
    price: 40,
    supplier: "Glenmark Pharma",
    location: "Shelf B-02",
  },
  {
    id: "EXP-WRN-03",
    medicineName: "Montair-LC (Montelukast + Levo)",
    batchNumber: "MON-2026-04",
    quantity: 85,
    expiryDate: getRelativeDate(37),
    price: 80,
    supplier: "Cipla Ltd",
    location: "Shelf B-03",
  },
  {
    id: "EXP-WRN-04",
    medicineName: "Atorvastatin 10mg (Atorva)",
    batchNumber: "ATR-2026-55",
    quantity: 90,
    expiryDate: getRelativeDate(39),
    price: 50,
    supplier: "Zydus Cadila",
    location: "Shelf B-04",
  },
  {
    id: "EXP-WRN-05",
    medicineName: "Ciprofloxacin 500mg (Ciplox)",
    batchNumber: "CIP-2026-21",
    quantity: 70,
    expiryDate: getRelativeDate(41),
    price: 50,
    supplier: "Cipla Ltd",
    location: "Shelf B-05",
  },
  {
    id: "EXP-WRN-06",
    medicineName: "Clavam 625mg Tablet",
    batchNumber: "CLM-2026-19",
    quantity: 55,
    expiryDate: getRelativeDate(43),
    price: 100,
    supplier: "Alkem Labs",
    location: "Shelf B-06",
  },
  {
    id: "EXP-WRN-07",
    medicineName: "Zifi 200mg (Cefixime)",
    batchNumber: "ZIF-2026-62",
    quantity: 65,
    expiryDate: getRelativeDate(45),
    price: 70,
    supplier: "FDC Limited",
    location: "Shelf B-07",
  },
  {
    id: "EXP-WRN-08",
    medicineName: "Monocef 1g Injection",
    batchNumber: "MNC-2026-08",
    quantity: 40,
    expiryDate: getRelativeDate(47),
    price: 80,
    supplier: "Aristo Pharma",
    location: "Shelf B-08",
  },
  {
    id: "EXP-WRN-09",
    medicineName: "Thyronorm 50mcg",
    batchNumber: "THY-2026-73",
    quantity: 100,
    expiryDate: getRelativeDate(49),
    price: 35,
    supplier: "Abbott India",
    location: "Shelf B-09",
  },
  {
    id: "EXP-WRN-10",
    medicineName: "Rosuvas 10mg (Rosuvastatin)",
    batchNumber: "ROS-2026-31",
    quantity: 80,
    expiryDate: getRelativeDate(51),
    price: 60,
    supplier: "Sun Pharma",
    location: "Shelf B-10",
  },
  {
    id: "EXP-WRN-11",
    medicineName: "Shelcal 500mg Tablet",
    batchNumber: "SHL-2026-14",
    quantity: 95,
    expiryDate: getRelativeDate(53),
    price: 40,
    supplier: "Torrent Pharma",
    location: "Shelf B-11",
  },
  {
    id: "EXP-WRN-12",
    medicineName: "Pan-D Capsule",
    batchNumber: "PND-2026-77",
    quantity: 120,
    expiryDate: getRelativeDate(55),
    price: 50,
    supplier: "Alkem Labs",
    location: "Shelf B-12",
  },
  {
    id: "EXP-WRN-13",
    medicineName: "Enzoflam Pain Relief Tablet",
    batchNumber: "ENZ-2026-23",
    quantity: 75,
    expiryDate: getRelativeDate(56),
    price: 60,
    supplier: "Alkem Labs",
    location: "Shelf B-13",
  },
  {
    id: "EXP-WRN-14",
    medicineName: "Becosules Vitamin B Complex",
    batchNumber: "BEC-2026-40",
    quantity: 140,
    expiryDate: getRelativeDate(57),
    price: 30,
    supplier: "Pfizer Ltd",
    location: "Shelf B-14",
  },
  {
    id: "EXP-WRN-15",
    medicineName: "Omez 20mg (Omeprazole)",
    batchNumber: "OMZ-2026-16",
    quantity: 111,
    expiryDate: getRelativeDate(58),
    price: 50,
    supplier: "Dr. Reddy's",
    location: "Shelf B-15",
  },

  /* =====================================================
     3. REVIEW (61–90 DAYS) — EXACTLY 25 ITEMS (₹1,45,000 at risk)
  ===================================================== */
  {
    id: "EXP-REV-01",
    medicineName: "Levocetirizine 5mg (Levocet)",
    batchNumber: "LEV-2026-30",
    quantity: 120,
    expiryDate: getRelativeDate(62),
    price: 40,
    supplier: "Cipla Ltd",
    location: "Shelf C-01",
  },
  {
    id: "EXP-REV-02",
    medicineName: "Deriphyllin Retard 150",
    batchNumber: "DER-2026-18",
    quantity: 90,
    expiryDate: getRelativeDate(63),
    price: 35,
    supplier: "Zydus Cadila",
    location: "Shelf C-02",
  },
  {
    id: "EXP-REV-03",
    medicineName: "Taxim-O 200mg Tablet",
    batchNumber: "TXM-2026-52",
    quantity: 70,
    expiryDate: getRelativeDate(64),
    price: 90,
    supplier: "Alkem Labs",
    location: "Shelf C-03",
  },
  {
    id: "EXP-REV-04",
    medicineName: "Neurobion Forte Tablet",
    batchNumber: "NRB-2026-95",
    quantity: 150,
    expiryDate: getRelativeDate(65),
    price: 70,
    supplier: "Procter & Gamble",
    location: "Shelf C-04",
  },
  {
    id: "EXP-REV-05",
    medicineName: "Ecosprin 75mg (Aspirin)",
    batchNumber: "ECO-2026-44",
    quantity: 200,
    expiryDate: getRelativeDate(66),
    price: 50,
    supplier: "USV Private Ltd",
    location: "Shelf C-05",
  },
  {
    id: "EXP-REV-06",
    medicineName: "Rablet 20mg (Rabeprazole)",
    batchNumber: "RBL-2026-13",
    quantity: 80,
    expiryDate: getRelativeDate(67),
    price: 65,
    supplier: "Lupin Ltd",
    location: "Shelf C-06",
  },
  {
    id: "EXP-REV-07",
    medicineName: "Combiflam Pain Relief Tablet",
    batchNumber: "CMB-2026-80",
    quantity: 130,
    expiryDate: getRelativeDate(68),
    price: 65,
    supplier: "Sanofi India",
    location: "Shelf C-07",
  },
  {
    id: "EXP-REV-08",
    medicineName: "Glycomet-GP 1 Tablet",
    batchNumber: "GGP-2026-25",
    quantity: 110,
    expiryDate: getRelativeDate(69),
    price: 70,
    supplier: "USV Private Ltd",
    location: "Shelf C-08",
  },
  {
    id: "EXP-REV-09",
    medicineName: "Cilacar 10mg (Cilnidipine)",
    batchNumber: "CLC-2026-61",
    quantity: 95,
    expiryDate: getRelativeDate(71),
    price: 75,
    supplier: "J.B. Chemicals",
    location: "Shelf C-09",
  },
  {
    id: "EXP-REV-10",
    medicineName: "Sinarest New Tablet",
    batchNumber: "SNR-2026-17",
    quantity: 140,
    expiryDate: getRelativeDate(72),
    price: 55,
    supplier: "Centaur Pharma",
    location: "Shelf C-10",
  },
  {
    id: "EXP-REV-11",
    medicineName: "Oflox 200mg (Ofloxacin)",
    batchNumber: "OFL-2026-38",
    quantity: 65,
    expiryDate: getRelativeDate(73),
    price: 60,
    supplier: "Cipla Ltd",
    location: "Shelf C-11",
  },
  {
    id: "EXP-REV-12",
    medicineName: "Dulcoflex 5mg Laxative",
    batchNumber: "DLC-2026-09",
    quantity: 85,
    expiryDate: getRelativeDate(74),
    price: 25,
    supplier: "Sanofi India",
    location: "Shelf C-12",
  },
  {
    id: "EXP-REV-13",
    medicineName: "Digene Gel Mixed Fruit 200ml",
    batchNumber: "DGN-2026-47",
    quantity: 50,
    expiryDate: getRelativeDate(75),
    price: 130,
    supplier: "Abbott India",
    location: "Shelf C-13",
  },
  {
    id: "EXP-REV-14",
    medicineName: "Alex Cough Syrup 100ml",
    batchNumber: "ALX-2026-82",
    quantity: 45,
    expiryDate: getRelativeDate(76),
    price: 110,
    supplier: "Glenmark Pharma",
    location: "Shelf C-14",
  },
  {
    id: "EXP-REV-15",
    medicineName: "Betadine 10% Ointment 20g",
    batchNumber: "BTD-2026-19",
    quantity: 60,
    expiryDate: getRelativeDate(78),
    price: 95,
    supplier: "Win-Medicare",
    location: "Shelf C-15",
  },
  {
    id: "EXP-REV-16",
    medicineName: "Kenacort 0.1% Oral Paste",
    batchNumber: "KNC-2026-33",
    quantity: 40,
    expiryDate: getRelativeDate(79),
    price: 120,
    supplier: "Abbott India",
    location: "Shelf C-16",
  },
  {
    id: "EXP-REV-17",
    medicineName: "Lupisulin M 30 100IU",
    batchNumber: "LUP-2026-66",
    quantity: 15,
    expiryDate: getRelativeDate(80),
    price: 450,
    supplier: "Lupin Ltd",
    location: "Cold Storage 02",
  },
  {
    id: "EXP-REV-18",
    medicineName: "Novomix 30 FlexPen 100IU",
    batchNumber: "NVM-2026-50",
    quantity: 12,
    expiryDate: getRelativeDate(81),
    price: 680,
    supplier: "Novo Nordisk",
    location: "Cold Storage 03",
  },
  {
    id: "EXP-REV-19",
    medicineName: "Moxikind-CV 625 Tablet",
    batchNumber: "MXK-2026-28",
    quantity: 70,
    expiryDate: getRelativeDate(83),
    price: 110,
    supplier: "Mankind Pharma",
    location: "Shelf C-17",
  },
  {
    id: "EXP-REV-20",
    medicineName: "Calpol 500mg Suspension",
    batchNumber: "CAL-2026-91",
    quantity: 60,
    expiryDate: getRelativeDate(84),
    price: 55,
    supplier: "GlaxoSmithKline",
    location: "Shelf C-18",
  },
  {
    id: "EXP-REV-21",
    medicineName: "Domstal Baby Drops 5ml",
    batchNumber: "DOM-2026-14",
    quantity: 45,
    expiryDate: getRelativeDate(85),
    price: 40,
    supplier: "Torrent Pharma",
    location: "Shelf C-19",
  },
  {
    id: "EXP-REV-22",
    medicineName: "Erythrocin 250mg Tablet",
    batchNumber: "ERY-2026-72",
    quantity: 50,
    expiryDate: getRelativeDate(86),
    price: 65,
    supplier: "Pfizer Ltd",
    location: "Shelf C-20",
  },
  {
    id: "EXP-REV-23",
    medicineName: "Sporidex 500mg (Cephalexin)",
    batchNumber: "SPD-2026-36",
    quantity: 55,
    expiryDate: getRelativeDate(87),
    price: 120,
    supplier: "Sun Pharma",
    location: "Shelf C-21",
  },
  {
    id: "EXP-REV-24",
    medicineName: "Glynase-XL 5mg",
    batchNumber: "GLY-2026-88",
    quantity: 80,
    expiryDate: getRelativeDate(88),
    price: 55,
    supplier: "USV Private Ltd",
    location: "Shelf C-22",
  },
  {
    id: "EXP-REV-25",
    medicineName: "Arkamin 100mcg (Clonidine)",
    batchNumber: "ARK-2026-05",
    quantity: 90,
    expiryDate: getRelativeDate(89),
    price: 46,
    supplier: "Torrent Pharma",
    location: "Shelf C-23",
  },
];

// Helper to get formatted initial data with real-time calculated FEFO status
export const getInitialExpiryData = () => {
  return generateRawExpiryData().map((item) => {
    const { status, daysLeft, color } = calculateStatus(item.expiryDate);
    return { ...item, status, daysLeft, color };
  });
};

export const initialExpiryData = getInitialExpiryData();