import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBdoB8q-MIGaP0m-Wf3rdLN0-htcsHjY2A",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "meditrackos.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "meditrackos",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "meditrackos.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "410999146455",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:410999146455:web:8bfdb70e1c1f3079232d92",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-YN22GG7340",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const db = getFirestore(app);

export default app;
