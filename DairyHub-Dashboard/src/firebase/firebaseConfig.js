import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBncEI1ToSsh8_ER2D-GC7Fiard_mE7vBw",
  authDomain: "milkguard-system.firebaseapp.com",
  databaseURL: "https://milkguard-system-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "milkguard-system",
  storageBucket: "milkguard-system.firebasestorage.app",
  messagingSenderId: "222501550015",
  appId: "1:222501550015:web:21a292cf2b19d6a60ad30a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Authentication
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);

// Realtime Database
export const realtimeDB = getDatabase(app);

/**
 * A second, isolated Firebase App instance pointed at the same project.
 *
 * Why: Firebase Auth's client SDK automatically signs in as whichever user
 * you just created with createUserWithEmailAndPassword. Without this, an
 * owner adding a new collector from Collectors.jsx would immediately get
 * signed out of their own session and signed in as the collector they just
 * created. Using a separate app instance for that one operation keeps the
 * owner's session untouched.
 */
export const getSecondaryAuth = () => {
  const secondaryApp = getApps().some((a) => a.name === "Secondary")
    ? getApp("Secondary")
    : initializeApp(firebaseConfig, "Secondary");

  return getAuth(secondaryApp);
};

export default app;
