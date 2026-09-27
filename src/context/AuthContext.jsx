import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  /* =====================================================
     RESTORE SESSION ON MOUNT
  ===================================================== */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("meditrack_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        console.log("[AuthContext] Restored session:", parsed);
      }
    } catch (err) {
      console.error("[AuthContext] Session restore failed:", err);
      localStorage.removeItem("meditrack_user");
    } finally {
      setLoading(false);
    }
  }, []);

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
     LOGOUT
  ===================================================== */
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("meditrack_user");
    localStorage.removeItem("scanHistory");
    toast.success("Logged out successfully");
  }, []);

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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authLoading,
        login,
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