import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

const notificationsRef = collection(db, "notifications");

/**
 * Create a new notification (spoiled milk alert, device offline alert, etc.)
 * type: "SPOILED" | "WARNING" | "DEVICE" | "INFO"
 * priority: "HIGH" | "MEDIUM" | "LOW"
 */
export const addNotification = async ({
  title,
  message,
  type = "INFO",
  priority = "MEDIUM",
}) => {
  const docRef = await addDoc(notificationsRef, {
    title,
    message,
    type,
    priority,
    read: false,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (notificationId) => {
  const notifDoc = doc(db, "notifications", notificationId);
  await updateDoc(notifDoc, { read: true });
};

/**
 * Live-subscribe to the most recent notifications.
 * Returns an unsubscribe function.
 */
export const subscribeNotifications = (callback, maxResults = 50) => {
  const q = query(
    notificationsRef,
    orderBy("createdAt", "desc"),
    limit(maxResults)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    callback(notifications);
  });
};
