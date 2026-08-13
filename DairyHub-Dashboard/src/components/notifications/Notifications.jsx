import { useNavigate } from "react-router";
import { FiAlertTriangle, FiWifiOff, FiInfo, FiCheck, FiDroplet, FiMessageCircle } from "react-icons/fi";

import { markAsRead } from "../../services/notificationService";

const ICONS = {
  MILK_SPOILED: <FiAlertTriangle className="text-red-600" />,
  MILK_WARNING: <FiAlertTriangle className="text-orange-500" />,
  MILK_FRESH: <FiDroplet className="text-green-600" />,
  MILK_UNKNOWN: <FiInfo className="text-amber-500" />,
  SPOILED: <FiAlertTriangle className="text-red-600" />,
  WARNING: <FiAlertTriangle className="text-orange-500" />,
  DEVICE: <FiWifiOff className="text-gray-500" />,
  INFO: <FiInfo className="text-blue-500" />,
};

const PRIORITY_STYLES = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-orange-100 text-orange-700",
  LOW: "bg-gray-100 text-gray-600",
};

const MILK_NOTIFICATION_TYPES = new Set([
  "MILK_SPOILED",
  "MILK_WARNING",
  "MILK_FRESH",
  "MILK_UNKNOWN",
  "INFO",
]);

function isCollectionNotification(notification) {
  return (
    MILK_NOTIFICATION_TYPES.has(notification.type) &&
    (notification.collectionDocId || notification.testId)
  );
}

export default function Notifications({ notifications = [], role = "OWNER" }) {
  const navigate = useNavigate();

  const handleMarkRead = async (event, id) => {
    event.stopPropagation();
    try {
      await markAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleOpenCollection = async (notification) => {
    if (!isCollectionNotification(notification)) return;

    if (!notification.read) {
      try {
        await markAsRead(notification.id);
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }

    const params = new URLSearchParams();
    if (notification.collectionDocId) {
      params.set("highlight", notification.collectionDocId);
    } else if (notification.testId) {
      params.set("testId", notification.testId);
    }

    const query = params.toString();
    const path =
      role === "OWNER"
        ? `/owner/milk-collections${query ? `?${query}` : ""}`
        : `/collector/history${query ? `?${query}` : ""}`;

    navigate(path);
  };

  if (notifications.length === 0) {
    return <p className="text-gray-500 text-center py-10">No notifications available.</p>;
  }

  return (
    <ul className="divide-y">
      {notifications.map((n) => {
        const clickable = isCollectionNotification(n);

        return (
          <li
            key={n.id}
            onClick={() => clickable && handleOpenCollection(n)}
            className={`flex items-start gap-4 py-4 ${
              clickable ? "cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2" : ""
            }`}
          >
            <div className="text-xl mt-0.5">{ICONS[n.type] || ICONS.INFO}</div>

            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={!n.read ? "font-semibold text-gray-800" : "text-gray-500"}>
                  {n.title || n.message}
                </p>

                {n.priority && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.LOW
                    }`}
                  >
                    {n.priority}
                  </span>
                )}

                {n.whatsappSent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold flex items-center gap-1">
                    <FiMessageCircle size={12} /> WhatsApp
                  </span>
                )}

                {clickable && (
                  <span className="text-xs text-blue-600">View collection</span>
                )}
              </div>

              {n.title && <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>}

              {n.testId && (
                <p className="text-xs font-mono text-gray-400 mt-1">{n.testId}</p>
              )}

              <p className="text-xs text-gray-400 mt-1">
                {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : "Just now"}
              </p>
            </div>

            {!n.read && (
              <button
                onClick={(event) => handleMarkRead(event, n.id)}
                title="Mark as read"
                className="text-gray-400 hover:text-green-600"
              >
                <FiCheck size={18} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
