import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "sonner";
import { findMedicineByBarcode } from "../data/medicines";

const ScanContext = createContext(null);

const MAX_HISTORY = 20;

export function ScanProvider({ children }) {
  const [lastScan, setLastScan] = useState(null);
  const [medicine, setMedicine] = useState(null);
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("scanHistory")) || [];
    } catch {
      return [];
    }
  });
  const [scanning, setScanning] = useState(false);

  /* Persist history */
  useEffect(() => {
    localStorage.setItem("scanHistory", JSON.stringify(history));
  }, [history]);

  /* =====================================================
     SCAN — main handler
  ===================================================== */
  const scan = useCallback(async (code) => {
    setScanning(true);
    setLastScan(code);

    try {
      const med = findMedicineByBarcode(code);
      setMedicine(med);

      if (med) {
        toast.success(`Found: ${med.name}`);

        setHistory((prev) => {
          const newEntry = {
            code,
            name: med.name,
            batch: med.batch,
            timestamp: Date.now(),
          };
          return [newEntry, ...prev.filter((h) => h.code !== code)].slice(
            0,
            MAX_HISTORY
          );
        });
      } else {
        toast.warning(`No medicine found for: ${code}`);
      }

      return { ok: true, medicine: med };
    } catch (err) {
      toast.error("Scan lookup failed");
      return { ok: false, message: err.message };
    } finally {
      setScanning(false);
    }
  }, []);

  /* =====================================================
     CLEAR
  ===================================================== */
  const clearLastScan = useCallback(() => {
    setLastScan(null);
    setMedicine(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem("scanHistory");
    toast.success("Scan history cleared");
  }, []);

  return (
    <ScanContext.Provider
      value={{
        lastScan,
        medicine,
        history,
        scanning,
        scan,
        clearLastScan,
        clearHistory,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScan must be used inside ScanProvider");
  return ctx;
}