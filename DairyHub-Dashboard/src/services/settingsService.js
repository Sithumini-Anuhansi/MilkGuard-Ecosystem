import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

const SETTINGS_DOC = doc(db, "settings", "system");

// Fallback values if the settings/system document hasn't been created yet.
export const DEFAULT_THRESHOLDS = {
  freshPHMin: 6.6,
  freshPHMax: 6.9,
  warningGas: 500,
  spoiledGas: 800,
  warningTemp: 30,
  spoiledTemp: 35,
};

/**
 * Fetch the quality-classification thresholds. Creates the document with
 * defaults on first read if it doesn't exist yet, so the rest of the app
 * (gauges, dashboard, ESP32 sync) always has something to work with.
 */
export const getSettings = async () => {
  const snapshot = await getDoc(SETTINGS_DOC);

  if (snapshot.exists()) {
    return { ...DEFAULT_THRESHOLDS, ...snapshot.data() };
  }

  await setDoc(SETTINGS_DOC, DEFAULT_THRESHOLDS);
  return DEFAULT_THRESHOLDS;
};

/**
 * Update one or more threshold values.
 */
export const updateSettings = async (updates) => {
  await setDoc(SETTINGS_DOC, updates, { merge: true });
};
