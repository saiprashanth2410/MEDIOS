import { useEffect, useState } from "react";
import { salesAPI, medicinesAPI } from "../services/api";

/* =====================================================
   MOCK DATA — Replace with API calls later
===================================================== */

const MOCK_DATA = {
  sales: [
    { actualQty: 103, forecastedQty: 100 },
    { actualQty: 95, forecastedQty: 98 },
    { actualQty: 120, forecastedQty: 118 },
    { actualQty: 88, forecastedQty: 90 },
  ],
  medicines: [
    { stock: 50, price: 10, lastSoldDate: "2026-09-01" },
    { stock: 30, price: 23, lastSoldDate: "2026-08-10" }, // overstock
    { stock: 64, price: 36, lastSoldDate: "2026-09-20" },
    { stock: 20, price: 15, lastSoldDate: "2026-07-15" }, // overstock
  ],
  orders: [
    { status: "fulfilled" },
    { status: "fulfilled" },
    { status: "out_of_stock" },
    { status: "fulfilled" },
    { status: "fulfilled" },
    { status: "fulfilled" },
  ],
  shipments: [
    { expectedAt: "2026-09-01", deliveredAt: "2026-09-05" },
    { expectedAt: "2026-09-10", deliveredAt: "2026-09-18" },
    { expectedAt: "2026-09-15", deliveredAt: "2026-09-20" },
  ],
};

/* =====================================================
   HOOK
===================================================== */

export default function usePerformanceData() {
  const [data, setData] = useState(MOCK_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        const [salesRes, medRes] = await Promise.allSettled([
          salesAPI.list({ limit: 50 }),
          medicinesAPI.list({ limit: 50 }),
        ]);

        if (cancelled) return;

        const liveMedicines =
          medRes.status === "fulfilled" && medRes.value?.medicines?.length > 0
            ? medRes.value.medicines.map((m) => ({
                stock: m.quantity || m.stock || 0,
                price: m.unitPrice || m.price || 0,
                lastSoldDate: m.updatedAt || m.createdAt || "2026-09-01",
              }))
            : MOCK_DATA.medicines;

        const liveSales =
          salesRes.status === "fulfilled" && salesRes.value?.sales?.length > 0
            ? salesRes.value.sales.map((s) => ({
                actualQty: s.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1,
                forecastedQty: Math.max(1, (s.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1) + 2),
              }))
            : MOCK_DATA.sales;

        setData({
          sales: liveSales,
          medicines: liveMedicines,
          orders: MOCK_DATA.orders,
          shipments: MOCK_DATA.shipments,
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}