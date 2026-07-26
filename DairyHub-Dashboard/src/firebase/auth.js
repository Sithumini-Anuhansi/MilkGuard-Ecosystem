import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth, getSecondaryAuth } from "./firebaseConfig";

// Login
export const loginUser = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

// Logout
export const logoutUser = async () => {
  await signOut(auth);
};

/**
 * Creates a Firebase Auth account for a new collector using the secondary
 * app instance, so the owner's own session in `auth` is never touched.
 * Returns the new account's uid — use it as the document id for both
 * users/{uid} and collectors/{uid}.
 */
export const createCollectorAccount = async (email, password) => {
  const secondaryAuth = getSecondaryAuth();

  const result = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = result.user.uid;

  // Sign the secondary app's session back out — we only needed it to mint the account.
  await signOut(secondaryAuth);

  return uid;
};
