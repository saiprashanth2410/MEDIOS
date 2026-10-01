import { useState, useRef, useMemo } from "react";
import {
  UploadCloud,
  FileText,
  Loader2,
  Check,
  Plus,
  Trash2,
  Download,
  ArrowRight,
  FileCode,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  parseMedicineDocument,
  SAMPLE_INVOICE_TEXT,
} from "../../services/aiService";
import {
  getLiveInventory,
  matchMedicineWithInventory,
  applyImportBatch,
} from "../../utils/medicineImportService";

const CATEGORIES = [
  "Antibiotic",
  "Analgesic",
  "Antidiabetic",
  "Antihistamine",
  "Antiseptic",
  "Cardiac",
  "Other",
];

export default function SmartMedicineImportView({ onComplete, onCancel }) {
  const [, setFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Parsed review state
  const [extractedMeta, setExtractedMeta] = useState(null);
  const [items, setItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);
  const inventory = useMemo(() => getLiveInventory(), []);

  // --- Document Processing ---
  const handleProcessDocument = async (inputSource) => {
    setIsProcessing(true);
    setProgressStatus("Reading document content...");

    try {
      const res = await parseMedicineDocument(inputSource, (msg) => {
        setProgressStatus(msg);
      });

      if (!res.ok || !res.data) {
        throw new Error("Unable to extract medicine lines from document");
      }

      const doc = res.data;
      setExtractedMeta({
        documentType: doc.documentType || "Purchase Invoice",
        supplierName: doc.supplierName || "Wholesale Supplier",
        invoiceNumber: doc.invoiceNumber || `INV-${Date.now().toString().slice(-5)}`,
        invoiceDate: doc.invoiceDate || new Date().toISOString().split("T")[0],
      });

      // Match extracted line items with inventory
      const prepared = (doc.items || []).map((raw, idx) => {
        const matchResult = matchMedicineWithInventory(raw.name, raw.generic, inventory);
        const isMatched = !!matchResult.matched;
        const matched = matchResult.matched;
        const defaultAction = isMatched ? (raw.action || "increase") : "create";

        return {
          id: `item-${idx}-${Date.now()}`,
          name: raw.name || `Medicine ${idx + 1}`,
          generic: raw.generic || (matched?.generic || ""),
          quantity: Math.max(1, Number(raw.quantity) || 100),
          action: defaultAction,
          batch: raw.batch || matched?.batch || `BAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          expiry: raw.expiry || matched?.expiry || "2027-12-31",
          price: Number(raw.price) || matched?.price || 50,
          category: raw.category || matched?.category || "Other",
          manufacturer: raw.manufacturer || matched?.manufacturer || "Standard Pharma",
          rack: raw.rack || matched?.rack || "R-1",
          isMatched,
          matchedMedicine: matched,
          confidence: matchResult.confidence,
        };
      });

      setItems(prepared);
      toast.success(`Extracted ${prepared.length} medicine items from invoice`);
    } catch (err) {
      console.error("[SmartMedicineImport] Parse error:", err);
      toast.error(err.message || "Failed to extract medicines from document");
    } finally {
      setIsProcessing(false);
      setProgressStatus("");
    }
  };

  const onFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    handleProcessDocument(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    setFile(dropped);
    handleProcessDocument(dropped);
  };

  const handleLoadSample = () => {
    setFile({ name: "Cipla_Wholesale_Invoice_INV9842.pdf" });
    handleProcessDocument("sample");
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      toast.error("Please enter medicine details to parse");
      return;
    }
    handleProcessDocument(pastedText);
  };

  const downloadSampleTemplate = () => {
    const content = `MEDICINE NAME,GENERIC COMPOSITION,QUANTITY,BATCH,EXPIRY,PRICE,CATEGORY,MANUFACTURER
Augmentin 625 Duo,Amoxicillin + Potassium Clavulanate,60,AUG-2026-901,2027-08-31,185.00,Antibiotic,GlaxoSmithKline
Dolo 650mg,Paracetamol 650mg,120,DL-2026-442,2027-11-30,32.50,Analgesic,Micro Labs Ltd
Metformin 500mg SR,Metformin HCl,80,MT-2026-318,2027-06-30,45.00,Antidiabetic,USV Private Ltd
Cetirizine 10mg,Cetirizine HCl,150,CT-2026-119,2028-02-28,22.00,Antihistamine,Dr. Reddy's
Azithromycin 500mg,Azithromycin,40,AZ-2026-550,2027-09-30,115.00,Antibiotic,Cipla Ltd
Atorvastatin 10mg,Atorvastatin Calcium,75,AT-2026-722,2027-12-31,98.00,Cardiac,Sun Pharma`;

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meditrack_medicine_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV template downloaded");
  };

  // --- Row Item Edits ---
  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        if (field === "name") {
          const matchResult = matchMedicineWithInventory(value, updated.generic, inventory);
          updated.isMatched = !!matchResult.matched;
          updated.matchedMedicine = matchResult.matched;
          updated.confidence = matchResult.confidence;
          if (!updated.isMatched && updated.action !== "create") {
            updated.action = "create";
          }
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddNewRow = () => {
    const newRow = {
      id: `manual-item-${Date.now()}`,
      name: "",
      generic: "",
      quantity: 50,
      action: "create",
      batch: `BAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      expiry: "2027-12-31",
      price: 50,
      category: "Other",
      manufacturer: "Standard Pharma",
      rack: "R-1",
      isMatched: false,
      matchedMedicine: null,
      confidence: "none",
    };
    setItems((prev) => [...prev, newRow]);
  };

  // --- Commit Changes ---
  const handleConfirmImport = async () => {
    if (items.length === 0) {
      toast.error("No medicine items to import");
      return;
    }

    const invalid = items.some((i) => !i.name.trim());
    if (invalid) {
      toast.error("Medicine name is required for all line items");
      return;
    }

    setIsSaving(true);
    try {
      const summary = await applyImportBatch(items);
      toast.success(
        `Imported ${summary.total} items (${summary.added.length} new, ${summary.updated.length} stock updated)`
      );
      onComplete?.(summary);
    } catch (err) {
      console.error("[SmartMedicineImport] Save error:", err);
      toast.error("Failed to commit inventory changes");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Statistics ---
  const stats = useMemo(() => {
    let newMeds = 0;
    let increases = 0;
    let decreases = 0;
    let totalUnits = 0;

    items.forEach((item) => {
      totalUnits += Number(item.quantity) || 0;
      if (item.action === "create" || !item.isMatched) newMeds++;
      else if (item.action === "increase") increases++;
      else if (item.action === "decrease") decreases++;
      else newMeds++;
    });

    return { total: items.length, newMeds, increases, decreases, totalUnits };
  }, [items]);

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      {/* =====================================================
          STATE 1: UPLOAD & INPUT
      ===================================================== */}
      {items.length === 0 && !isProcessing && (
        <div className="space-y-4">
          {/* UPLOAD DROPZONE */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[#0284c7] bg-sky-50/50 dark:bg-sky-950/20"
                : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/40 dark:bg-slate-800/20"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileSelect}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
              className="hidden"
            />

            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-2xs">
              <UploadCloud size={24} />
            </div>

            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Upload Supplier Invoice or Delivery Slip
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              Select or drop your PDF invoice, image, or CSV document to automatically parse items and quantities.
            </p>

            <button
              type="button"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition"
            >
              Choose File
            </button>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleLoadSample}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-medium transition shadow-2xs"
              >
                <FileText size={13} className="text-slate-500" />
                <span>Load Sample Invoice (Cipla)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasteArea(!showPasteArea)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-medium transition shadow-2xs"
              >
                <FileCode size={13} className="text-slate-500" />
                <span>{showPasteArea ? "Hide Text Input" : "Paste Invoice Text"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              <Download size={13} />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* PASTE TEXT INPUT */}
          {showPasteArea && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Paste invoice text or medicine entries:
                </label>
                <button
                  type="button"
                  onClick={() => setPastedText(SAMPLE_INVOICE_TEXT)}
                  className="text-xs text-[#0284c7] dark:text-sky-400 hover:underline"
                >
                  Insert Sample Lines
                </button>
              </div>

              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Augmentin 625 Duo, Qty: 60, Batch: AUG-901, Exp: 2027-08, Price: 185&#10;Dolo 650mg, Qty: 120, Batch: DL-442, Exp: 2027-11, Price: 32.50"
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]/20 resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteArea(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  disabled={!pastedText.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold shadow-2xs disabled:opacity-50"
                >
                  Parse Lines
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          STATE 2: PROCESSING
      ===================================================== */}
      {isProcessing && (
        <div className="py-12 px-6 text-center rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
          <Loader2 size={32} className="text-[#0284c7] animate-spin mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
            Analyzing Invoice Lines
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {progressStatus || "Extracting medicines, batch numbers, and stock..."}
          </p>
        </div>
      )}

      {/* =====================================================
          STATE 3: REVIEW & EDIT GRID
      ===================================================== */}
      {!isProcessing && items.length > 0 && (
        <div className="space-y-3.5">
          {/* INVOICE METADATA BANNER */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {extractedMeta?.supplierName || "Supplier Invoice"}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {extractedMeta?.invoiceNumber || "Slip"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Invoice Date: {extractedMeta?.invoiceDate || new Date().toISOString().split("T")[0]}
              </p>
            </div>

            {/* Status counts */}
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                {stats.total} Line Items
              </span>
              {stats.newMeds > 0 && (
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] border border-emerald-200 dark:border-emerald-800/50">
                  {stats.newMeds} New
                </span>
              )}
              {stats.increases > 0 && (
                <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] dark:text-sky-300 font-medium text-[11px] border border-sky-200 dark:border-sky-800/50">
                  {stats.increases} Stock Updates
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setItems([]);
                  setExtractedMeta(null);
                  setFile(null);
                }}
                className="text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 ml-2 inline-flex items-center gap-1"
                title="Upload a different document"
              >
                <RotateCcw size={11} />
                <span>Re-upload</span>
              </button>
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
            <div className="max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/75 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Medicine</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Stock Impact</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3">Expiry</th>
                    <th className="py-2.5 px-3">Price (₹)</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {items.map((item) => {
                    const currentStock = item.matchedMedicine
                      ? Number(item.matchedMedicine.stock) || 0
                      : 0;
                    const qty = Number(item.quantity) || 0;

                    let finalStockPreview = currentStock;
                    if (item.action === "increase") finalStockPreview = currentStock + qty;
                    else if (item.action === "decrease") finalStockPreview = Math.max(0, currentStock - qty);
                    else if (item.action === "set") finalStockPreview = qty;
                    else finalStockPreview = qty;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* NAME */}
                        <td className="py-2.5 px-3 min-w-[180px]">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                            className="w-full font-medium text-xs bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-[#0284c7] focus:bg-white dark:focus:bg-slate-800 rounded px-1.5 py-0.5 outline-none transition"
                          />
                          <div className="flex items-center gap-1.5 mt-0.5 px-1.5">
                            {item.isMatched ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                Matched: {item.matchedMedicine.name} (Current: {currentStock})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                New Item
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ACTION */}
                        <td className="py-2.5 px-3 min-w-[130px]">
                          <select
                            value={item.action}
                            onChange={(e) => handleItemChange(item.id, "action", e.target.value)}
                            className="w-full text-xs py-1 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#0284c7]"
                          >
                            {item.isMatched ? (
                              <>
                                <option value="increase">Add to stock (+{qty})</option>
                                <option value="decrease">Deduct from stock (-{qty})</option>
                                <option value="set">Set exact stock (={qty})</option>
                                <option value="create">Add as new item</option>
                              </>
                            ) : (
                              <option value="create">Add as new item</option>
                            )}
                          </select>
                        </td>

                        {/* QTY */}
                        <td className="py-2.5 px-3 w-20">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="w-16 py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-center outline-none focus:border-[#0284c7]"
                          />
                        </td>

                        {/* STOCK IMPACT */}
                        <td className="py-2.5 px-3 min-w-[120px]">
                          {item.action === "create" || !item.isMatched ? (
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              Initial: {qty} units
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-slate-400">{currentStock}</span>
                              <ArrowRight size={11} className="text-slate-400" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {finalStockPreview}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({item.action === "increase" ? `+${qty}` : item.action === "decrease" ? `-${qty}` : `=${qty}`})
                              </span>
                            </div>
                          )}
                        </td>

                        {/* BATCH */}
                        <td className="py-2.5 px-3 min-w-[110px]">
                          <input
                            type="text"
                            value={item.batch}
                            onChange={(e) => handleItemChange(item.id, "batch", e.target.value)}
                            placeholder="Batch No"
                            className="w-full font-mono text-[11px] py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#0284c7]"
                          />
                        </td>

                        {/* EXPIRY */}
                        <td className="py-2.5 px-3 min-w-[120px]">
                          <input
                            type="date"
                            value={item.expiry}
                            onChange={(e) => handleItemChange(item.id, "expiry", e.target.value)}
                            className="w-full text-[11px] py-1 px-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#0284c7]"
                          />
                        </td>

                        {/* PRICE */}
                        <td className="py-2.5 px-3 w-20">
                          <input
                            type="number"
                            step="0.5"
                            value={item.price}
                            onChange={(e) => handleItemChange(item.id, "price", parseFloat(e.target.value) || 0)}
                            className="w-16 py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold outline-none focus:border-[#0284c7]"
                          />
                        </td>

                        {/* CATEGORY */}
                        <td className="py-2.5 px-3 min-w-[110px]">
                          <select
                            value={item.category}
                            onChange={(e) => handleItemChange(item.id, "category", e.target.value)}
                            className="w-full text-[11px] py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#0284c7]"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* DELETE */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition p-1"
                            title="Remove row"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TABLE FOOTER */}
            <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleAddNewRow}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0284c7] dark:text-sky-400 hover:underline"
              >
                <Plus size={13} />
                <span>Add Line Item</span>
              </button>

              <span className="text-slate-500 dark:text-slate-400">
                Total Units: <strong>{stats.totalUnits}</strong>
              </span>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isSaving || items.length === 0}
              className="px-5 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Updating Inventory...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Confirm & Apply ({items.length} items)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
