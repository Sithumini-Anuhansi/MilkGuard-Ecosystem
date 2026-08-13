import { useEffect, useState } from "react";
import { subscribeNotifications } from "../services/notificationService";

export default function useNotifications({ role = "OWNER", collectorId = null } = {}) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeNotifications(
      (items) => {
        const filtered =
          role === "OWNER"
            ? items.filter((n) => n.type !== "DEVICE")
            : items;
        setNotifications(filtered);
      },
      { role, collectorId }
    );
    return () => unsubscribe();
  }, [role, collectorId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount };
}
