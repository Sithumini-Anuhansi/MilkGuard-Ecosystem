import { useCallback, useEffect, useRef } from "react";
import { onValue, ref } from "firebase/database";

import { realtimeDB } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { subscribeCurrentCollector, subscribeCurrentTest } from "../firebase/realtime";
import {
  clearDeviceOfflineAlertSent,
  getDeviceOfflineAlertSent,
  setDeviceOfflineAlertSent,
} from "../firebase/realtime";
import {
  processMilkTestClient,
  processDeviceOfflineClient,
  processDeviceOnlineClient,
} from "../services/notificationBridge";
import useDeviceStatus from "./useDeviceStatus";

const OFFLINE_ALERT_COOLDOWN_MS = 60 * 60 * 1000;

function isCompleteMilkTest(test) {
  return Boolean(
    test?.testId &&
      test?.status &&
      Number.isFinite(Number(test.pH)) &&
      Number.isFinite(Number(test.gas))
  );
}

function mergeLiveTestData(rawTest, key, liveTest, liveCollector) {
  const testId = rawTest?.testId || key;
  const merged = { ...rawTest, testId };

  if (liveTest?.testId === testId) {
    if (!merged.collectorId && liveTest.collectorId) merged.collectorId = liveTest.collectorId;
    if (!merged.collectorName && liveTest.collectorName) merged.collectorName = liveTest.collectorName;
    if (!merged.rfidUID && liveTest.rfidUID) merged.rfidUID = liveTest.rfidUID;
    if (!merged.status && liveTest.status) merged.status = liveTest.status;
    if (merged.pH === undefined && liveTest.pH !== undefined) merged.pH = liveTest.pH;
    if (merged.gas === undefined && liveTest.gas !== undefined) merged.gas = liveTest.gas;
    if (merged.temperature === undefined && liveTest.temperature !== undefined) {
      merged.temperature = liveTest.temperature;
    }
  }

  if (liveCollector?.collectorId && !merged.collectorId) {
    merged.collectorId = liveCollector.collectorId;
  }
  if (liveCollector?.name && !merged.collectorName) {
    merged.collectorName = liveCollector.name;
  }
  if (liveCollector?.rfidUID && !merged.rfidUID) {
    merged.rfidUID = liveCollector.rfidUID;
  }

  return merged;
}

/**
 * Client-side bridge when Cloud Functions are not deployed.
 * Mount once for the owner session — persists tests, creates in-app
 * notifications, and sends device online/offline alerts on real transitions only.
 */
export default function useNotificationBridge() {
  const { user, role, loading } = useAuth();
  const inFlightTests = useRef(new Set());
  const completedTests = useRef(new Set());
  const deviceReady = useRef(false);
  const wasOnline = useRef(null);
  const currentCollectorRef = useRef(null);
  const currentTestRef = useRef(null);
  const { online, data: deviceStatus, lastSeen } = useDeviceStatus();

  const processTest = useCallback(async (rawTest, key = "") => {
    const test = mergeLiveTestData(
      rawTest,
      key,
      currentTestRef.current,
      currentCollectorRef.current
    );
    const testId = test.testId;

    if (
      !testId ||
      !rawTest ||
      !isCompleteMilkTest(test) ||
      completedTests.current.has(testId) ||
      inFlightTests.current.has(testId)
    ) {
      return;
    }

    inFlightTests.current.add(testId);

    try {
      const result = await processMilkTestClient(test);

      if (result.ok) {
        completedTests.current.add(testId);
        console.info(
          `MilkGuard: processed test ${testId}` +
            (result.collectorId ? ` (${result.collectorId})` : "")
        );
      } else {
        console.warn(`MilkGuard: incomplete processing for ${testId}`, result);
      }
    } catch (err) {
      console.error(`Failed to process milk test ${testId}:`, err);
    } finally {
      inFlightTests.current.delete(testId);
    }
  }, []);

  useEffect(() => {
    const unsubCollector = subscribeCurrentCollector((collector) => {
      currentCollectorRef.current = collector;
    });
    const unsubTest = subscribeCurrentTest((test) => {
      currentTestRef.current = test;
    });

    return () => {
      unsubCollector();
      unsubTest();
    };
  }, []);

  useEffect(() => {
    if (loading || !user || role !== "OWNER") return;

    const milkTestsRef = ref(realtimeDB, "milkTests");
    const unsubAll = onValue(milkTestsRef, (snapshot) => {
      if (!snapshot.exists()) return;

      Object.entries(snapshot.val()).forEach(([key, test]) => {
        processTest(test, key);
      });
    });

    const unsubCurrent = subscribeCurrentTest((test) => {
      if (test?.testId) processTest(test);
    });

    return () => {
      unsubCurrent();
      unsubAll();
    };
  }, [processTest, loading, user, role]);

  useEffect(() => {
    if (loading || !user || role !== "OWNER") return;
    if (lastSeen === null && !deviceStatus) return;

    if (!deviceReady.current) {
      deviceReady.current = true;
      wasOnline.current = online;
      return;
    }

    if (wasOnline.current === online) return;

    const previouslyOnline = wasOnline.current;
    wasOnline.current = online;

    if (previouslyOnline === true && online === false) {
      (async () => {
        try {
          const lastAlert = await getDeviceOfflineAlertSent();
          if (lastAlert && Date.now() - lastAlert < OFFLINE_ALERT_COOLDOWN_MS) return;

          await setDeviceOfflineAlertSent(Date.now());
          await processDeviceOfflineClient(deviceStatus, currentCollectorRef.current);
        } catch (err) {
          console.error("Failed to process device offline:", err);
        }
      })();
      return;
    }

    if (previouslyOnline === false && online === true) {
      clearDeviceOfflineAlertSent().catch((err) =>
        console.error("Failed to clear offline alert flag:", err)
      );

      processDeviceOnlineClient().catch((err) =>
        console.error("Failed to process device online:", err)
      );
    }
  }, [online, deviceStatus, lastSeen, loading, user, role]);
}
