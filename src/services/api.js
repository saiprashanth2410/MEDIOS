import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  withCredentials: true,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  try {
    if (typeof document !== "undefined" && document.cookie) {
      const csrf = document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.split("=")[1];
      if (csrf) config.headers["X-XSRF-TOKEN"] = csrf;
    }
  } catch (err) {
    console.debug("CSRF token check failed:", err);
  }
  return config;
});

/* =====================================================
   SUPPLIERS API
===================================================== */
export const suppliersAPI = {
  list: async ({ page = 1, limit = 50, search = "", status = "all" } = {}) => {
    const params = new URLSearchParams({ page, limit, search, status });
    const res = await api.get(`/suppliers?${params}`);
    return res.data;
  },

  stats: async () => {
    const res = await api.get("/suppliers/stats");
    return res.data;
  },

  get: async (code) => {
    const res = await api.get(`/suppliers/${code}`);
    return res.data;
  },

  create: async (supplier) => {
    const res = await api.post("/suppliers", supplier);
    return res.data;
  },

  update: async (code, supplier) => {
    const res = await api.put(`/suppliers/${code}`, supplier);
    return res.data;
  },

  delete: async (code) => {
    const res = await api.delete(`/suppliers/${code}`);
    return res.data;
  },
};

/* =====================================================
   MEDICINES API
===================================================== */
export const medicinesAPI = {
  list: async ({ page = 1, limit = 50, search = "", supplier = "" } = {}) => {
    const params = new URLSearchParams({ page, limit, search, supplier });
    const res = await api.get(`/medicines?${params}`);
    return res.data;
  },

  stats: async () => {
    const res = await api.get("/medicines/stats");
    return res.data;
  },

  get: async (code) => {
    const res = await api.get(`/medicines/${code}`);
    return res.data;
  },

  create: async (medicine) => {
    const res = await api.post("/medicines", medicine);
    return res.data;
  },

  update: async (code, medicine) => {
    const res = await api.put(`/medicines/${code}`, medicine);
    return res.data;
  },

  delete: async (code) => {
    const res = await api.delete(`/medicines/${code}`);
    return res.data;
  },
};

/* =====================================================
   PRESCRIPTIONS API
===================================================== */
export const prescriptionsAPI = {
  list: async ({ page = 1, limit = 50, search = "", status = "all" } = {}) => {
    const params = new URLSearchParams({ page, limit, search, status });
    const res = await api.get(`/prescriptions?${params}`);
    return res.data;
  },

  stats: async () => {
    const res = await api.get("/prescriptions/stats");
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/prescriptions/${id}`);
    return res.data;
  },

  create: async (prescription) => {
    const res = await api.post("/prescriptions", prescription);
    return res.data;
  },

  update: async (id, prescription) => {
    const res = await api.put(`/prescriptions/${id}`, prescription);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/prescriptions/${id}`);
    return res.data;
  },
};

/* =====================================================
   BATCHES API
===================================================== */
export const batchesAPI = {
  list: async ({ page = 1, limit = 50, search = "", status = "All" } = {}) => {
    const params = new URLSearchParams({ page, limit, search, status });
    const res = await api.get(`/batches?${params}`);
    return res.data;
  },

  stats: async () => {
    const res = await api.get("/batches/stats");
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/batches/${id}`);
    return res.data;
  },

  create: async (batch) => {
    const res = await api.post("/batches", batch);
    return res.data;
  },

  update: async (id, batch) => {
    const res = await api.put(`/batches/${id}`, batch);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/batches/${id}`);
    return res.data;
  },
};

/* =====================================================
   PHARMACISTS API
===================================================== */
export const pharmacistsAPI = {
  list: async ({ search = "", status = "all" } = {}) => {
    const params = new URLSearchParams({ search, status });
    const res = await api.get(`/pharmacists?${params}`);
    return res.data;
  },

  stats: async () => {
    const res = await api.get("/pharmacists/stats");
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/pharmacists/${id}`);
    return res.data;
  },

  create: async (pharmacist) => {
    const res = await api.post("/pharmacists", pharmacist);
    return res.data;
  },

  update: async (id, pharmacist) => {
    const res = await api.put(`/pharmacists/${id}`, pharmacist);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/pharmacists/${id}`);
    return res.data;
  },
};

/* =====================================================
   SALES & BILLING (POS) API
===================================================== */
export const salesAPI = {
  list: async ({ page = 1, limit = 50, search = "" } = {}) => {
    const params = new URLSearchParams({ page, limit, search });
    const res = await api.get(`/sales?${params}`);
    return res.data;
  },

  stats: async () => {
    const res = await api.get("/sales/stats");
    return res.data;
  },

  create: async (saleData) => {
    const res = await api.post("/sales", saleData);
    return res.data;
  },
};

/* =====================================================
   ANALYTICS API
===================================================== */
export const analyticsAPI = {
  summary: async () => {
    const res = await api.get("/analytics/summary");
    return res.data;
  },
};

/* =====================================================
   NOTIFICATIONS API
===================================================== */
export const notificationsAPI = {
  list: async ({
    page = 1,
    limit = 50,
    search = "",
    status = "all",
    type = "all",
  } = {}) => {
    const params = new URLSearchParams({ page, limit, search, status, type });
    const res = await api.get(`/notifications?${params}`);
    return res.data;
  },

  stats: async () => {
    const res = await api.get("/notifications/stats");
    return res.data;
  },

  markAllRead: async () => {
    const res = await api.put("/notifications/read-all");
    return res.data;
  },

  markRead: async (id) => {
    const res = await api.put(`/notifications/${id}`, { read: true });
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/notifications/${id}`, data);
    return res.data;
  },

  clearAll: async () => {
    const res = await api.delete("/notifications/clear-all");
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post("/notifications", data);
    return res.data;
  },
};

/* =====================================================
   SETTINGS & PROFILE API
===================================================== */
export const settingsAPI = {
  get: async () => {
    const res = await api.get("/settings");
    return res.data;
  },

  update: async (data) => {
    const res = await api.put("/settings", data);
    return res.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await api.post("/profile/change-password", {
      currentPassword,
      newPassword,
    });
    return res.data;
  },
};

export const profileAPI = settingsAPI;

export default api;