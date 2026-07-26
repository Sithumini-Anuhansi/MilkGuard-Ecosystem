import { useEffect, useState } from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";

import { subscribeAlerts } from "../../firebase/realtime";

const SEVERITY_STYLES = {
  HIGH: "bg-red-100 text-red-700 border-red-300",
  MEDIUM: "bg-orange-100 text-orange-700 border-orange-300",
  LOW: "bg-gray-100 text-gray-700 border-gray-300",
};

// Shows the ESP32's most recent instant alert (liveData/alerts) at the top of
// the dashboard. This is separate from the persisted `notifications` Firestore
// collection — it's just for an immediate on-screen flash.
export default function LiveAlertBanner() {
  const [alert, setAlert] = useState(null);
  const [dismissedAt, setDismissedAt] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeAlerts(setAlert);
    return () => unsubscribe();
  }, []);

  if (!alert || dismissedAt === alert.timestamp) return null;

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
        SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.LOW
      }`}
    >
      <div className="flex items-center gap-3">
        <FiAlertTriangle size={20} />
        <div>
          <p className="font-semibold">{alert.title}</p>
          <p className="text-sm">{alert.message}</p>
        </div>
      </div>

      <button onClick={() => setDismissedAt(alert.timestamp)} className="opacity-70 hover:opacity-100">
        <FiX size={18} />
      </button>
    </div>
  );
}
