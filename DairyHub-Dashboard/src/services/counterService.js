import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

/**
 * Generates friendly sequential IDs like "COL001" / "MC001" using an atomic
 * Firestore transaction, so two owners adding a collector at the same moment
 * never collide. Backed by a small `counters/{name}` document holding `count`.
 */
export const getNextSequentialId = async (counterName, prefix, padLength = 3) => {
  const counterRef = doc(db, "counters", counterName);

  const nextCount = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const current = snapshot.exists() ? snapshot.data().count || 0 : 0;
    const next = current + 1;

    transaction.set(counterRef, { count: next }, { merge: true });

    return next;
  });

  return `${prefix}${String(nextCount).padStart(padLength, "0")}`;
};
