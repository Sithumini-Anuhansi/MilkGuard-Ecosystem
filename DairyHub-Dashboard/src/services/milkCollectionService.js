import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import { getNextSequentialId } from "./counterService";

const collectionsRef = collection(db, "milkCollections");

/**
 * Format a milkCollections record's `collectedAt` Firestore Timestamp into a
 * plain YYYY-MM-DD string for display and grouping (history table, charts,
 * report exports).
 */
export const toDateString = (record) => {
  if (!record?.collectedAt) return "";
  const date = record.collectedAt.toDate ? record.collectedAt.toDate() : new Date(record.collectedAt);
  return date.toISOString().slice(0, 10);
};

/**
 * Save a finalized sensor reading into permanent history.
 * Called once per completed test (see useAutoLogCollection).
 */
export const addCollectionRecord = async (reading) => {
  const collectionId = await getNextSequentialId("milkCollections", "MC");

  const payload = {
    testId: reading.testId || null,
    collectionId,
    collectorId: reading.collectorId || null,
    collectorName: reading.collectorName || "Unknown",
    rfidUID: reading.rfidUID || null,
    quantity: Number(reading.quantity) || 0,
    pH: Number(reading.pH) || 0,
    gas: Number(reading.gas) || 0,
    temperature: Number(reading.temperature) || 0,
    status: reading.status || "Fresh",
    deviceId: reading.deviceId || "ESP32-001",
    collectedAt: Timestamp.now(),
  };

  if (reading.testId) {
    const docRef = doc(db, "milkCollections", reading.testId);
    await setDoc(docRef, payload);
    return docRef.id;
  }

  const docRef = await addDoc(collectionsRef, payload);
  return docRef.id;
};

/**
 * Returns true if a milkCollections doc with this testId already exists.
 * Uses testId as document ID when present (avoids composite query permission issues).
 */
export const getCollectionDocByTestId = async (testId) => {
  if (!testId) return null;

  const byIdRef = doc(db, "milkCollections", testId);
  const byIdSnap = await getDoc(byIdRef);
  if (byIdSnap.exists()) {
    return { id: byIdSnap.id, ...byIdSnap.data() };
  }

  const q = query(collectionsRef, where("testId", "==", testId), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
};

export const collectionExistsByTestId = async (testId) => {
  return !!(await getCollectionDocByTestId(testId));
};

/**
 * Save a reading only if testId has not been logged yet (idempotent).
 * Uses merge upsert so re-processing can fill in missing collector fields.
 */
export const addCollectionRecordIfNew = async (reading) => {
  if (!reading?.testId) {
    const id = await addCollectionRecord(reading);
    return { skipped: false, id, created: true };
  }

  const docRef = doc(db, "milkCollections", reading.testId);
  const existingSnap = await getDoc(docRef);

  if (existingSnap.exists()) {
    const existing = existingSnap.data();
    const needsCollectorFix =
      (!existing.collectorId && reading.collectorId) ||
      (existing.collectorName === "Unknown" && reading.collectorName);

    if (needsCollectorFix) {
      await setDoc(
        docRef,
        {
          collectorId: reading.collectorId || existing.collectorId || null,
          collectorName: reading.collectorName || existing.collectorName || "Unknown",
          rfidUID: reading.rfidUID || existing.rfidUID || null,
        },
        { merge: true }
      );
    }

    return { skipped: true, id: docRef.id, created: false };
  }

  const id = await addCollectionRecord(reading);
  return { skipped: false, id, created: true };
};

/**
 * Update quantity for a collection record (owner adds liters after device test).
 */
export const updateCollectionQuantity = async (docId, quantity) => {
  const collectionDoc = doc(db, "milkCollections", docId);
  await updateDoc(collectionDoc, { quantity: Number(quantity) || 0 });
};

const mapCollectionDocs = (snapshot) =>
  snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

/**
 * Live-subscribe to all collection records (owner dashboard / history).
 */
export const subscribeAllCollections = (callback, maxResults = 200) => {
  const q = query(
    collectionsRef,
    orderBy("collectedAt", "desc"),
    limit(maxResults)
  );

  return onSnapshot(
    q,
    (snapshot) => callback(mapCollectionDocs(snapshot)),
    (err) => console.error("Failed to subscribe milk collections:", err)
  );
};

/**
 * Live-subscribe to one collector's collection records.
 */
export const subscribeCollectionsByCollector = (
  collectorId,
  callback,
  maxResults = 100
) => {
  const q = query(
    collectionsRef,
    where("collectorId", "==", collectorId),
    orderBy("collectedAt", "desc"),
    limit(maxResults)
  );

  return onSnapshot(
    q,
    (snapshot) => callback(mapCollectionDocs(snapshot)),
    (err) => console.error("Failed to subscribe collector collections:", err)
  );
};

/**
 * Fetch all collection records, most recent first.
 */
export const getAllCollections = async (maxResults = 200) => {
  const q = query(
    collectionsRef,
    orderBy("collectedAt", "desc"),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);

  return mapCollectionDocs(snapshot);
};

/**
 * Fetch collection records for a single collector (used by the collector portal).
 */
export const getCollectionsByCollector = async (collectorId, maxResults = 100) => {
  const q = query(
    collectionsRef,
    where("collectorId", "==", collectorId),
    orderBy("collectedAt", "desc"),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);

  return mapCollectionDocs(snapshot);
};

/**
 * Fetch records between two JS Date objects (inclusive), used for reports & analytics.
 */
export const getCollectionsByDateRange = async (startDate, endDate) => {
  const q = query(
    collectionsRef,
    where("collectedAt", ">=", Timestamp.fromDate(startDate)),
    where("collectedAt", "<=", Timestamp.fromDate(endDate)),
    orderBy("collectedAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
};
