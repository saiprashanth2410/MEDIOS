import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "../config/firebase";
import api from "./api";

function formatAuthError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before completing.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Google Sign-in in Firebase Console.";
    default:
      return err.message || "Authentication failed. Please try again.";
  }
}

export const authService = {
  /* =====================================================
     LOGIN WITH EMAIL / PASSWORD
  ===================================================== */
  async login({ email, password, remember }) {
    if (!email || !password) {
      return { ok: false, message: "Email and password required" };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCredential.user;

      let role = "Chief Pharmacist";
      try {
        const userDocSnap = await getDoc(doc(db, "users", fbUser.uid));
        if (userDocSnap.exists()) {
          role = userDocSnap.data().role || role;
        } else {
          // create default user profile in Firestore
          await setDoc(
            doc(db, "users", fbUser.uid),
            {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email.split("@")[0],
              role,
            },
            { merge: true }
          );
        }
      } catch (docErr) {
        console.warn("[authService] Firestore user profile sync warning:", docErr.message);
      }

      const userData = {
        uid: fbUser.uid,
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email.split("@")[0].replace(/\./g, " "),
        email: fbUser.email,
        role,
        photoURL: fbUser.photoURL || "",
      };

      // Optional sync with backend logger if running
      try {
        await api.post("/auth/login", { email, password });
      } catch {
        // Backend logging is optional
      }

      return {
        ok: true,
        user: userData,
        token: await fbUser.getIdToken(),
      };
    } catch (err) {
      console.error("[authService] Firebase Email Login Error:", err);
      return {
        ok: false,
        message: formatAuthError(err),
      };
    }
  },

  /* =====================================================
     SIGN IN WITH GOOGLE (POPUP)
  ===================================================== */
  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      let role = "Chief Pharmacist";
      try {
        const userDocRef = doc(db, "users", fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          role = userDocSnap.data().role || role;
        } else {
          await setDoc(
            userDocRef,
            {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email.split("@")[0],
              role,
              photoURL: fbUser.photoURL || "",
            },
            { merge: true }
          );
        }
      } catch (docErr) {
        console.warn("[authService] Firestore Google User profile sync warning:", docErr.message);
      }

      const userData = {
        uid: fbUser.uid,
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email.split("@")[0].replace(/\./g, " "),
        email: fbUser.email,
        avatar: fbUser.photoURL || "",
        photoURL: fbUser.photoURL || "",
        role,
        provider: "google",
      };

      // Optional sync with backend logger
      try {
        await api.post("/auth/oauth", {
          provider: "google",
          email: fbUser.email,
          name: fbUser.displayName,
          avatar: fbUser.photoURL,
        });
      } catch {
        // Backend logging optional
      }

      return {
        ok: true,
        user: userData,
        token: await fbUser.getIdToken(),
      };
    } catch (err) {
      console.error("[authService] Firebase Google Sign-In Error:", err);
      return {
        ok: false,
        message: formatAuthError(err),
      };
    }
  },

  /* =====================================================
     LEGACY OAUTH FALLBACK WRAPPER
  ===================================================== */
  async oauthLogin({ provider = "google", email, name, avatar }) {
    if (provider === "google") {
      return this.loginWithGoogle();
    }
    return { ok: false, message: `Provider ${provider} is not supported.` };
  },

  /* =====================================================
     REGISTER WITH EMAIL / PASSWORD
  ===================================================== */
  async register({ name, email, password, role = "Chief Pharmacist", pharmacy = "MediTrack Central" }) {
    if (!email || !password) {
      return { ok: false, message: "Email and password required" };
    }
    if (password.length < 6) {
      return { ok: false, message: "Password must be at least 6 characters" };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCredential.user;

      if (name) {
        await updateProfile(fbUser, { displayName: name.trim() });
      }

      // Create user record in Firestore
      try {
        await setDoc(
          doc(db, "users", fbUser.uid),
          {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: name || fbUser.email.split("@")[0],
            role,
            pharmacy: pharmacy.trim(),
          },
          { merge: true }
        );
      } catch (docErr) {
        console.warn("[authService] Firestore User create warning:", docErr.message);
      }

      const userData = {
        uid: fbUser.uid,
        id: fbUser.uid,
        name: name || fbUser.email.split("@")[0],
        email: fbUser.email,
        role,
        pharmacy: pharmacy.trim(),
      };

      return {
        ok: true,
        user: userData,
        token: await fbUser.getIdToken(),
      };
    } catch (err) {
      console.error("[authService] Firebase Register Error:", err);
      return {
        ok: false,
        message: formatAuthError(err),
      };
    }
  },

  /* =====================================================
     LOGOUT
  ===================================================== */
  async logout(email, logId) {
    try {
      await signOut(auth);
      // Optional backend logout notification
      try {
        if (email || logId) {
          await api.post("/auth/logout", { email, logId });
        }
      } catch {
        // Backend optional
      }
      return { ok: true };
    } catch (err) {
      console.warn("[authService] Firebase SignOut Error:", err);
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