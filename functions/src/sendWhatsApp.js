/**
 * Send WhatsApp messages via Meta Cloud API or Twilio Sandbox.
 * Credentials are read from Firebase environment config / Secret Manager at deploy time.
 */

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/\D/g, "");
}

async function sendViaMeta(to, message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn("Meta WhatsApp credentials not configured — skipping send");
    return false;
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(to),
        type: "text",
        text: { body: message },
      }),
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

async function sendWhatsApp(to, message) {
  if (!to) return false;

  const provider = (process.env.WHATSAPP_PROVIDER || "meta").toLowerCase();

  if (provider === "twilio") {
    return sendViaTwilio(to, message);
  }

  return sendViaMeta(to, message);
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

module.exports = { sendWhatsApp, buildMilkMessage };
