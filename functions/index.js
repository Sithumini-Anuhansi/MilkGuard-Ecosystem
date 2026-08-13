const admin = require("firebase-admin");
const { onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const { sendWhatsApp } = require("./src/sendWhatsApp");
const {
  processMilkTest,
  getSettings,
  getCollectorByBusinessId,
  createNotification,
  shouldWhatsAppOwner,
} = require("./src/onMilkTest");

if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL: "https://milkguard-system-default-rtdb.asia-southeast1.firebasedatabase.app",
  });
}

const db = admin.firestore();

function getRtdb() {
  return admin.database();
}

setGlobalOptions({ region: "asia-southeast1" });

const ONLINE_THRESHOLD_SEC = 40;

exports.onMilkTestCreated = onValueWritten(
  { ref: "milkTests/{testId}", instance: "milkguard-system-default-rtdb" },
  async (event) => {
    const test = event.data.after.val();
    if (!test) return;

    try {
      await processMilkTest(test);
    } catch (err) {
      console.error("Failed to process milk test:", err);
      throw err;
    }
  }
);

exports.checkDeviceOffline = onSchedule("every 2 minutes", async () => {
  const snap = await getRtdb().ref("liveData/deviceStatus").once("value");
  const status = snap.val();

  if (!status?.lastSeen) return;

  let lastSeenMs = status.lastSeen;
  if (lastSeenMs < 1e12) {
    lastSeenMs = lastSeenMs * 1000;
  }

  const ageSec = (Date.now() - lastSeenMs) / 1000;

  if (ageSec <= ONLINE_THRESHOLD_SEC) {
    await getRtdb().ref("liveData/deviceOfflineAlertSent").remove();
    return;
  }

  const flagSnap = await getRtdb().ref("liveData/deviceOfflineAlertSent").once("value");
  const lastAlert = flagSnap.val() || 0;
  if (Date.now() - lastAlert < 60 * 60 * 1000) return;

  const collectorSnap = await getRtdb().ref("liveData/currentCollector").once("value");
  const currentCollector = collectorSnap.val();

  const settings = await getSettings();
  const deviceId = status.deviceId || "ESP32";
  const collectorId = currentCollector?.collectorId || null;
  const collectorName = currentCollector?.name || null;
  const collectorLabel = collectorName ? ` (last used by ${collectorName})` : "";
  const message = `Device ${deviceId} went offline${collectorLabel}`;

  await getRtdb().ref("liveData/deviceOfflineAlertSent").set(Date.now());

  let ownerWhatsappSent = false;
  if (shouldWhatsAppOwner(null, settings, "DEVICE") && settings.ownerPhone) {
    ownerWhatsappSent = await sendWhatsApp(settings.ownerPhone, message);
  }

  await createNotification({
    title: "Device Offline",
    message,
    type: "DEVICE",
    priority: "HIGH",
    testId: null,
    collectorId,
    recipientType: "OWNER",
    recipientId: null,
    whatsappSent: ownerWhatsappSent,
  });

  if (collectorId) {
    const collector = await getCollectorByBusinessId(collectorId);
    let collectorWhatsappSent = false;

    if (
      collector?.notifyOnDeviceOffline !== false &&
      collector?.whatsappEnabled !== false &&
      collector?.phone
    ) {
      collectorWhatsappSent = await sendWhatsApp(collector.phone, message);
    }

    await createNotification({
      title: "Device Offline",
      message,
      type: "DEVICE",
      priority: "HIGH",
      testId: null,
      collectorId,
      recipientType: "COLLECTOR",
      recipientId: collectorId,
      whatsappSent: collectorWhatsappSent,
    });
  }

  await getRtdb().ref("liveData/alerts").push({
    title: "Device Offline",
    message,
    severity: "HIGH",
    timestamp: Date.now(),
  });

  console.log("Device offline alert created");
});
