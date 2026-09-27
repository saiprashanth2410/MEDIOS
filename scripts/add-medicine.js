#!/usr/bin/env node

/**
 * CLI Tool: Add Medicine from CDCI BrandMaster.tsv
 * Usage: npm run add-medicine "Dolo"
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import Papa from "papaparse";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_FILE = path.join(__dirname, "../public/data/BrandMaster.tsv");
const INVENTORY_FILE = path.join(__dirname, "../public/data/Inventory.json");

/* =====================================================
   LOAD CDCI MASTER
===================================================== */

function loadMasterData() {
  if (!fs.existsSync(MASTER_FILE)) {
    console.error("❌ BrandMaster.tsv not found at:", MASTER_FILE);
    process.exit(1);
  }

  const tsvText = fs.readFileSync(MASTER_FILE, "utf-8");

  const { data } = Papa.parse(tsvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: "\t",
  });

  return data
    .map((row, index) => {
      const name = String(row["Brand Name"] || "").trim();
      if (!name) return null;

      return {
        masterId: String(row["Identifier"] || `master-${index}`),
        name,
        generic: String(row["Generic Identifier"] || "N/A").trim(),
        supplier: String(row["Supplier Identifier"] || "Unknown").trim(),
      };
    })
    .filter(Boolean);
}

/* =====================================================
   LOAD / SAVE INVENTORY
===================================================== */

function loadInventory() {
  if (!fs.existsSync(INVENTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(INVENTORY_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveInventory(inventory) {
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(inventory, null, 2), "utf-8");
}

/* =====================================================
   SEARCH
===================================================== */

function searchMedicines(masterData, query, limit = 15) {
  const q = query.toLowerCase().trim();
  return masterData
    .filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.generic.toLowerCase().includes(q) ||
        m.supplier.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

/* =====================================================
   CREATE INVENTORY ITEM
===================================================== */

function createInventoryItem(masterMed) {
  return {
    id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    masterId: masterMed.masterId,
    name: masterMed.name,
    generic: masterMed.generic,
    manufacturer: masterMed.supplier,
    category: "Other",
    batch: `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
    rack: `R-${Math.floor(1 + Math.random() * 20)}`,
    stock: 100,
    price: 50,
    schedule: "H",
    expiry: "2027-12-31",
    addedAt: new Date().toISOString(),
  };
}

/* =====================================================
   PROMPT HELPER
===================================================== */

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

/* =====================================================
   MAIN
===================================================== */

async function main() {
  const args = process.argv.slice(2);
  let query = args.join(" ").trim();

  console.log("\n🏥 CDCI Medicine Adder\n");

  console.log("📚 Loading CDCI database...");
  const masterData = loadMasterData();
  console.log(`✅ Loaded ${masterData.length.toLocaleString()} medicines\n`);

  if (!query) {
    query = await prompt("🔍 Search medicine (e.g. Dolo, Azithral): ");
  }

  if (!query.trim()) {
    console.log("❌ No search query. Exiting.");
    process.exit(0);
  }

  const results = searchMedicines(masterData, query, 15);

  if (results.length === 0) {
    console.log(`❌ No medicines found for "${query}"`);
    process.exit(0);
  }

  console.log(`\n📋 Found ${results.length} result(s) for "${query}":\n`);
  results.forEach((med, i) => {
    console.log(`  [${i + 1}] ${med.name}`);
    console.log(`      Generic: ${med.generic}`);
    console.log(`      Supplier: ${med.supplier}`);
    console.log("");
  });

  const choice = await prompt(
    `👉 Select (1-${results.length}) or 'q' to quit: `
  );

  if (choice.toLowerCase() === "q") {
    console.log("👋 Bye!");
    process.exit(0);
  }

  const index = parseInt(choice, 10) - 1;
  if (isNaN(index) || index < 0 || index >= results.length) {
    console.log("❌ Invalid selection.");
    process.exit(1);
  }

  const selected = results[index];

  console.log(`\n📝 Selected: ${selected.name}`);
  const confirm = await prompt("✅ Add to inventory? (y/n): ");

  if (confirm.toLowerCase() !== "y") {
    console.log("❌ Cancelled.");
    process.exit(0);
  }

  const inventory = loadInventory();

  const isDuplicate = inventory.some((i) => i.masterId === selected.masterId);
  if (isDuplicate) {
    console.log("⚠️  Already in inventory.");
    const force = await prompt("   Add anyway? (y/n): ");
    if (force.toLowerCase() !== "y") {
      console.log("❌ Cancelled.");
      process.exit(0);
    }
  }

  inventory.unshift(createInventoryItem(selected));
  saveInventory(inventory);

  console.log(`\n✅ Added: ${selected.name}`);
  console.log(`   Total inventory: ${inventory.length} items\n`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});