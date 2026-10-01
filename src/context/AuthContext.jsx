import { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("meditrack_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log("[AuthContext] Restored session:", parsed);
        return parsed;
      }
    } catch (err) {
      console.error("[AuthContext] Session restore failed:", err);
      localStorage.removeItem("meditrack_user");
    }
    return null;
  });
  const loading = false;
  const [authLoading, setAuthLoading] = useState(false);

  /* =====================================================
     LOGIN — async, handles API + persistence
  ===================================================== */
  const login = useCallback(async ({ email, password, remember }) => {
    console.log("[AuthContext] login called:", { email, remember });
    setAuthLoading(true);

    try {
      const result = await authService.login({ email, password, remember });
      console.log("[AuthContext] authService result:", result);

      if (!result?.ok) {
        throw new Error(result?.message || "Invalid email or password.");
      }

      // ✅ Save to state AND localStorage
      setUser(result.user);
      localStorage.setItem("meditrack_user", JSON.stringify(result.user));
      if (result.user?.logId) {
        localStorage.setItem("meditrack_log_id", result.user.logId);
      }

      console.log("[AuthContext] ✅ User saved:", result.user);
      toast.success(`Welcome back, ${result.user.name || "Pharmacist"}!`);

      return { ok: true, user: result.user };
    } catch (err) {
      console.error("[AuthContext] Login error:", err);
      toast.error(err.message || "Login failed. Please try again.");
      return { ok: false, message: err.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /* =====================================================
     REGISTER — creates account + auth log
  ===================================================== */
  const register = useCallback(async ({ name, email, password, role }) => {
    console.log("[AuthContext] register called:", { name, email, role });
    setAuthLoading(true);

    try {
      const result = await authService.register({ name, email, password, role });
      if (!result?.ok) {
        throw new Error(result?.message || "Registration failed.");
      }

      setUser(result.user);
      localStorage.setItem("meditrack_user", JSON.stringify(result.user));
      if (result.user.logId) {
        localStorage.setItem("meditrack_log_id", result.user.logId);
      }

      toast.success(`Account created! Welcome, ${result.user.name || "Pharmacist"}`);
      return { ok: true, user: result.user };
    } catch (err) {
      console.error("[AuthContext] Register error:", err);
      toast.error(err.message || "Registration failed");
      return { ok: false, message: err.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /* =====================================================
     LOGOUT — async, updates MongoDB with logout time & duration
  ===================================================== */
  const logout = useCallback(async () => {
    const currentUser = user;
    const currentLogId = currentUser?.logId || localStorage.getItem("meditrack_log_id");

    // Fire backend logout log immediately
    if (currentUser?.email || currentLogId) {
      try {
        await authService.logout(currentUser?.email, currentLogId);
      } catch (e) {
        console.warn("[AuthContext] Logout recording warning:", e);
      }
    }

    setUser(null);
    localStorage.removeItem("meditrack_user");
    localStorage.removeItem("meditrack_log_id");
    localStorage.removeItem("scanHistory");
    toast.success("Logged out successfully");
  }, [user]);

  /* =====================================================
     UPDATE USER (partial)
  ===================================================== */
  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem("meditrack_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  /* =====================================================
     LOGIN WITH OAUTH (Google / GitHub)
  ===================================================== */
  const loginWithOAuth = useCallback(
    async ({ provider = "google", email, name, avatar, credential }) => {
      console.log("[AuthContext] loginWithOAuth called:", { provider, email, name });
      setAuthLoading(true);

      try {
        const result = await authService.oauthLogin({
          provider,
          email,
          name,
          avatar,
          credential,
        });

        if (!result?.ok) {
          throw new Error(result?.message || `${provider} authentication failed.`);
        }

        setUser(result.user);
        localStorage.setItem("meditrack_user", JSON.stringify(result.user));
        if (result.user?.logId) {
          localStorage.setItem("meditrack_log_id", result.user.logId);
        }

        const providerLabel = provider === "google" ? "Google" : "GitHub";
        toast.success(
          `Signed in with ${providerLabel} as ${result.user.name || result.user.email}!`
        );
        return { ok: true, user: result.user };
      } catch (err) {
        console.error("[AuthContext] OAuth error:", err);
        toast.error(err.message || "OAuth login failed");
        return { ok: false, message: err.message };
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authLoading,
        login,
        register,
        loginWithOAuth,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}