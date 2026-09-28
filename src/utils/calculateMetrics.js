/* =====================================================
   PERFORMANCE METRICS CALCULATIONS
===================================================== */

/**
 * 1. Demand Forecast Error
 * Compares forecasted sales vs actual sales
 */
export function calculateForecastError(salesData = []) {
  if (!salesData.length) return 0;

  const totalActual = salesData.reduce((sum, s) => sum + (s.actualQty || 0), 0);
  const totalForecast = salesData.reduce((sum, s) => sum + (s.forecastedQty || 0), 0);

  if (totalActual === 0) return 0;

  const error = (Math.abs(totalActual - totalForecast) / totalActual) * 100;
  return Math.round(error * 10) / 10; // 1 decimal
}

/**
 * 2. Inventory Overstock %
 * % of inventory value that hasn't sold in 30+ days
 */
export function calculateOverstock(medicines = [], daysThreshold = 30) {
  if (!medicines.length) return 0;

  const now = Date.now();
  const threshold = daysThreshold * 24 * 60 * 60 * 1000;

  const totalValue = medicines.reduce(
    (sum, m) => sum + (m.stock || 0) * (m.price || 0),
    0
  );

  const overstockValue = medicines
    .filter((m) => {
      if (!m.lastSoldDate) return true; // never sold → overstock
      return now - new Date(m.lastSoldDate).getTime() > threshold;
    })
    .reduce((sum, m) => sum + (m.stock || 0) * (m.price || 0), 0);

  if (totalValue === 0) return 0;

  const percent = (overstockValue / totalValue) * 100;
  return Math.round(percent * 10) / 10;
}

/**
 * 3. Stockout Incidents %
 * % of orders that couldn't be fulfilled
 */
export function calculateStockoutRate(orders = []) {
  if (!orders.length) return 0;

  const stockoutOrders = orders.filter(
    (o) => o.status === "out_of_stock" || o.unfulfilled
  ).length;

  const percent = (stockoutOrders / orders.length) * 100;
  return Math.round(percent * 10) / 10;
}

/**
 * 4. Average Procurement Delay (in days)
 * Average gap between expected & actual delivery
 */
export function calculateProcurementDelay(shipments = []) {
  const delivered = shipments.filter(
    (s) => s.deliveredAt && s.expectedAt
  );

  if (!delivered.length) return 0;

  const totalDelay = delivered.reduce((sum, s) => {
    const expected = new Date(s.expectedAt).getTime();
    const actual = new Date(s.deliveredAt).getTime();
    const days = (actual - expected) / (1000 * 60 * 60 * 24);
    return sum + Math.max(0, days); // only positive delays
  }, 0);

  const avg = totalDelay / delivered.length;
  return Math.round(avg * 10) / 10;
}

/* =====================================================
   TREND — compare with previous period
===================================================== */

export function calculateTrend(current, previous) {
  if (previous === 0) return 0;
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 10) / 10;
}