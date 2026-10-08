import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { auth, db } from "../config/firebase";
import { authService } from "../services/authService";
import { initializeNewUserScope } from "../utils/userScope";
import { syncActiveDeviceSession } from "../utils/sessionManager";

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
          let license = "";
          let pharmacyId = "";
          let branch = "";
          let phone = "";
          let upiId = "";
          let avatarPref = undefined;

          try {
            const userSnap = await getDoc(doc(db, "users", fbUser.uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              role = data.role || role;
              pharmacy = data.pharmacy || pharmacy;
              license = data.license || "";
              pharmacyId = data.pharmacyId || "";
              branch = data.branch || "";
              phone = data.phone || "";
              upiId = data.upiId || "";
              if (data.avatarPreference !== undefined) {
                avatarPref = data.avatarPreference;
              }
            }
          } catch {
            // Keep default role on permission or offline
          }

          // Check local pharmacy override
          try {
            const rawPharm = localStorage.getItem("meditrack_pharmacy_details");
            if (rawPharm) {
              const p = JSON.parse(rawPharm);
              if (p.name) pharmacy = p.name;
              if (p.license) license = p.license;
              if (p.pharmacyId) pharmacyId = p.pharmacyId;
              if (p.branch) branch = p.branch;
            }
          } catch (_) {}

          // Check local avatar preference override (e.g. user explicitly reset to initials)
          const localAvatarPref = localStorage.getItem("meditrack_user_avatar_preference");
          if (localAvatarPref !== null) {
            avatarPref = localAvatarPref;
          }

          // Dynamic unique fallbacks per user (NO static Tiruvannamalai hardcodes)
          const finalPharmacyId = pharmacyId || `PH-${fbUser.uid.slice(0, 6).toUpperCase()}`;
          const finalBranch = branch || "Main Dispensary";
          const finalLicense = license || "DL-Pending (Update in Profile)";

          // Use avatar preference if set (even if empty string for initials), else fall back to Google photo
          const finalAvatar =
            avatarPref !== undefined
              ? avatarPref
              : (fbUser.photoURL || "");

          const currentUser = {
            uid: fbUser.uid,
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split("@")[0].replace(/\./g, " ") || "Pharmacist",
            email: fbUser.email,
            role,
            pharmacy,
            license: finalLicense,
            pharmacyId: finalPharmacyId,
            branch: finalBranch,
            phone,
            upiId,
            photoURL: fbUser.photoURL || "",
            avatar: finalAvatar,
          };

          setUser(currentUser);
          localStorage.setItem("meditrack_user", JSON.stringify(currentUser));
          syncActiveDeviceSession(currentUser);
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
      syncActiveDeviceSession(result.user);
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
      syncActiveDeviceSession(result.user);
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
      if (updated?.uid) {
        setDoc(
          doc(db, "users", updated.uid),
          { ...updates, updatedAt: serverTimestamp() },
          { merge: true }
        ).catch((err) => console.debug("[AuthContext] user sync err:", err));
      }
      if (updates?.avatar !== undefined) {
        try {
          const avatarVal = updates.avatar || "";
          localStorage.setItem("meditrack_user_avatar_preference", avatarVal);
        } catch (_) {}
      }
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