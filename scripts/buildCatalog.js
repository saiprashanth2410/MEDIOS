import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { detectCategoryLocal } from "../src/utils/localCategoryRules.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function extractBrandName(fullName) {
  if (!fullName) return "";
  let name = String(fullName).trim();
  name = name.replace(/\s*\([^)]*\)/g, "");
  name = name.replace(
    /\s+\d+(\.\d+)?\s*(million|thousand|billion)?\s*(unit|units|mg|mcg|g|ml|mL|IU|%|w\/v|w\/w)?(\s*\/\s*\d*\s*(unit|units|mg|mcg|g|ml|mL))?.*$/i,
    ""
  );
  name = name.trim();
  if (name.length > 30) {
    const words = name.split(/\s+/);
    name = words.slice(0, 2).join(" ");
  }
  if (!name) {
    name = String(fullName).split(/\s+/)[0];
  }
  return name;
}

function extractGenericName(fullName) {
  if (!fullName) return "General Formulation";
  const match = String(fullName).match(/\(([^)]+)\)/);
  if (match && match[1]) {
    const raw = match[1].trim();
    return raw
      .split(/\s+/)
      .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(" ");
  }
  return "General Formulation";
}

// 1. Load supplier mapping
console.log("📦 Loading suppliers.tsv...");
const suppliersTsvPath = path.join(rootDir, "public/data/suppliers.tsv");
const suppliersText = fs.readFileSync(suppliersTsvPath, "utf-8");
const supplierMap = {};
Papa.parse(suppliersText, {
  header: true,
  delimiter: "\t",
  skipEmptyLines: true,
  complete: (res) => {
    (res.data || []).forEach((row) => {
      const vals = Object.values(row);
      const id = String(vals[0] || "").trim();
      const name = String(vals[1] || "").trim();
      if (id && name) supplierMap[id] = name;
    });
  },
});
console.log(`✅ Loaded ${Object.keys(supplierMap).length} suppliers`);

// 2. Read first 600 lines from BrandMaster.tsv
console.log("📋 Reading initial rows from BrandMaster.tsv...");
const brandMasterPath = path.join(rootDir, "public/data/BrandMaster.tsv");
const fd = fs.openSync(brandMasterPath, "r");
const buffer = Buffer.alloc(1024 * 1024); // 1 MB is more than enough for first 600 lines
const bytesRead = fs.readSync(fd, buffer, 0, 1024 * 1024, 0);
fs.closeSync(fd);

const textChunk = buffer.toString("utf-8", 0, bytesRead);
const lines = textChunk.split("\n");
const sampleLines = lines.slice(0, 600).join("\n");

let catalog = [];
Papa.parse(sampleLines, {
  header: true,
  delimiter: "\t",
  skipEmptyLines: true,
  complete: (results) => {
    catalog = (results.data || [])
      .slice(0, 500)
      .map((row, index) => {
        const id = String(row["Identifier"] || `med-${index}`);
        const fullName = String(row["Brand Name"] || "").trim();
        if (!fullName) return null;

        const brandName = extractBrandName(fullName);
        if (!brandName) return null;

        const generic = extractGenericName(fullName);
        const category = detectCategoryLocal(fullName, brandName);
        const supplierId = String(row["Supplier Identifier"] || "").trim();
        const manufacturer = supplierMap[supplierId] || "Standard Pharma";

        return {
          id,
          name: brandName,
          fullName,
          brandName,
          generic,
          manufacturer,
          manufacturerCode: supplierId,
          category,
          batch: `BATCH-${1000 + index}`,
          rack: `R-${(index % 20) + 1}`,
          stock: 50 + ((index * 7) % 200),
          price: 10 + ((index * 13) % 490),
          schedule: "H",
          expiry: "2027-12-31",
        };
      })
      .filter(Boolean);
  },
});

console.log(`✅ Built catalog with ${catalog.length} medicines`);
const outputPath = path.join(rootDir, "public/data/catalogMedicines.json");
fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2), "utf-8");
console.log(`🚀 Saved fast catalog to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
