import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

const notificationsRef = collection(db, "notifications");

function notificationDocId(testId, recipientType, recipientId = null) {
  if (!testId) return null;
  if (recipientType === "COLLECTOR" && recipientId) {
    return `${testId}_${recipientId}`;
  }
  if (recipientType === "OWNER") {
    return `${testId}_OWNER`;
  }
  return null;
}

const sortByCreatedDesc = (items) =>
  [...items].sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() ?? 0;
    const bMs = b.createdAt?.toMillis?.() ?? 0;
    return bMs - aMs;
  });

/**
 * Create a new notification.
 * type: "MILK_SPOILED" | "MILK_WARNING" | "MILK_FRESH" | "DEVICE" | "INFO"
 * recipientType: "OWNER" | "COLLECTOR"
 */
export const addNotification = async ({
  title,
  message,
  type = "INFO",
  priority = "MEDIUM",
  testId = null,
  collectionDocId = null,
  collectorId = null,
  recipientType = "OWNER",
  recipientId = null,
  whatsappSent = false,
}) => {
  const payload = {
    title,
    message,
    type,
    priority,
    testId,
    collectionDocId,
    collectorId,
    recipientType,
    recipientId,
    whatsappSent,
    read: false,
    createdAt: Timestamp.now(),
  };

  const stableId = notificationDocId(testId, recipientType, recipientId);
  if (stableId) {
    const docRef = doc(db, "notifications", stableId);
    await setDoc(docRef, payload, { merge: true });
    return docRef.id;
  }

  const docRef = await addDoc(notificationsRef, payload);
  return docRef.id;
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (notificationId) => {
  const notifDoc = doc(db, "notifications", notificationId);
  await updateDoc(notifDoc, { read: true });
};

/** Mark multiple notifications as read (e.g. when the user opens the page). */
export const markNotificationsAsRead = async (notificationIds = []) => {
  const uniqueIds = [...new Set(notificationIds.filter(Boolean))];
  await Promise.all(uniqueIds.map((id) => markAsRead(id)));
};

/** Returns true if a notification already exists for this test + recipient. */
export const notificationExistsForTest = async (
  testId,
  recipientType,
  recipientId = null
) => {
  if (!testId) return false;

  const stableId = notificationDocId(testId, recipientType, recipientId);
  if (stableId) {
    try {
      const snap = await getDoc(doc(db, "notifications", stableId));
      return snap.exists();
    } catch (err) {
      console.warn(`Notification existence check failed for ${stableId}:`, err);
      return false;
    }
  }

  let q;

  if (recipientType === "COLLECTOR" && recipientId) {
    q = query(
      notificationsRef,
      where("testId", "==", testId),
      where("recipientType", "==", "COLLECTOR"),
      where("recipientId", "==", recipientId),
      limit(1)
    );
  } else {
    q = query(
      notificationsRef,
      where("testId", "==", testId),
      where("recipientType", "==", "OWNER"),
      limit(1)
    );
  }

  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

/**
 * Live-subscribe to notifications, optionally filtered by role.
 * Sorts client-side to avoid composite-index build delays on first deploy.
 */
export const subscribeNotifications = (
  callback,
  { role = "OWNER", collectorId = null, maxResults = 50 } = {}
) => {
  const fetchLimit = Math.max(maxResults * 4, 100);
  let q;

  if (role === "COLLECTOR" && collectorId) {
    q = query(
      notificationsRef,
      where("recipientType", "==", "COLLECTOR"),
      where("recipientId", "==", collectorId),
      limit(fetchLimit)
    );
  } else if (role === "OWNER") {
    q = query(
      notificationsRef,
      where("recipientType", "==", "OWNER"),
      limit(fetchLimit)
    );
  } else {
    q = query(notificationsRef, limit(fetchLimit));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = sortByCreatedDesc(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      ).slice(0, maxResults);

      callback(notifications);
    },
    (err) => {
      console.error("Failed to subscribe notifications:", err);
      callback([]);
    }
  );
};
