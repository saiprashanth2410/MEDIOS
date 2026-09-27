export const authService = {
  async login({ email, password, remember }) {
    console.log("[authService] Login called:", {
      email,
      passwordLength: password?.length,
      remember,
    });

    await new Promise((r) => setTimeout(r, 800));

    if (!email || !password) {
      console.warn("[authService] Missing fields");
      return { ok: false, message: "Email and password required" };
    }

    if (password.length < 6) {
      console.warn("[authService] Password too short:", password.length);
      return { ok: false, message: "Password must be at least 6 characters" };
    }

    console.log("[authService] ✅ Validation passed, returning user");

    return {
      ok: true,
      user: {
        id: "1",
        name: email.split("@")[0].replace(/\./g, " "),
        email,
        role: "Chief Pharmacist",
      },
      token: "mock-jwt-" + Date.now(),
    };
  },
};