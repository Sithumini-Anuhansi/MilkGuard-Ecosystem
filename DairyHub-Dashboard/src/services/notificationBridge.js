import { addCollectionRecordIfNew } from "./milkCollectionService";
import {
  addNotification,
  notificationExistsForTest,
} from "./notificationService";
import { getCollectorByRFID, getCollectorByBusinessId } from "./collectorService";
import { getSettings } from "./settingsService";
import { pushAlert } from "../firebase/realtime";
import { sendWhatsAppMessage } from "./whatsappService";

function buildMilkTemplateParams(test) {
  return [
    test.collectorName || "Unknown",
    test.status || "Unknown",
    Number(test.pH).toFixed(2),
    String(Math.round(Number(test.gas))),
    test.testId || "",
  ];
}

function buildDeviceTemplateParams(deviceId, event, collectorName) {
  return [deviceId || "ESP32", event, collectorName || "N/A", "-", "DEVICE"];
}

const STATUS_TYPE_MAP = {
  Spoiled: "MILK_SPOILED",
  Warning: "MILK_WARNING",
  Fresh: "MILK_FRESH",
  Unknown: "MILK_UNKNOWN",
};

const PRIORITY_MAP = {
  Spoiled: "HIGH",
  Warning: "MEDIUM",
  Fresh: "LOW",
  Unknown: "MEDIUM",
};

function getMilkTitle(status) {
  if (status === "Spoiled") return "Milk Spoiled";
  if (status === "Warning") return "Milk Warning";
  if (status === "Unknown") return "Milk Status Unknown";
  return "Milk Test Complete";
}

export function buildMilkMessage(test) {
  const name = test.collectorName || "unknown collector";
  const status = (test.status || "Unknown").toUpperCase();
  const ph = Number(test.pH).toFixed(2);
  const gas = Math.round(Number(test.gas));

  if (test.status === "Fresh") {
    return (
      `MilkGuard: Milk collection from ${name} tested successfully. ` +
      `Status: ${status}. pH: ${ph}, Gas: ${gas}.`
    );
  }

  if (test.status === "Unknown") {
    return (
      `MilkGuard: Milk collection from ${name} completed. ` +
      `Status: UNKNOWN. pH: ${ph}, Gas: ${gas}. Review sensor readings.`
    );
  }

  return (
    `MilkGuard ALERT: Milk collection from ${name} requires attention. ` +
    `Status: ${status}. pH: ${ph}, Gas: ${gas}.`
  );
}

/** Collector in-app notification with full collection sensor details. */
export function buildCollectorCollectionMessage(test) {
  const status = test.status || "Unknown";
  const ph = Number(test.pH).toFixed(2);
  const gas = Math.round(Number(test.gas));
  const temp = Number(test.temperature).toFixed(1);
  const qty = Number(test.quantity) || 0;

  return (
    `Collection ${test.testId}: Status ${status}. ` +
    `pH ${ph}, Gas ${gas} ppm, Temp ${temp}°C.` +
    (qty > 0 ? ` Quantity ${qty} L.` : " Tap to add quantity.")
  );
}

/** Owner WhatsApp: Warning, Spoiled only. In-app: all milk tests + device. */
export function shouldWhatsAppOwner(status, settings, type = "MILK") {
  if (type === "DEVICE") return settings.notifyOwnerDevice !== false;
  if (status === "Warning") return settings.notifyOwnerWarning !== false;
  if (status === "Spoiled") return settings.notifyOwnerSpoiled !== false;
  return false;
}

/** Collector WhatsApp: Fresh, Warning, Spoiled, Unknown. */
export function shouldWhatsAppCollector(status, collector) {
  if (collector?.whatsappEnabled === false) return false;
  return (
    status === "Fresh" ||
    status === "Warning" ||
    status === "Spoiled" ||
    status === "Unknown"
  );
}

/**
 * Process a completed milk test — Firestore history + in-app notifications.
 * Collection and notifications are idempotent independently.
 */
export async function processMilkTestClient(test) {
  if (!test?.testId) return { ok: false, reason: "missing_test_id" };

  let collectionDocId = null;

  try {
    const collectionResult = await addCollectionRecordIfNew(test);
    collectionDocId = collectionResult.id || test.testId;
  } catch (err) {
    console.error("Failed to persist milk collection:", err);
    throw err;
  }

  const settings = await getSettings();
  const ownerMessage = buildMilkMessage(test);
  const collectorMessage = buildCollectorCollectionMessage(test);
  const type = STATUS_TYPE_MAP[test.status] || "MILK_UNKNOWN";
  const priority = PRIORITY_MAP[test.status] || "MEDIUM";
  const title = getMilkTitle(test.status);

  let ownerNotified = false;
  const ownerExists = await notificationExistsForTest(test.testId, "OWNER");
  if (!ownerExists) {
    let ownerWhatsappSent = false;
    try {
      if (shouldWhatsAppOwner(test.status, settings) && settings.ownerPhone) {
        ownerWhatsappSent = await sendWhatsAppMessage(
          settings.ownerPhone,
          ownerMessage,
          { templateParams: buildMilkTemplateParams(test) }
        );
      }

      await addNotification({
        title,
        message: ownerMessage,
        type,
        priority,
        testId: test.testId,
        collectionDocId,
        collectorId: test.collectorId || null,
        recipientType: "OWNER",
        recipientId: null,
        whatsappSent: ownerWhatsappSent,
      });
      ownerNotified = true;
    } catch (err) {
      console.error("Failed to create owner notification:", err);
    }
  } else {
    ownerNotified = true;
  }

  let collectorNotified = !test.collectorId;
  if (test.collectorId) {
    const collectorExists = await notificationExistsForTest(
      test.testId,
      "COLLECTOR",
      test.collectorId
    );

    if (!collectorExists) {
      const collector =
        (test.rfidUID ? await getCollectorByRFID(test.rfidUID) : null) ||
        (await getCollectorByBusinessId(test.collectorId));

      try {
        let collectorWhatsappSent = false;
        if (
          shouldWhatsAppCollector(test.status, collector) &&
          collector?.phone
        ) {
          collectorWhatsappSent = await sendWhatsAppMessage(
            collector.phone,
            buildMilkMessage(test),
            { templateParams: buildMilkTemplateParams(test) }
          );
        }

        await addNotification({
          title,
          message: collectorMessage,
          type,
          priority,
          testId: test.testId,
          collectionDocId,
          collectorId: test.collectorId,
          recipientType: "COLLECTOR",
          recipientId: test.collectorId,
          whatsappSent: collectorWhatsappSent,
        });
        collectorNotified = true;
      } catch (err) {
        console.error("Failed to create collector notification:", err);
      }
    } else {
      collectorNotified = true;
    }
  }

  if (test.status === "Spoiled" || test.status === "Warning") {
    await pushAlert({
      title: test.status === "Spoiled" ? "Spoiled Milk" : "Milk Warning",
      message: ownerMessage,
      severity: test.status === "Spoiled" ? "HIGH" : "MEDIUM",
    });
  }

  const ok = Boolean(collectionDocId) && ownerNotified;
  return {
    ok,
    collectionDocId,
    ownerNotified,
    collectorNotified,
    collectorId: test.collectorId || null,
  };
}

/**
 * Device offline — owner WhatsApp only (no in-app notification; see Device Status card).
 */
export async function processDeviceOfflineClient(deviceStatus, currentCollector) {
  const settings = await getSettings();
  const deviceId = deviceStatus?.deviceId || "ESP32";

  const collectorName = currentCollector?.name || null;
  const collectorLabel = collectorName ? ` (last used by ${collectorName})` : "";
  const message = `Device ${deviceId} went offline${collectorLabel}`;

  if (shouldWhatsAppOwner(null, settings, "DEVICE") && settings.ownerPhone) {
    await sendWhatsAppMessage(settings.ownerPhone, message, {
      templateParams: buildDeviceTemplateParams(deviceId, "Offline", collectorName),
    });
  }

  return true;
}

/**
 * Device back online — no notification (Device Status card shows online state).
 */
export async function processDeviceOnlineClient() {
  return true;
}
