import { useEffect, useState } from "react";

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
    // Real API-ku switch panna:
    // async function fetchData() {
    //   try {
    //     setLoading(true);
    //     const [sales, medicines, orders, shipments] = await Promise.all([
    //       fetch("/api/sales?days=30").then((r) => r.json()),
    //       fetch("/api/medicines").then((r) => r.json()),
    //       fetch("/api/orders?days=30").then((r) => r.json()),
    //       fetch("/api/shipments?days=30").then((r) => r.json()),
    //     ]);
    //     setData({ sales, medicines, orders, shipments });
    //   } catch (err) {
    //     setError(err.message);
    //   } finally {
    //     setLoading(false);
    //   }
    // }
    // fetchData();
  }, []);

  return { data, loading, error };
}