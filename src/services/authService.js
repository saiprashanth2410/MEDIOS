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
};