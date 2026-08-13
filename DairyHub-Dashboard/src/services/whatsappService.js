import { normalizePhone } from "../utils/phoneUtils";

const PROXY_URL = (import.meta.env.VITE_WHATSAPP_PROXY_URL || "").trim();
const PROXY_SECRET = (import.meta.env.VITE_WHATSAPP_PROXY_SECRET || "").trim();

export const isWhatsAppConfigured = () => Boolean(PROXY_URL && PROXY_SECRET);

/**
 * Send WhatsApp via the Vercel proxy (Meta or Twilio credentials live server-side).
 * Returns true only when the provider accepts the message.
 */
export async function sendWhatsAppMessage(to, message, { templateParams } = {}) {
  const phone = normalizePhone(to);
  if (!phone || !message?.trim()) return false;

  if (!isWhatsAppConfigured()) {
    console.warn(
      "WhatsApp proxy not configured. Set VITE_WHATSAPP_PROXY_URL and VITE_WHATSAPP_PROXY_SECRET in .env.local"
    );
    return false;
  }

  try {
    const body = {
      to: phone.replace(/\D/g, ""),
      message: message.trim(),
    };

    if (templateParams?.length) {
      body.templateParams = templateParams;
    }

    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PROXY_SECRET}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("WhatsApp proxy error:", err);
      return false;
    }

    const data = await response.json();
    return data.sent === true;
  } catch (err) {
    console.error("WhatsApp send failed:", err);
    return false;
  }
}
