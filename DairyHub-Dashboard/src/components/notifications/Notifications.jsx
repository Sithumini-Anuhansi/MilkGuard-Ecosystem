import { FiAlertTriangle, FiWifiOff, FiInfo, FiCheck } from "react-icons/fi";

import { markAsRead } from "../../services/notificationService";

const ICONS = {
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

// Shared notification list, used by the owner Notifications page (and can be
// dropped into a Navbar dropdown later since it only needs the `notifications` array).
export default function Notifications({ notifications = [] }) {
  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  if (notifications.length === 0) {
    return <p className="text-gray-500 text-center py-10">No notifications available.</p>;
  }

  return (
    <ul className="divide-y">
      {notifications.map((n) => (
        <li key={n.id} className="flex items-start gap-4 py-4">
          <div className="text-xl mt-0.5">{ICONS[n.type] || ICONS.INFO}</div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
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
            </div>

            {n.title && <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>}

            <p className="text-xs text-gray-400 mt-1">
              {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : "Just now"}
            </p>
          </div>

          {!n.read && (
            <button
              onClick={() => handleMarkRead(n.id)}
              title="Mark as read"
              className="text-gray-400 hover:text-green-600"
            >
              <FiCheck size={18} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
