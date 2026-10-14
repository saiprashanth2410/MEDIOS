import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Papa from "papaparse";

import Supplier from "./models/Supplier.js";
import Medicine from "./models/Medicine.js";
import Pharmacist from "./models/Pharmacist.js";
import Batch from "./models/Batch.js";
import Prescription from "./models/Prescription.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/meditrack";

async function seed() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    /* ============================================
       1. LOAD SUPPLIERS FROM suppliers.tsv
    ============================================ */
    console.log("\n📋 Loading suppliers.tsv...");
    const suppliersTsvPath = path.join(
      __dirname,
      "../public/data/suppliers.tsv"
    );

    const supplierNamesMap = new Map();

    if (fs.existsSync(suppliersTsvPath)) {
      const suppliersText = fs.readFileSync(suppliersTsvPath, "utf-8");
      const supplierParse = Papa.parse(suppliersText, {
        header: true,
        skipEmptyLines: true,
        delimiter: "\t",
      });

      supplierParse.data.forEach((row) => {
        const values = Object.values(row);
        const id = String(values[0] || "").trim().replace(/\s/g, "");
        const name = String(values[1] || "").trim();
        const country = String(values[2] || "").trim();
        if (id && name && id !== "Identifier") {
          supplierNamesMap.set(id, { name, country });
        }
      });

      console.log(
        `✅ Loaded ${supplierNamesMap.size} supplier names from suppliers.tsv`
      );
    } else {
      console.warn(`⚠️ suppliers.tsv not found at: ${suppliersTsvPath}`);
    }

    /* ============================================
       2. LOAD BRANDMASTER.TSV
    ============================================ */
    console.log("\n📦 Loading BrandMaster.tsv...");
    const brandMasterPath = path.join(
      __dirname,
      "../public/data/BrandMaster.tsv"
    );

    let brandParseData = [];
    if (fs.existsSync(brandMasterPath)) {
      const brandMasterText = fs.readFileSync(brandMasterPath, "utf-8");
      const brandParse = Papa.parse(brandMasterText, {
        header: true,
        skipEmptyLines: true,
        delimiter: "\t",
      });
      brandParseData = brandParse.data || [];
      console.log(`✅ Loaded ${brandParseData.length} rows from BrandMaster.tsv`);
    } else {
      console.warn(`⚠️ BrandMaster.tsv not found at: ${brandMasterPath}`);
    }

    /* ============================================
       3. BUILD SUPPLIER PRODUCT COUNTS
    ============================================ */
    console.log("\n🔀 Processing suppliers...");
    const supplierProductCount = new Map();

    brandParseData.forEach((row) => {
      const code = String(row["Supplier Identifier"] || "")
        .trim()
        .replace(/\s/g, "");
      if (!code || code === "UNKNOWN" || code === "N/A") return;

      supplierProductCount.set(code, (supplierProductCount.get(code) || 0) + 1);
    });

    console.log(`✅ Counted ${supplierProductCount.size} unique suppliers`);

    /* ============================================
       4. BUILD + INSERT SUPPLIERS
    ============================================ */
    const allCodes = new Set([
      ...supplierNamesMap.keys(),
      ...supplierProductCount.keys(),
    ]);

    const suppliers = [];
    for (const code of allCodes) {
      const info = supplierNamesMap.get(code) || { name: code, country: "" };
      const productsCount = supplierProductCount.get(code) || 0;

      suppliers.push({
        code,
        name: info.name || code,
        country: info.country || "India",
        category: "Pharmaceutical",
        status: "active",
        productsCount,
        totalOrders: 0,
        paymentTerms: "Net 30",
        joinedDate: new Date().toISOString().split("T")[0],
      });
    }

    suppliers.sort((a, b) => b.productsCount - a.productsCount);

    if (suppliers.length > 0) {
      console.log("\n🗑️  Clearing old suppliers...");
      await Supplier.deleteMany({});

      console.log(`📥 Inserting ${suppliers.length} suppliers...`);
      const batchSize = 1000;
      for (let i = 0; i < suppliers.length; i += batchSize) {
        const batch = suppliers.slice(i, i + batchSize);
        await Supplier.insertMany(batch);
        console.log(
          `   Inserted ${Math.min(i + batchSize, suppliers.length)}/${suppliers.length}`
        );
      }
    }

    /* ============================================
       5. BUILD + INSERT MEDICINES
    ============================================ */
    console.log("\n💊 Processing medicines...");
    const medicines = [];
    let counter = 0;

    brandParseData.forEach((row) => {
      const supplierCode = String(row["Supplier Identifier"] || "")
        .trim()
        .replace(/\s/g, "");

      if (
        !supplierCode ||
        supplierCode === "UNKNOWN" ||
        supplierCode === "N/A"
      ) {
        return;
      }

      const supplierName =
        supplierNamesMap.get(supplierCode)?.name || supplierCode;

      const medicineName =
        row["Brand Name"] ||
        row["Medicine Name"] ||
        row["Product Name"] ||
        row["Brand"] ||
        row["Item Name"] ||
        "";

      if (!medicineName || String(medicineName).trim() === "") return;

      counter++;

      const fullName = String(medicineName).trim();
      const generic = String(
        row["Composition"] || row["Generic Identifier"] || row["Generic Name"] || ""
      ).trim();
      const stock = parseInt(row["Stock"] || row["Quantity"] || (50 + ((counter * 7) % 200)), 10);
      const price = parseFloat(row["Selling Price"] || row["Rate"] || (10 + ((counter * 13) % 490)));

      medicines.push({
        code: row["Item Code"] || row["Identifier"] || `MED-${counter}`,
        name: fullName.split("(")[0].trim(),
        fullName,
        brand: String(row["Brand"] || "").trim(),
        category: String(row["Category"] || "Pharmaceutical").trim(),
        composition: generic,
        generic,
        packSize: String(row["Pack Size"] || row["Packing"] || "10 tablets").trim(),
        mrp: parseFloat(row["MRP"]) || price * 1.2,
        sellingPrice: price,
        price,
        hsnCode: String(row["HSN Code"] || "3004").trim(),
        gst: parseFloat(row["GST"]) || 12,
        supplierCode,
        supplierName,
        stock,
        quantity: stock,
        reorderLevel: 15,
        batch: `BATCH-${1000 + counter}`,
        rack: `R-${(counter % 20) + 1}`,
        schedule: "H",
        expiry: "2027-12-31",
      });
    });

    console.log(`✅ Processed ${medicines.length} medicines`);

    if (medicines.length > 0) {
      console.log("\n🗑️  Clearing old medicines...");
      await Medicine.deleteMany({});

      console.log(`📥 Inserting ${medicines.length} medicines...`);
      const batchSize = 1000;
      for (let i = 0; i < medicines.length; i += batchSize) {
        const batch = medicines.slice(i, i + batchSize);
        try {
          await Medicine.insertMany(batch, { ordered: false });
        } catch (err) {
          if (err.code !== 11000) console.error(err.message);
        }
        console.log(
          `   Inserted ${Math.min(i + batchSize, medicines.length)}/${medicines.length}`
        );
      }
    }

    /* ============================================
       6. SEED INITIAL PHARMACISTS
    ============================================ */
    const pharmacistCount = await Pharmacist.countDocuments();
    if (pharmacistCount === 0) {
      console.log("\n👩‍⚕️ Seeding initial pharmacists...");
      const initialPharmacists = [
        {
          id: "PH-001",
          name: "Dr. Rajesh Kumar",
          email: "rajesh@meditrack.ai",
          phone: "+91 98765 43210",
          license: "TN/PH/2020/1234",
          role: "Chief Pharmacist",
          shift: "Morning (9AM - 5PM)",
          status: "active",
          joinDate: "15 Jan 2020",
        },
        {
          id: "PH-002",
          name: "Priya Sharma",
          email: "priya@meditrack.ai",
          phone: "+91 98765 43211",
          license: "TN/PH/2021/5678",
          role: "Senior Pharmacist",
          shift: "Evening (5PM - 11PM)",
          status: "active",
          joinDate: "20 Mar 2021",
        },
        {
          id: "PH-003",
          name: "Karthik R",
          email: "karthik@meditrack.ai",
          phone: "+91 98765 43212",
          license: "TN/PH/2022/9012",
          role: "Pharmacist",
          shift: "Morning (9AM - 5PM)",
          status: "on-leave",
          joinDate: "10 Jun 2022",
        },
        {
          id: "PH-004",
          name: "Anita Menon",
          email: "anita@meditrack.ai",
          phone: "+91 98765 43213",
          license: "TN/PH/2023/3456",
          role: "Pharmacist",
          shift: "Night (11PM - 8AM)",
          status: "active",
          joinDate: "05 Sep 2023",
        },
      ];
      await Pharmacist.insertMany(initialPharmacists);
      console.log(`✅ Seeded ${initialPharmacists.length} pharmacists`);
    }

    /* ============================================
       7. SEED INITIAL BATCHES
    ============================================ */
    const batchCount = await Batch.countDocuments();
    if (batchCount === 0) {
      console.log("\n📦 Seeding initial batches...");
      const initialBatches = [
        {
          id: "BATCH-001",
          medicineName: "Amoxicillin 500mg",
          batchNumber: "AMX-2026-042",
          quantity: 240,
          expiryDate: "2027-12-31",
          supplier: "Cipla Ltd",
          status: "Active",
        },
        {
          id: "BATCH-002",
          medicineName: "Paracetamol 650mg",
          batchNumber: "PCM-2026-018",
          quantity: 850,
          expiryDate: "2026-10-15",
          supplier: "Sun Pharma",
          status: "Expiring Soon",
        },
        {
          id: "BATCH-003",
          medicineName: "Insulin Glargine 100IU",
          batchNumber: "INS-2026-007",
          quantity: 18,
          expiryDate: "2026-08-01",
          supplier: "Novo Nordisk",
          status: "Expired",
        },
        {
          id: "BATCH-004",
          medicineName: "Azithromycin 500mg",
          batchNumber: "AZI-2026-033",
          quantity: 65,
          expiryDate: "2027-06-30",
          supplier: "Alkem Labs",
          status: "Active",
        },
      ];
      await Batch.insertMany(initialBatches);
      console.log(`✅ Seeded ${initialBatches.length} batches`);
    }

    /* ============================================
       8. SEED INITIAL PRESCRIPTIONS
    ============================================ */
    const rxCount = await Prescription.countDocuments();
    if (rxCount === 0) {
      console.log("\n📋 Seeding initial prescriptions...");
      const initialPrescriptions = [
        {
          id: "RX-4821",
          patientName: "Santhosh",
          patientAge: "45",
          patientGender: "Male",
          patientPhone: "+91 98765 43210",
          patientEmail: "john.doe@example.com",
          patientAddress: "Anna Nagar, Chennai",
          doctorReg: "TN/MCI/2018/4521",
          doctorSpecialization: "General Physician",
          hospital: "Apollo Hospital, Chennai",
          date: "2026-09-25",
          diagnosis: "Mild fever and cold",
          notes: "Patient has mild fever and cold. Take rest for 2 days.",
          status: "dispensed",
          aiAssisted: true,
          medicines: [
            {
              name: "Paracetamol 650mg",
              dosage: "1-0-1",
              frequency: "1-0-1",
              duration: "5 days",
              instructions: "After food",
            },
            {
              name: "Cetirizine 10mg",
              dosage: "0-0-1",
              frequency: "0-0-1",
              duration: "3 days",
              instructions: "Before bed",
            },
          ],
        },
        {
          id: "RX-4820",
          patientName: "Priya Sharma",
          patientAge: "32",
          patientGender: "Female",
          patientPhone: "+91 98765 43211",
          patientEmail: "priya.sharma@example.com",
          patientAddress: "T. Nagar, Chennai",
          doctorName: "Dr. Ananya Roy",
          doctorReg: "TN/MCI/2019/6712",
          doctorSpecialization: "ENT Specialist",
          hospital: "Fortis Malar, Chennai",
          date: "2026-09-26",
          diagnosis: "Upper respiratory tract infection",
          notes: "Drink warm fluids, complete antibiotic course.",
          status: "pending",
          aiAssisted: false,
          medicines: [
            {
              name: "Amoxicillin 500mg",
              dosage: "1-0-1",
              frequency: "1-0-1",
              duration: "7 days",
              instructions: "After meals",
            },
          ],
        },
      ];
      await Prescription.insertMany(initialPrescriptions);
      console.log(`✅ Seeded ${initialPrescriptions.length} prescriptions`);
    }

    console.log("\n🎉 Seeding complete!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seed();