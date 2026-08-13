import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import { toDateString } from "./milkCollectionService";

const collectionsRef = collection(db, "milkCollections");

/** Derive today's stat cards from live collection records (local timezone). */
export const computeTodaySummary = (records = []) => {
  const today = new Date().toISOString().slice(0, 10);
  const summary = { totalLiters: 0, fresh: 0, warning: 0, spoiled: 0 };

  records.forEach((record) => {
    if (toDateString(record) !== today) return;

    summary.totalLiters += Number(record.quantity) || 0;
    if (record.status === "Fresh") summary.fresh += 1;
    else if (record.status === "Warning") summary.warning += 1;
    else if (record.status === "Spoiled") summary.spoiled += 1;
  });

  return summary;
};

/**
 * Summary card totals for "today" — total liters and a count per quality status.
 */
export const getTodaySummary = async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const q = query(collectionsRef, where("collectedAt", ">=", Timestamp.fromDate(startOfDay)));
  const snapshot = await getDocs(q);

  const summary = {
    totalLiters: 0,
    fresh: 0,
    warning: 0,
    spoiled: 0,
  };

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    summary.totalLiters += Number(data.quantity) || 0;

    if (data.status === "Fresh") summary.fresh += 1;
    else if (data.status === "Warning") summary.warning += 1;
    else if (data.status === "Spoiled") summary.spoiled += 1;
  });

  return summary;
};
