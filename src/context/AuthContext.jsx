import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { auth, db } from "../config/firebase";
import { authService } from "../services/authService";
import { initializeNewUserScope } from "../utils/userScope";

const defaultAuthValue = {
  user: null,
  loading: false,
  authLoading: false,
  login: async () => ({ ok: false }),
  loginWithGoogle: async () => ({ ok: false }),
  loginWithOAuth: async () => ({ ok: false }),
  register: async () => ({ ok: false }),
  logout: async () => {},
  updateUser: () => {},
  isAuthenticated: false,
};

const AuthContext = createContext(defaultAuthValue);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("meditrack_user");
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error("[AuthContext] Session restore failed:", err);
      localStorage.removeItem("meditrack_user");
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  /* =====================================================
     FIREBASE AUTH STATE LISTENER
  ===================================================== */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          let role = "Chief Pharmacist";
          let pharmacy = "MediTrack Central";
          try {
            const userSnap = await getDoc(doc(db, "users", fbUser.uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              role = data.role || role;
              pharmacy = data.pharmacy || pharmacy;
            }
          } catch {
            // Keep default role on permission or offline
          }

          const currentUser = {
            uid: fbUser.uid,
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split("@")[0].replace(/\./g, " ") || "Pharmacist",
            email: fbUser.email,
            role,
            pharmacy,
            photoURL: fbUser.photoURL || "",
            avatar: fbUser.photoURL || "",
          };

          setUser(currentUser);
          localStorage.setItem("meditrack_user", JSON.stringify(currentUser));
        } else {
          setUser(null);
          localStorage.removeItem("meditrack_user");
        }
      } catch (err) {
        console.error("[AuthContext] onAuthStateChanged error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /* =====================================================
     LOGIN (EMAIL / PASSWORD)
  ===================================================== */
  const login = useCallback(async ({ email, password, remember }) => {
    setAuthLoading(true);
    try {
      const result = await authService.login({ email, password, remember });
      if (!result?.ok) {
        throw new Error(result?.message || "Invalid email or password.");
      }

      setUser(result.user);
      localStorage.setItem("meditrack_user", JSON.stringify(result.user));
      toast.success(`Welcome back, ${result.user.name || "Pharmacist"}!`);
      return { ok: true, user: result.user };
    } catch (err) {
      console.error("[AuthContext] Login error:", err);
      toast.error(err.message || "Login failed.");
      return { ok: false, message: err.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /* =====================================================
     LOGIN WITH GOOGLE
  ===================================================== */
  const loginWithGoogle = useCallback(async () => {
    setAuthLoading(true);
    try {
      const result = await authService.loginWithGoogle();
      if (!result?.ok) {
        throw new Error(result?.message || "Google sign-in failed.");
      }

      setUser(result.user);
      localStorage.setItem("meditrack_user", JSON.stringify(result.user));
      toast.success(`Signed in with Google as ${result.user.name}!`);
      return { ok: true, user: result.user };
    } catch (err) {
      console.error("[AuthContext] Google Login error:", err);
      toast.error(err.message || "Google sign-in failed.");
      return { ok: false, message: err.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /* =====================================================
     REGISTER
  ===================================================== */
  const register = useCallback(async ({ name, email, password, role, pharmacy, license }) => {
    setAuthLoading(true);
    try {
      const result = await authService.register({ name, email, password, role, pharmacy, license });
      if (!result?.ok) {
        throw new Error(result?.message || "Registration failed.");
      }

      // Initialize brand new user account with clean zero-data state
      initializeNewUserScope(result.user.uid || result.user.email);

      setUser(result.user);
      localStorage.setItem("meditrack_user", JSON.stringify(result.user));
      toast.success(`Account created! Welcome, ${result.user.name || "Pharmacist"}`);
      return { ok: true, user: result.user };
    } catch (err) {
      console.error("[AuthContext] Register error:", err);
      toast.error(err.message || "Registration failed.");
      return { ok: false, message: err.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /* =====================================================
     LOGOUT
  ===================================================== */
  const logout = useCallback(async () => {
    const currentUser = user;
    if (currentUser?.email) {
      await authService.logout(currentUser.email);
    } else {
      await authService.logout();
    }

    setUser(null);
    localStorage.removeItem("meditrack_user");
    localStorage.removeItem("meditrack_log_id");
    localStorage.removeItem("scanHistory");
    toast.success("Logged out successfully");
  }, [user]);

  /* =====================================================
     UPDATE USER
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
        loginWithGoogle,
        loginWithOAuth: loginWithGoogle,
        register,
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
  if (!ctx || ctx === defaultAuthValue) {
    let savedUser = null;
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("meditrack_user");
        if (saved) savedUser = JSON.parse(saved);
      }
    } catch (_) {}

    return {
      ...defaultAuthValue,
      user: savedUser,
      isAuthenticated: !!savedUser,
    };
  }
  return ctx;
}