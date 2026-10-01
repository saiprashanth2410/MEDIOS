import { useEffect, useState } from "react";
import { billingFirebaseService } from "../services/billingFirebaseService";
import { inventoryFirebaseService } from "../services/inventoryFirebaseService";
import defaultMedicines from "../data/catalogMedicines.json";

function getLiveMedicines() {
  try {
    const list = inventoryFirebaseService.getMedicines();
    if (list && list.length > 0) return list;
  } catch {}
  return defaultMedicines;
}

export default function usePerformanceData() {
  const [data, setData] = useState(() => {
    const meds = getLiveMedicines();
    return {
      sales: [],
      medicines: meds.map((m) => ({
        stock: Number(m.stock) || 0,
        price: Number(m.price || m.sellingPrice) || 0,
        lastSoldDate: m.expiry || "2026-09-01",
      })),
      orders: [],
      shipments: [],
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const [recentSales, meds] = await Promise.all([
          billingFirebaseService.getRecentInvoices(50).catch(() => []),
          Promise.resolve(getLiveMedicines()),
        ]);

        if (cancelled) return;

        const liveSales = (recentSales || []).map((s) => {
          const qty = s.items?.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) || 1;
          return {
            actualQty: qty,
            forecastedQty: Math.max(1, qty),
          };
        });

        const liveMedicines = meds.map((m) => ({
          stock: Number(m.stock) || 0,
          price: Number(m.price || m.sellingPrice) || 0,
          lastSoldDate: m.expiry || "2026-09-01",
        }));

        const liveOrders = (recentSales || []).map(() => ({
          status: "fulfilled",
        }));

        setData({
          sales: liveSales,
          medicines: liveMedicines,
          orders: liveOrders,
          shipments: [],
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    const handleUpdate = () => fetchData();
    window.addEventListener("meditrack_sales_updated", handleUpdate);
    window.addEventListener("meditrack_stock_updated", handleUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("meditrack_sales_updated", handleUpdate);
      window.removeEventListener("meditrack_stock_updated", handleUpdate);
    };
  }, []);

  return { data, loading, error };
}