import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Search,
  Pill,
  Hash,
  IndianRupee,
  MapPin,
  Calendar,
  Package,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { suppliersAPI } from "../../services/api";

/* =====================================================
   CONSTANTS
===================================================== */

const CATEGORIES = [
  "Antibiotic",
  "Analgesic",
  "Antidiabetic",
  "Antihistamine",
  "Antiseptic",
  "Cardiac",
  "Other",
];

const DRUG_SCHEDULES = [
  "OTC (Over the counter)",
  "Schedule H",
  "Schedule H1",
  "Schedule X",
];

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function AddMedicineModal({ onAdd, onClose }) {
  const [brandMaster, setBrandMaster] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [nameError, setNameError] = useState("");

  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    generic: "",
    manufacturer: "",
    batch: `AMX-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    stock: 100,
    price: 50,
    category: "Antibiotic",
    schedule: "OTC (Over the counter)",
    rack: "",
  });

  /* =====================================================
     LOAD SUPPLIER NAMES + BRANDMASTER.TSV
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoadingMaster(true);

        // 1. Load supplier names first
        let supplierMap = {};
        try {
          const supplierData = await suppliersAPI.list({ limit: 10000 });
          supplierData.suppliers.forEach((s) => {
            supplierMap[s.code] = s.name;
          });
          console.log(`✅ Loaded ${Object.keys(supplierMap).length} supplier names`);
        } catch (err) {
          console.error("Supplier names load error:", err);
        }

        if (cancelled) return;

        // 2. Load BrandMaster.tsv
        const res = await fetch("/data/BrandMaster.tsv");
        if (!res.ok) throw new Error("Failed to load");

        const text = await res.text();

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimiter: "\t",
          complete: (results) => {
            if (cancelled) return;

            const parsed = (results.data || [])
              .map((row, index) => {
                const fullName = String(row["Brand Name"] || "").trim();
                if (!fullName) return null;

                // Extract generic name from brackets
                const genericMatch = fullName.match(/\(([^)]+)\)/);
                const genericName = genericMatch ? genericMatch[1].trim() : "";

                // Brand name = text before first bracket
                const brandName = fullName.split("(")[0].trim();

                // Dosage info = text after last bracket
                const dosageMatch = fullName.match(/\)\s*(.+)$/);
                const dosage = dosageMatch ? dosageMatch[1].trim() : "";

                // ✅ Supplier code from BrandMaster
                const supplierCode = String(
                  row["Supplier Identifier"] || ""
                ).trim();

                // ✅ Supplier NAME from lookup (fallback to code)
                const supplierName = supplierMap[supplierCode] || supplierCode;

                return {
                  id: String(row["Identifier"] || `bm-${index}`),
                  fullName,
                  brandName,
                  genericName,
                  dosage,
                  manufacturerCode: supplierCode,
                  manufacturer: supplierName, // ✅ NAME, not code!
                };
              })
              .filter(Boolean);

            setBrandMaster(parsed);
            setLoadingMaster(false);
            console.log(`✅ BrandMaster loaded: ${parsed.length} medicines`);
          },
          error: (err) => {
            console.error("Parse error:", err);
            setLoadingMaster(false);
          },
        });
      } catch (err) {
        if (cancelled) return;
        console.error("Fetch error:", err);
        setLoadingMaster(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  /* =====================================================
     SUGGESTIONS — Search by generic name first
  ===================================================== */

  const suggestions = useMemo(() => {
    const q = form.name.toLowerCase().trim();
    if (!q || q.length < 2) return [];

    return brandMaster
      .filter((med) => {
        return (
          med.genericName.toLowerCase().includes(q) ||
          med.brandName.toLowerCase().includes(q) ||
          med.fullName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aStart = a.genericName.toLowerCase().startsWith(q) ? 1 : 0;
        const bStart = b.genericName.toLowerCase().startsWith(q) ? 1 : 0;
        if (aStart !== bStart) return bStart - aStart;

        const aContains = a.genericName.toLowerCase().includes(q) ? 1 : 0;
        const bContains = b.genericName.toLowerCase().includes(q) ? 1 : 0;
        return bContains - aContains;
      })
      .slice(0, 8);
  }, [form.name, brandMaster]);

  /* =====================================================
     HANDLERS
  ===================================================== */

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (value) => {
    setForm((prev) => ({ ...prev, name: value }));
    setShowSuggestions(true);
    setHighlightedIndex(-1);
    setSelectedMaster(null);
    setNameError("");
  };

  const handleSelectSuggestion = (med) => {
    setForm((prev) => ({
      ...prev,
      name: med.genericName || med.brandName,
      generic: med.genericName || prev.generic,
      manufacturer: med.manufacturer || prev.manufacturer, // ✅ Now NAME
    }));
    setSelectedMaster(med);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setNameError("");
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* =====================================================
     SUBMIT — STRICT MODE
  ===================================================== */

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedMaster) {
      setNameError(
        "Please select a medicine from the suggestions list. Only CDCI registered medicines are allowed."
      );
      toast.error("Invalid medicine — select from suggestions");
      inputRef.current?.focus();
      return;
    }

    if (!form.generic.trim()) {
      toast.error("Generic name required");
      return;
    }
    if (!form.manufacturer.trim()) {
      toast.error("Manufacturer required");
      return;
    }
    if (!form.rack.trim()) {
      toast.error("Rack location required");
      return;
    }

    const newMedicine = {
      id: `med-${Date.now()}`,
      masterId: selectedMaster.id,
      name: selectedMaster.genericName || selectedMaster.brandName,
      fullName: selectedMaster.fullName,
      brandName: selectedMaster.brandName,
      generic: form.generic.trim(),
      manufacturer: form.manufacturer.trim(),
      manufacturerCode: selectedMaster.manufacturerCode, // ✅ Store code too
      batch: form.batch.trim(),
      rack: form.rack.trim(),
      stock: parseInt(form.stock, 10) || 0,
      price: parseFloat(form.price) || 0,
      category: form.category,
      schedule: form.schedule.split(" ")[0],
      expiry: form.expiry,
      aiDetected: false,
    };

    onAdd(newMedicine);
    onClose();
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
              <Pill size={18} className="text-[#0284c7]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Add New Medicine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Only CDCI registered medicines allowed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Medicine Name */}
          <div ref={suggestionsRef} className="relative">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Medicine Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Pill
                size={14}
                className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  selectedMaster ? "text-emerald-500" : "text-slate-400"
                }`}
              />
              <input
                ref={inputRef}
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() =>
                  form.name.length >= 2 && setShowSuggestions(true)
                }
                onKeyDown={handleKeyDown}
                placeholder=""
                className={`w-full h-11 pl-10 pr-10 rounded-lg border bg-white dark:bg-slate-800 text-sm outline-none transition ${
                  nameError
                    ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                    : selectedMaster
                    ? "border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    : "border-slate-200 dark:border-slate-700 focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10"
                }`}
                autoComplete="off"
              />

              {loadingMaster && (
                <Loader2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
                />
              )}
              {!loadingMaster && selectedMaster && (
                <CheckCircle2
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"
                />
              )}
              {!loadingMaster && !selectedMaster && form.name && (
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, name: "" }));
                    setShowSuggestions(false);
                    setSelectedMaster(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {nameError && (
              <div className="mt-1.5 flex items-start gap-1.5 text-rose-600">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <p className="text-[11px] font-medium">{nameError}</p>
              </div>
            )}

            {selectedMaster && !nameError && (
              <div className="mt-1.5 flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 size={12} />
                <p className="text-[11px] font-medium">
                  ✓ Selected: <strong>{selectedMaster.brandName}</strong> ({selectedMaster.genericName})
                </p>
              </div>
            )}

            {/* SUGGESTIONS DROPDOWN */}
            {showSuggestions && form.name.length >= 2 && !selectedMaster && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-10 max-h-80 overflow-y-auto">
                {loadingMaster ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2
                      size={18}
                      className="text-[#0284c7] animate-spin"
                    />
                    <span className="ml-2 text-xs text-slate-500">
                      Loading master data...
                    </span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <AlertCircle
                      size={20}
                      className="text-rose-400 mx-auto mb-2"
                    />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Medicine not found
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Only CDCI-registered medicines can be added
                    </p>
                  </div>
                ) : (
                  suggestions.map((med, idx) => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(med)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
                        highlightedIndex === idx
                          ? "bg-sky-50 dark:bg-slate-800"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-md bg-sky-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Pill size={14} className="text-[#0284c7]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {med.genericName || med.brandName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {med.brandName}
                          {med.dosage ? ` · ${med.dosage}` : ""}
                        </p>
                        {/* ✅ Show supplier name in suggestion too */}
                        {med.manufacturer && med.manufacturer !== med.manufacturerCode && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            🏭 {med.manufacturer}
                          </p>
                        )}
                      </div>
                      <CheckCircle2
                        size={14}
                        className="text-emerald-500 shrink-0"
                      />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Generic + Manufacturer */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Generic Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.generic}
                onChange={(e) => handleChange("generic", e.target.value)}
                placeholder="Auto-filled from master"
                disabled={!!selectedMaster}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Manufacturer <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) => handleChange("manufacturer", e.target.value)}
                placeholder="Auto-filled from master"
                disabled={!!selectedMaster}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Batch + Expiry */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Batch Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={form.batch}
                  onChange={(e) => handleChange("batch", e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Expiry Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="date"
                  value={form.expiry}
                  onChange={(e) => handleChange("expiry", e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
                />
              </div>
            </div>
          </div>

          {/* Stock + Price */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Stock Quantity <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Package
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => handleChange("stock", e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Unit Price (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
                />
              </div>
            </div>
          </div>

          {/* Category + Schedule */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Drug Schedule
              </label>
              <select
                value={form.schedule}
                onChange={(e) => handleChange("schedule", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
              >
                {DRUG_SCHEDULES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rack */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Rack Location <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={form.rack}
                onChange={(e) => handleChange("rack", e.target.value)}
                placeholder="A-12"
                className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 transition"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
            <CheckCircle2 size={14} className="text-[#0284c7] shrink-0" />
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Only CDCI registered medicines can be added. Barcode will be
              auto-generated.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedMaster}
              className={`flex-1 h-11 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${
                selectedMaster
                  ? "bg-[#0284c7] text-white hover:bg-[#0369a1]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Pill size={14} />
              Add Medicine
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}