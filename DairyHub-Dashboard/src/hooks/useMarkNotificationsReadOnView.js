import { useEffect, useRef } from "react";
import { markNotificationsAsRead } from "../services/notificationService";

/** Marks unread notifications as read when the user opens the notifications page. */
export default function useMarkNotificationsReadOnView(notifications) {
  const markedIds = useRef(new Set());

  useEffect(() => {
    const unreadIds = notifications
      .filter((n) => !n.read && !markedIds.current.has(n.id))
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    unreadIds.forEach((id) => markedIds.current.add(id));

    markNotificationsAsRead(unreadIds).catch((err) =>
      console.error("Failed to mark notifications as read:", err)
    );
  }, [notifications]);
}
