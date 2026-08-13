const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Generate next sequential ID like MC001 using a Firestore transaction.
 */
async function getNextSequentialId(counterName, prefix, padLength = 3) {
  const counterRef = db.collection("counters").doc(counterName);

  const nextCount = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const current = snapshot.exists ? snapshot.data().count || 0 : 0;
    const next = current + 1;
    transaction.set(counterRef, { count: next }, { merge: true });
    return next;
  });

  return `${prefix}${String(nextCount).padStart(padLength, "0")}`;
}

/**
 * Persist a milk test to Firestore milkCollections (idempotent by testId).
 */
async function persistCollection(test) {
  if (!test?.testId) {
    throw new Error("Missing testId on milk test payload");
  }

  const existing = await db
    .collection("milkCollections")
    .where("testId", "==", test.testId)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { skipped: true, docId: existing.docs[0].id };
  }

  const collectionId = await getNextSequentialId("milkCollections", "MC");

  const docRef = await db.collection("milkCollections").add({
    testId: test.testId,
    collectionId,
    collectorId: test.collectorId || null,
    collectorName: test.collectorName || "Unknown",
    rfidUID: test.rfidUID || null,
    quantity: Number(test.quantity) || 0,
    pH: Number(test.pH) || 0,
    gas: Number(test.gas) || 0,
    temperature: Number(test.temperature) || 0,
    status: test.status || "Fresh",
    deviceId: test.deviceId || "ESP32-001",
    collectedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { skipped: false, docId: docRef.id, collectionId };
}

module.exports = { persistCollection, getNextSequentialId };
