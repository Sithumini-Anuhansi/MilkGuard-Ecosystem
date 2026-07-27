import { useEffect, useRef, useState } from "react";
import { subscribeDeviceStatus } from "../firebase/realtime";

// If the ESP32 hasn't written a heartbeat in this long, treat it as offline.
// Firmware heartbeats every 15s, so 40s tolerates one missed beat + network jitter.
const ONLINE_THRESHOLD_MS = 40000;
const POLL_INTERVAL_MS = 5000;

/**
 * Derives online/offline from how recently the ESP32 wrote `liveData/deviceStatus`.
 * There's no explicit online flag in the database — a device that crashes or loses
 * power can't write "online:false" on its way out, so recency is the only signal
 * that's actually reliable.
 */
export default function useDeviceStatus() {
  const [data, setData] = useState(null);
  const [lastSeen, setLastSeen] = useState(null);
  const [online, setOnline] = useState(false);
  const lastSeenRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeDeviceStatus((incoming) => {
      const seen = incoming?.lastSeen ?? null;
      lastSeenRef.current = seen;
      setData(incoming);
      setLastSeen(seen);
      setOnline(seen ? Date.now() - seen < ONLINE_THRESHOLD_MS : false);
    });

    const interval = setInterval(() => {
      const seen = lastSeenRef.current;
      setOnline(seen ? Date.now() - seen < ONLINE_THRESHOLD_MS : false);
    }, POLL_INTERVAL_MS);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { online, lastSeen, data };
}
