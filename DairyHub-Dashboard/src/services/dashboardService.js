import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

const collectionsRef = collection(db, "milkCollections");

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
