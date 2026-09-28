import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  withCredentials: true,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const csrf = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
  if (csrf) config.headers["X-XSRF-TOKEN"] = csrf;
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

export default api;