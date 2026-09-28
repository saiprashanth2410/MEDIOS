require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Papa = require("papaparse");
const Supplier = require("./models/Supplier");
const Medicine = require("./models/Medicine");

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

    if (!fs.existsSync(suppliersTsvPath)) {
      throw new Error(`File not found: ${suppliersTsvPath}`);
    }

    const suppliersText = fs.readFileSync(suppliersTsvPath, "utf-8");
    const supplierNamesMap = new Map();

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

    /* ============================================
       2. LOAD BRANDMASTER.TSV
    ============================================ */
    console.log("\n📦 Loading BrandMaster.tsv...");
    const brandMasterPath = path.join(
      __dirname,
      "../public/data/BrandMaster.tsv"
    );

    if (!fs.existsSync(brandMasterPath)) {
      throw new Error(`File not found: ${brandMasterPath}`);
    }

    const brandMasterText = fs.readFileSync(brandMasterPath, "utf-8");
    const brandParse = Papa.parse(brandMasterText, {
      header: true,
      skipEmptyLines: true,
      delimiter: "\t",
    });

    console.log(
      `✅ Loaded ${brandParse.data.length} rows from BrandMaster.tsv`
    );
    console.log("📋 Columns:", brandParse.meta.fields);

    /* ============================================
       3. BUILD SUPPLIER PRODUCT COUNTS
    ============================================ */
    console.log("\n🔀 Processing suppliers...");
    const supplierProductCount = new Map();

    brandParse.data.forEach((row) => {
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
        country: info.country || "",
        category: "Pharmaceutical",
        status: "active",
        productsCount,
        totalOrders: 0,
        paymentTerms: "Net 30",
        joinedDate: new Date().toISOString().split("T")[0],
      });
    }

    suppliers.sort((a, b) => b.productsCount - a.productsCount);

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

    /* ============================================
       5. BUILD + INSERT MEDICINES
    ============================================ */
    console.log("\n💊 Processing medicines...");

    const medicines = [];
    let counter = 0;

    brandParse.data.forEach((row) => {
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

      medicines.push({
        code: row["Item Code"] || row["Code"] || `MED-${counter}`,
        name: String(medicineName).trim(),
        brand: String(row["Brand"] || "").trim(),
        category: String(row["Category"] || "Pharmaceutical").trim(),
        composition: String(
          row["Composition"] || row["Generic Name"] || ""
        ).trim(),
        packSize: String(row["Pack Size"] || row["Packing"] || "").trim(),
        mrp: parseFloat(row["MRP"]) || 0,
        sellingPrice: parseFloat(row["Selling Price"] || row["Rate"]) || 0,
        hsnCode: String(row["HSN Code"] || "").trim(),
        gst: parseFloat(row["GST"]) || 12,
        supplierCode,
        supplierName,
        stock: parseInt(row["Stock"] || row["Quantity"] || 0, 10),
        reorderLevel: 10,
      });
    });

    console.log(`✅ Processed ${medicines.length} medicines`);

    console.log("\n🗑️  Clearing old medicines...");
    await Medicine.deleteMany({});

    console.log(`📥 Inserting ${medicines.length} medicines...`);
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

    console.log("\n🎉 Seeding complete!");
    console.log(`   Suppliers: ${suppliers.length}`);
    console.log(`   Medicines: ${medicines.length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seed();