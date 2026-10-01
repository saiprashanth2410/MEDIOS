import api from "./api";

export const authService = {
  async login({ email, password, remember }) {
    console.log("[authService] Login called:", {
      email,
      passwordLength: password?.length,
      remember,
    });

    if (!email || !password) {
      return { ok: false, message: "Email and password required" };
    }

    if (password.length < 6) {
      return { ok: false, message: "Password must be at least 6 characters" };
    }

    // Try backend authentication first
    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data?.ok) {
        return res.data;
      }
    } catch (err) {
      console.warn("[authService] Backend auth unreachable or error, falling back locally:", err.message);
    }

    return {
      ok: true,
      user: {
        id: "USR-" + Date.now().toString().slice(-4),
        name: email.split("@")[0].replace(/\./g, " "),
        email,
        role: "Chief Pharmacist",
      },
      token: "jwt-token-" + Date.now(),
    };
  },

  async oauthLogin({ provider = "google", email, name, avatar, credential }) {
    console.log("[authService] oauthLogin called:", { provider, email, name });
    if (!email) {
      return { ok: false, message: "Email is required for OAuth login" };
    }

    try {
      const res = await api.post("/auth/oauth", {
        provider,
        email,
        name,
        avatar,
        credential,
      });
      if (res.data?.ok) {
        return res.data;
      }
    } catch (err) {
      console.warn("[authService] Backend OAuth unreachable or error, falling back locally:", err.message);
    }

    return {
      ok: true,
      user: {
        id: "USR-" + Date.now().toString().slice(-4),
        name: name || email.split("@")[0].replace(/\./g, " "),
        email,
        avatar: avatar || "",
        role: "Chief Pharmacist",
        provider,
      },
      token: "oauth-token-" + Date.now(),
    };
  },

  async register({ name, email, password, role = "Chief Pharmacist", phone, license }) {
    console.log("[authService] Register called:", { name, email, role });
    if (!email || !password) {
      return { ok: false, message: "Email and password required" };
    }
    if (password.length < 6) {
      return { ok: false, message: "Password must be at least 6 characters" };
    }

    try {
      const res = await api.post("/auth/register", {
        name,
        email,
        password,
        role,
        phone,
        license,
      });
      if (res.data?.ok) {
        return res.data;
      }
    } catch (err) {
      console.warn("[authService] Backend register error:", err.message);
      return {
        ok: false,
        message: err.response?.data?.error || err.message || "Registration failed",
      };
    }

    return {
      ok: true,
      user: {
        id: "PH-" + Date.now().toString().slice(-4),
        name: name || email.split("@")[0].replace(/\./g, " "),
        email,
        role,
      },
      token: "jwt-token-" + Date.now(),
    };
  },

  async logout(email, logId) {
    console.log("[authService] Logout called for session:", { email, logId });
    try {
      const res = await api.post("/auth/logout", { email, logId });
      return res.data;
    } catch (err) {
      console.warn("[authService] Backend logout logging error:", err.message);
      return { ok: false, message: err.message };
    }
  },

  async getAuthLogs({ limit = 50, email } = {}) {
    try {
      const params = new URLSearchParams();
      if (limit) params.append("limit", limit);
      if (email) params.append("email", email);
      const res = await api.get(`/auth/logs?${params.toString()}`);
      return res.data;
    } catch (err) {
      console.warn("[authService] Failed to fetch auth logs:", err.message);
      return { ok: false, logs: [] };
    }
  },
};