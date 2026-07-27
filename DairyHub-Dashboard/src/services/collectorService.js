import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import { createCollectorAccount } from "../firebase/auth";
import { getNextSequentialId } from "./counterService";

const collectorsRef = collection(db, "collectors");

/**
 * Fetch all collectors, newest first.
 */
export const getCollectors = async () => {
  const q = query(collectorsRef, orderBy("joinedDate", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
};

/**
 * Add a new collector. This provisions a real login for them:
 *   1. Create a Firebase Auth account (via the secondary app, so the owner's
 *      own session isn't disturbed) — its uid becomes the document id for
 *      both users/{uid} and collectors/{uid}.
 *   2. Generate a friendly business id ("COL001", ...) stored as the
 *      `collectorId` field — this is what milkCollections/RFID lookups
 *      reference, kept separate from the Firestore document id.
 *   3. Write both the users/{uid} and collectors/{uid} documents.
 */
export const addCollector = async ({
  name,
  nic,
  phone,
  email,
  password,
  address,
  village,
  rfidUID,
  vehicleNumber,
}) => {
  const uid = await createCollectorAccount(email, password);
  const collectorId = await getNextSequentialId("collectors", "COL");
  const now = Timestamp.now();

  await setDoc(doc(db, "users", uid), {
    name,
    email,
    phone: phone || "",
    role: "COLLECTOR",
    status: "ACTIVE",
    createdAt: now,
    profileImage: "",
    uid,
  });

  await setDoc(doc(db, "collectors", uid), {
    collectorId,
    name,
    nic: nic || "",
    phone: phone || "",
    email,
    address: address || "",
    village: village || "",
    rfidUID,
    vehicleNumber: vehicleNumber || "",
    status: "ACTIVE",
    joinedDate: now,
    uid,
  });

  return uid;
};

/**
 * Update an existing collector. `uid` is the collectors/{uid} document id.
 * Name/phone/email/status are mirrored onto users/{uid} too, since both
 * documents carry copies of those fields.
 */
export const updateCollector = async (uid, updates) => {
  await updateDoc(doc(db, "collectors", uid), updates);

  const mirrored = {};
  if (updates.name !== undefined) mirrored.name = updates.name;
  if (updates.phone !== undefined) mirrored.phone = updates.phone;
  if (updates.email !== undefined) mirrored.email = updates.email;
  if (updates.status !== undefined) mirrored.status = updates.status;

  if (Object.keys(mirrored).length > 0) {
    await updateDoc(doc(db, "users", uid), mirrored);
  }
};

/**
 * Delete a collector's Firestore records. Note: this does not delete their
 * Firebase Auth account (the client SDK can't delete arbitrary accounts) —
 * remove that separately from the Firebase Console if needed, or deactivate
 * via `updateCollector(uid, { status: "INACTIVE" })` instead of deleting.
 */
export const deleteCollector = async (uid) => {
  await deleteDoc(doc(db, "collectors", uid));
  await deleteDoc(doc(db, "users", uid));
};

/**
 * Fetch a single collector by their document id, which is the linked user's
 * Firebase Auth uid. Used by the collector's own Profile/Dashboard/History
 * pages, and by the owner's edit form.
 */
export const getCollectorById = async (uid) => {
  const snapshot = await getDoc(doc(db, "collectors", uid));

  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() };
};

/**
 * Look up a collector by their RFID UID (used when logging a new reading).
 */
export const getCollectorByRFID = async (rfidUID) => {
  const q = query(collectorsRef, where("rfidUID", "==", rfidUID));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
};
