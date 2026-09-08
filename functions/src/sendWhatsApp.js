/**
 * Send WhatsApp messages via Meta Cloud API or Twilio Sandbox.
 * Credentials are read from Firebase environment config / Secret Manager at deploy time.
 *
 * NOTE: this is currently a dormant fallback path — the active sender is the
 * client-side bridge (DairyHub-Dashboard/src/services/notificationBridge.js
 * + whatsapp-api/). Kept in sync with the same template/param order so this
 * doesn't silently break if Cloud Functions become the production path later.
 */

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/\D/g, "");
}

// Same catalog as whatsapp-api/lib/sendWhatsApp.js — keep both in sync.
const TEMPLATE_CATALOG = {
  hello_world: { language: "en_US", bodyParams: 0 },
  milkguard_milk_alert: { language: "en", bodyParams: 5 },
  milkguard_alerts: { language: "en", bodyParams: 5 },
};

function getTemplateConfig(templateName) {
  if (TEMPLATE_CATALOG[templateName]) return TEMPLATE_CATALOG[templateName];

  const bodyParams = Number(process.env.WHATSAPP_TEMPLATE_BODY_PARAMS);
  return {
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US",
    bodyParams: Number.isFinite(bodyParams) ? bodyParams : 0,
  };
}

async function sendViaMeta(to, message, templateParams = []) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn("Meta WhatsApp credentials not configured — skipping send");
    return false;
  }

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "";
  const { language, bodyParams } = getTemplateConfig(templateName);

  const payload = {
    messaging_product: "whatsapp",
    to: normalizePhone(to),
  };

  if (templateName) {
    payload.type = "template";
    payload.template = { name: templateName, language: { code: language } };

    if (bodyParams > 0) {
      const params = templateParams.slice(0, bodyParams).map((v) => String(v));
      while (params.length < bodyParams) params.push("-");

      payload.template.components = [
        {
          type: "body",
          parameters: params.map((text) => ({ type: "text", text })),
        },
      ];
    }
  } else {
    // Only works inside a 24h customer-initiated window — no template configured.
    payload.type = "text";
    payload.text = { body: message };
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Meta WhatsApp send failed:", err);
    return false;
  }

  return true;
}

async function sendViaTwilio(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    console.warn("Twilio credentials not configured — skipping send");
    return false;
  }

  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:+${normalizePhone(to)}`,
    Body: message,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Twilio WhatsApp send failed:", err);
    return false;
  }

  return true;
}

async function sendWhatsApp(to, message, templateParams = []) {
  if (!to) return false;

  const provider = (process.env.WHATSAPP_PROVIDER || "meta").toLowerCase();

  if (provider === "twilio") {
    return sendViaTwilio(to, message);
  }

  return sendViaMeta(to, message, templateParams);
}

// Must match the actual approved template body exactly:
//   "Your MilkGuard alert for Ref: {{5}} has been triggered:
//    {{1}}
//    Status: {{2}}
//    {{3}}
//    {{4}}
//    Visit the website for more details."
// Only {{2}} (Status:) and {{5}} (Ref:) have a literal label in the template
// itself — {{1}}, {{3}}, {{4}} are bare lines, so the label has to be baked
// into the value sent from here.
function buildMilkTemplateParams(test) {
  const name = test.collectorName || "Unknown";
  const status = test.status || "Unknown";
  const ph = Number(test.pH).toFixed(2);
  const gas = Math.round(Number(test.gas));
  const testId = test.testId || "";

  return [
    `Collector ${name}`, // {{1}}
    status,              // {{2}} — "Status: {{2}}"
    `pH ${ph}`,          // {{3}}
    `Gas ${gas} ppm`,    // {{4}}
    testId,              // {{5}} — "Ref: {{5}}"
  ];
}

function buildMilkMessage(test) {
  const name = test.collectorName || "unknown collector";
  const status = (test.status || "Unknown").toUpperCase();
  const ph = Number(test.pH).toFixed(2);
  const gas = Math.round(Number(test.gas));

  if (test.status === "Fresh") {
    return (
      `MilkGuard: Milk collection from ${name} has been tested successfully. ` +
      `Status: ${status}. pH: ${ph}, Gas: ${gas}.`
    );
  }

  return (
    `MilkGuard ALERT: Milk collection from ${name} requires attention. ` +
    `Status: ${status}. pH: ${ph}, Gas: ${gas}.`
  );
}

module.exports = { sendWhatsApp, buildMilkMessage, buildMilkTemplateParams };
