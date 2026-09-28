import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, Pill, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

const AddBatchModal = ({ isOpen, onClose, onAdd, editBatch }) => {
  const [submitting, setSubmitting] = useState(false);
  const [brandMaster, setBrandMaster] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [nameError, setNameError] = useState("");

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const [formData, setFormData] = useState({
    medicineName: '',
    batchNumber: '',
    quantity: '',
    expiryDate: '',
    supplier: ''
  });

  /* =====================================================
     LOAD BRANDMASTER.TSV
  ===================================================== */
  useEffect(() => {
    let cancelled = false;

    const loadBrandMaster = async () => {
      try {
        setLoadingMaster(true);
        const res = await fetch("/data/BrandMaster.tsv");
        if (!res.ok) throw new Error("Failed to load BrandMaster");

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

                const genericMatch = fullName.match(/\(([^)]+)\)/);
                const genericName = genericMatch ? genericMatch[1].trim() : "";
                const brandName = fullName.split("(")[0].trim();
                const dosageMatch = fullName.match(/\)\s*(.+)$/);
                const dosage = dosageMatch ? dosageMatch[1].trim() : "";

                return {
                  id: String(row["Identifier"] || `bm-${index}`),
                  fullName,
                  brandName,
                  genericName,
                  dosage,
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

    if (isOpen) loadBrandMaster();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /* =====================================================
     AUTOCOMPLETE SUGGESTIONS
  ===================================================== */
  const suggestions = useMemo(() => {
    const q = formData.medicineName.toLowerCase().trim();
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
  }, [formData.medicineName, brandMaster]);

  /* =====================================================
     FILL FORM WHEN EDITING + RESET ON OPEN
  ===================================================== */
  useEffect(() => {
    if (editBatch) {
      setFormData({
        medicineName: editBatch.medicineName || '',
        batchNumber: editBatch.batchNumber || '',
        quantity: editBatch.quantity || '',
        expiryDate: editBatch.expiryDate || '',
        supplier: editBatch.supplier || ''
      });
      setSelectedMaster({ fullName: editBatch.medicineName }); // Treat as selected in edit mode
      setNameError("");
    } else {
      setFormData({
        medicineName: '',
        batchNumber: '',
        quantity: '',
        expiryDate: '',
        supplier: ''
      });
      setSelectedMaster(null);
      setShowSuggestions(false);
      setNameError("");
    }
  }, [editBatch, isOpen]);

  /* =====================================================
     FORCE CLEAR INPUT ON OPEN
  ===================================================== */
  useEffect(() => {
    if (!isOpen) return;

    const clearInput = () => {
      if (inputRef.current) {
        inputRef.current.value = editBatch ? editBatch.medicineName || "" : "";
        inputRef.current.setAttribute("readonly", "readonly");
      }
    };

    const t1 = setTimeout(clearInput, 50);
    const t2 = setTimeout(clearInput, 200);
    const t3 = setTimeout(clearInput, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, editBatch]);

  /* =====================================================
     CLICK OUTSIDE
  ===================================================== */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);

        // ✅ STRICT: If user typed something but didn't select, show error
        if (formData.medicineName.length > 0 && !selectedMaster) {
          setNameError(
            "Please select a medicine from the list. Only CDCI-registered medicines are allowed."
          );
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [formData.medicineName, selectedMaster]);

  if (!isOpen) return null;

  /* =====================================================
     HANDLERS
  ===================================================== */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNameChange = (value) => {
    setFormData((prev) => ({ ...prev, medicineName: value }));
    setShowSuggestions(true);
    setHighlightedIndex(-1);
    setSelectedMaster(null);
    setNameError("");
  };

  const handleSelectSuggestion = (med) => {
    setFormData((prev) => ({
      ...prev,
      medicineName: med.fullName,
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

  /* =====================================================
     SUBMIT — STRICT VALIDATION
  ===================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ STRICT: Must have selected from master list
    if (!selectedMaster) {
      setNameError(
        "Please select a medicine from the suggestions list. Only CDCI-registered medicines can be added."
      );
      toast.error("Invalid medicine — select from the list");
      inputRef.current?.focus();
      return;
    }

    if (!formData.batchNumber || !formData.quantity || !formData.expiryDate) {
      toast.error("Please fill all required fields");
      return;
    }

    const today = new Date();
    const expiry = new Date(formData.expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status = "Active";
    if (diffDays < 0) status = "Expired";
    else if (diffDays <= 30) status = "Expiring Soon";

    const batchData = {
      ...formData,
      medicineName: selectedMaster.fullName, // ✅ Use the full selected name
      id: editBatch ? editBatch.id : `BATCH-${Date.now().toString().slice(-6)}`,
      quantity: parseInt(formData.quantity, 10) || 0,
      status,
    };

    setSubmitting(true);
    try {
      await onAdd(batchData, !!editBatch);
      setFormData({
        medicineName: '',
        batchNumber: '',
        quantity: '',
        expiryDate: '',
        supplier: '',
      });
      setSelectedMaster(null);
      setNameError("");
      onClose();
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {editBatch ? 'Edit Batch' : 'Add New Batch'}
        </h2>

        {/* Hidden dummy inputs for autofill block */}
        <div style={{ display: 'none' }}>
          <input type="text" name="fake_user_xyz" tabIndex={-1} autoComplete="off" />
          <input type="password" name="fake_pass_xyz" tabIndex={-1} autoComplete="new-password" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">

          {/* =====================================================
             MEDICINE NAME — Strict Mode
          ===================================================== */}
          <div className="relative" ref={suggestionsRef}>
            <label className="block text-sm font-medium text-gray-700">
              Medicine Name *
            </label>
            <div className="relative mt-1">
              <Pill
                size={16}
                className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  nameError
                    ? "text-rose-500"
                    : selectedMaster
                    ? "text-emerald-500"
                    : "text-gray-400"
                }`}
              />
              <input
                ref={inputRef}
                type="text"
                name="med_search_input_xyz"
                id="med_search_input_xyz"
                value={formData.medicineName}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={(e) => {
                  e.target.removeAttribute("readonly");
                  if (formData.medicineName.length >= 2) setShowSuggestions(true);
                }}
                onBlur={(e) => {
                  setTimeout(() => {
                    if (e.target && !selectedMaster && !formData.medicineName) {
                      e.target.setAttribute("readonly", "readonly");
                    }
                  }, 100);
                }}
                onKeyDown={handleKeyDown}
                className={`w-full pl-9 pr-10 p-2 border rounded-md focus:ring-2 outline-none ${
                  nameError
                    ? "border-rose-300 focus:ring-rose-500"
                    : selectedMaster
                    ? "border-emerald-300 focus:ring-emerald-500"
                    : "border-gray-200 focus:ring-blue-500"
                }`}
                placeholder="Type to search CDCI medicines..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                readOnly
                disabled={submitting}
              />

              {loadingMaster && (
                <Loader2
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
                />
              )}
              {!loadingMaster && selectedMaster && (
                <CheckCircle2
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"
                />
              )}
              {!loadingMaster && !selectedMaster && formData.medicineName && (
                <AlertCircle
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500"
                />
              )}
            </div>

            {/* Error message */}
            {nameError && (
              <div className="mt-1.5 flex items-start gap-1.5 text-rose-600">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <p className="text-[11px] font-medium">{nameError}</p>
              </div>
            )}

            {/* Success message */}
            {selectedMaster && !nameError && (
              <div className="mt-1.5 flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 size={12} />
                <p className="text-[11px] font-medium">
                  ✓ Selected: <strong>{selectedMaster.brandName}</strong>{" "}
                  {selectedMaster.genericName && `(${selectedMaster.genericName})`}
                </p>
              </div>
            )}

            {/* SUGGESTIONS DROPDOWN */}
            {showSuggestions && formData.medicineName.length >= 2 && !selectedMaster && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-72 overflow-y-auto">
                {loadingMaster ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={18} className="text-blue-600 animate-spin" />
                    <span className="ml-2 text-xs text-gray-500">
                      Loading master data...
                    </span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <AlertCircle
                      size={20}
                      className="text-rose-400 mx-auto mb-2"
                    />
                    <p className="text-sm font-semibold text-gray-700">
                      Medicine not found in CDCI
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
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
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition border-b border-gray-100 last:border-b-0 ${
                        highlightedIndex === idx
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                        <Pill size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {med.genericName || med.brandName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {med.brandName}
                          {med.dosage ? ` · ${med.dosage}` : ""}
                        </p>
                      </div>
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* =====================================================
             BATCH NO + QUANTITY
          ===================================================== */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch No *</label>
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleChange}
                className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="PCM2024A"
                disabled={submitting}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="100"
                disabled={submitting}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Expiry Date *</label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={submitting}
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Supplier</label>
            <input
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Supplier Name"
              disabled={submitting}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (!selectedMaster && !editBatch)}
              className={`px-4 py-2 text-white rounded-md transition-colors shadow-md flex items-center gap-2 ${
                submitting || (!selectedMaster && !editBatch)
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                editBatch ? 'Update Batch' : 'Save Batch'
              )}
            </button>
          </div>

          {/* Info banner for strict mode */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
            <AlertCircle size={14} className="text-blue-600 shrink-0" />
            <p className="text-[11px] text-blue-700">
              Only CDCI-registered medicines can be added. Select from the suggestions list.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBatchModal;