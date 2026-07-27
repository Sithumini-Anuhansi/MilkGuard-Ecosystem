import { ref, onValue, off, set } from "firebase/database";
import { realtimeDB } from "./firebaseConfig";

// Logs a clear, path-specific message instead of letting a denied/failed
// subscription fail silently — this is what would have surfaced the
// `roles/{uid}` RTDB rules setup step immediately instead of just showing
// no data with no explanation.
const onError = (path) => (error) => {
  console.error(`Realtime DB read failed at "${path}":`, error.code || error.message || error);
};

/**
 * Listen for the current live milk test coming from the ESP32.
 */
export const subscribeCurrentTest = (callback) => {
  const path = "liveData/currentTest";
  const currentTestRef = ref(realtimeDB, path);

  onValue(
    currentTestRef,
    (snapshot) => callback(snapshot.exists() ? snapshot.val() : null),
    onError(path)
  );

  return () => off(currentTestRef);
};

/**
 * Listen for the collector currently being processed (RFID scanned, sensors
 * still running) — lets the dashboard show "Processing John Silva..." before
 * the full test result lands in currentTest.
 */
export const subscribeCurrentCollector = (callback) => {
  const path = "liveData/currentCollector";
  const currentCollectorRef = ref(realtimeDB, path);

  onValue(
    currentCollectorRef,
    (snapshot) => callback(snapshot.exists() ? snapshot.val() : null),
    onError(path)
  );

  return () => off(currentCollectorRef);
};

/**
 * Listen for the simple, human-readable status summary (status + message).
 */
export const subscribeLatestStatus = (callback) => {
  const path = "liveData/latestStatus";
  const latestStatusRef = ref(realtimeDB, path);

  onValue(
    latestStatusRef,
    (snapshot) => callback(snapshot.exists() ? snapshot.val() : null),
    onError(path)
  );

  return () => off(latestStatusRef);
};

/**
 * Listen for the ESP32's online/offline heartbeat and health status.
 */
export const subscribeDeviceStatus = (callback) => {
  const path = "liveData/deviceStatus";
  const deviceRef = ref(realtimeDB, path);

  onValue(
    deviceRef,
    (snapshot) => callback(snapshot.exists() ? snapshot.val() : null),
    onError(path)
  );

  return () => off(deviceRef);
};

/**
 * Listen for the most recent instant alert (separate from the permanent
 * Firestore notifications log — this is for immediate on-screen banners).
 */
export const subscribeAlerts = (callback) => {
  const path = "liveData/alerts";
  const alertsRef = ref(realtimeDB, path);

  onValue(
    alertsRef,
    (snapshot) => callback(snapshot.exists() ? snapshot.val() : null),
    onError(path)
  );

  return () => off(alertsRef);
};

/**
 * Push an instant alert banner. Overwrites the previous one, mirroring the
 * single-object shape of liveData/alerts in the schema.
 */
export const pushAlert = async ({ title, message, severity = "HIGH" }) => {
  await set(ref(realtimeDB, "liveData/alerts"), {
    title,
    message,
    severity,
    timestamp: Date.now(),
  });
};
