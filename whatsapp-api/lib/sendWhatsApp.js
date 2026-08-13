function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits || null;
}

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";

/** Known MilkGuard templates and how many {{n}} body variables each expects. */
const TEMPLATE_CATALOG = {
  hello_world: { language: "en_US", bodyParams: 0 },
  milkguard_milk_alert: { language: "en", bodyParams: 5 },
};

function getTemplateConfig(templateName) {
  if (TEMPLATE_CATALOG[templateName]) {
    return TEMPLATE_CATALOG[templateName];
  }

  const bodyParams = Number(process.env.WHATSAPP_TEMPLATE_BODY_PARAMS);
  return {
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US",
    bodyParams: Number.isFinite(bodyParams) ? bodyParams : 0,
  };
}

function normalizeTemplateParams(templateName, incoming = []) {
  const { bodyParams } = getTemplateConfig(templateName);

  if (bodyParams <= 0) {
    return [];
  }

  const params = incoming.slice(0, bodyParams).map((text) => String(text).slice(0, 1024));
  while (params.length < bodyParams) {
    params.push("-");
  }

  return params;
}

async function sendViaMeta(to, message, options = {}) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn("Meta WhatsApp credentials not configured");
    return { ok: false, metaError: "WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing on Vercel" };
  }

  const templateName =
    options.templateName || process.env.WHATSAPP_TEMPLATE_NAME || "";
  const { language } = getTemplateConfig(templateName);
  const params = normalizeTemplateParams(templateName, options.templateParams || []);

  const payload = {
    messaging_product: "whatsapp",
    to: normalizePhone(to),
  };

  if (templateName) {
    payload.type = "template";
    payload.template = {
      name: templateName,
      language: { code: language },
    };

    if (params.length > 0) {
      payload.template.components = [
        {
          type: "body",
          parameters: params.map((text) => ({
            type: "text",
            text,
          })),
        },
      ];
    }
  } else {
    payload.type = "text";
    payload.text = { body: message };
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
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
    const errorText = await response.text();
    console.error("Meta WhatsApp send failed:", errorText);
    let metaError = errorText;
    try {
      const parsed = JSON.parse(errorText);
      metaError = parsed?.error?.message || errorText;
    } catch {
      // keep raw text
    }
    return { ok: false, metaError };
  }

  return { ok: true };
}

async function sendViaTwilio(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    console.warn("Twilio credentials not configured");
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
    console.error("Twilio WhatsApp send failed:", await response.text());
    return false;
  }

  return true;
}

async function sendWhatsApp(to, message, options = {}) {
  if (!to) return { ok: false, metaError: "Missing recipient phone" };

  const provider = (process.env.WHATSAPP_PROVIDER || "meta").toLowerCase();
  if (provider === "twilio") {
    if (!message) return { ok: false, metaError: "Missing message" };
    const ok = await sendViaTwilio(to, message);
    return ok ? { ok: true } : { ok: false, metaError: "Twilio send failed" };
  }

  if (!message && !(options.templateName || process.env.WHATSAPP_TEMPLATE_NAME)) {
    return { ok: false, metaError: "No message and WHATSAPP_TEMPLATE_NAME not set" };
  }

  return sendViaMeta(to, message, options);
}

module.exports = { sendWhatsApp, normalizePhone, normalizeTemplateParams, getTemplateConfig };
