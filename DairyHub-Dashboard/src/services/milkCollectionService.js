import {
  collection,
  getDocs,
  addDoc,
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

  const docRef = await addDoc(collectionsRef, {
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
  });

  return docRef.id;
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

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
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

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
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
