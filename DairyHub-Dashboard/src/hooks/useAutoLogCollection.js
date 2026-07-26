import { useEffect, useRef } from "react";

import { subscribeCurrentTest, pushAlert } from "../firebase/realtime";
import { addCollectionRecord } from "../services/milkCollectionService";
import { addNotification } from "../services/notificationService";
import useDeviceStatus from "./useDeviceStatus";

/**
 * Bridges the ESP32's live Realtime Database reading into permanent Firestore
 * history, and raises alerts for spoiled milk / device offline events —
 * both as a permanent Firestore notification and an instant liveData/alerts
 * banner.
 *
 * Mount this once near the top of the owner app (e.g. in the owner Dashboard)
 * so every new sensor reading gets logged exactly once.
 */
export default function useAutoLogCollection() {
  const lastLoggedKey = useRef(null);
  const wasOnline = useRef(true);

  // Recency-derived, not the raw `online` flag — a device that crashes can't
  // write "online:false" on its way out, so a missed heartbeat is what we trust.
  const { online, data: deviceStatus } = useDeviceStatus();

  useEffect(() => {
    const unsubscribeTest = subscribeCurrentTest(async (reading) => {
      if (!reading) return;

      // Dedup: only log a reading once per unique rfid + quantity + reading combo.
      const key = `${reading.rfidUID}-${reading.quantity}-${reading.pH}-${reading.gas}-${reading.temperature}`;
      if (key === lastLoggedKey.current) return;
      lastLoggedKey.current = key;

      try {
        await addCollectionRecord(reading);

        if (reading.status === "Spoiled") {
          const message = `Milk spoiled from ${reading.collectorName || "unknown collector"}`;

          await addNotification({
            title: "Milk Spoiled",
            message,
            type: "SPOILED",
            priority: "HIGH",
          });

          await pushAlert({ title: "Spoiled Milk", message, severity: "HIGH" });
        } else if (reading.status === "Warning") {
          const message = `Milk quality warning from ${reading.collectorName || "unknown collector"}`;

          await addNotification({
            title: "Milk Warning",
            message,
            type: "WARNING",
            priority: "MEDIUM",
          });

          await pushAlert({ title: "Milk Warning", message, severity: "MEDIUM" });
        }
      } catch (err) {
        console.error("Failed to log collection:", err);
      }
    });

    return () => unsubscribeTest();
  }, []);

  useEffect(() => {
    if (wasOnline.current && online === false) {
      const message = `Device ${deviceStatus?.deviceId || ""} went offline`.trim();

      addNotification({
        title: "Device Offline",
        message,
        type: "DEVICE",
        priority: "HIGH",
      }).catch((err) => console.error("Failed to log device notification:", err));

      pushAlert({ title: "Device Offline", message, severity: "HIGH" }).catch((err) =>
        console.error("Failed to push device alert:", err)
      );
    }

    wasOnline.current = online;
  }, [online, deviceStatus]);
}
