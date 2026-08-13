const admin = require("firebase-admin");
const { persistCollection } = require("./persistCollection");
const { sendWhatsApp, buildMilkMessage } = require("./sendWhatsApp");

const db = admin.firestore();

function getRtdb() {
  return admin.database();
}

const STATUS_TYPE_MAP = {
  Spoiled: "MILK_SPOILED",
  Warning: "MILK_WARNING",
  Fresh: "MILK_FRESH",
};

const PRIORITY_MAP = {
  Spoiled: "HIGH",
  Warning: "MEDIUM",
  Fresh: "LOW",
};

async function getSettings() {
  const snap = await db.collection("settings").doc("system").get();
  const defaults = {
    ownerPhone: "",
    notifyOwnerWarning: true,
    notifyOwnerSpoiled: true,
    notifyOwnerDevice: true,
  };
  return snap.exists ? { ...defaults, ...snap.data() } : defaults;
}

async function getCollectorByBusinessId(collectorId) {
  if (!collectorId) return null;

  const snap = await db
    .collection("collectors")
    .where("collectorId", "==", collectorId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].data();
}

async function createNotification(payload) {
  await db.collection("notifications").add({
    ...payload,
    whatsappSent: !!payload.whatsappSent,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function pushLiveAlert(test, message) {
  const severity =
    test.status === "Spoiled" ? "HIGH" : test.status === "Warning" ? "MEDIUM" : "LOW";

  await getRtdb().ref("liveData/alerts").push({
    title: `Milk ${test.status}`,
    message,
    severity,
    testId: test.testId,
    collectorId: test.collectorId,
    timestamp: Date.now(),
  });
}

/** Owner WhatsApp: Warning, Spoiled, Device only. */
function shouldWhatsAppOwner(status, settings, type = "MILK") {
  if (type === "DEVICE") return settings.notifyOwnerDevice !== false;
  if (status === "Warning") return settings.notifyOwnerWarning !== false;
  if (status === "Spoiled") return settings.notifyOwnerSpoiled !== false;
  return false;
}

/** Collector WhatsApp: all milk tests when enabled on profile. */
function shouldWhatsAppCollector(status, collector) {
  if (collector?.whatsappEnabled === false) return false;
  return status === "Fresh" || status === "Warning" || status === "Spoiled";
}

async function processMilkTest(test) {
  if (!test || !test.testId) {
    console.warn("Ignoring empty or invalid milk test payload");
    return;
  }

  const settings = await getSettings();
  const message = buildMilkMessage(test);
  const type = STATUS_TYPE_MAP[test.status] || "INFO";
  const priority = PRIORITY_MAP[test.status] || "MEDIUM";

  const { skipped } = await persistCollection(test);
  if (skipped) {
    console.log(`Test ${test.testId} already persisted — skipping notifications`);
    return;
  }

  if (test.status === "Spoiled" || test.status === "Warning") {
    await pushLiveAlert(test, message);
  }

  const title =
    test.status === "Spoiled"
      ? "Milk Spoiled"
      : test.status === "Warning"
      ? "Milk Warning"
      : "Milk Test Complete";

  let ownerWhatsappSent = false;
  if (shouldWhatsAppOwner(test.status, settings) && settings.ownerPhone) {
    ownerWhatsappSent = await sendWhatsApp(settings.ownerPhone, message);
  }

  await createNotification({
    title,
    message,
    type,
    priority,
    testId: test.testId,
    collectorId: test.collectorId,
    recipientType: "OWNER",
    recipientId: null,
    whatsappSent: ownerWhatsappSent,
  });

  const collector = test.collectorId
    ? await getCollectorByBusinessId(test.collectorId)
    : null;

  let collectorWhatsappSent = false;
  if (
    test.collectorId &&
    shouldWhatsAppCollector(test.status, collector) &&
    collector?.phone
  ) {
    collectorWhatsappSent = await sendWhatsApp(collector.phone, message);
  }

  if (test.collectorId) {
    await createNotification({
      title,
      message,
      type,
      priority,
      testId: test.testId,
      collectorId: test.collectorId,
      recipientType: "COLLECTOR",
      recipientId: test.collectorId,
      whatsappSent: collectorWhatsappSent,
    });
  }

  console.log(`Processed milk test ${test.testId} (${test.status})`);
}

module.exports = { processMilkTest, getSettings, getCollectorByBusinessId, createNotification, shouldWhatsAppOwner, shouldWhatsAppCollector };
