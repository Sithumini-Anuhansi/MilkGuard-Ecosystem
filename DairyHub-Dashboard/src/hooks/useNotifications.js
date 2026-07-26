import { useEffect, useState } from "react";
import { subscribeNotifications } from "../services/notificationService";

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeNotifications(setNotifications);
    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount };
}
