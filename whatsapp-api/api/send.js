const { sendWhatsApp } = require("../lib/sendWhatsApp");

function setCors(req, res) {
  const configured = (process.env.ALLOWED_ORIGIN || "*").split(",").map((v) => v.trim());
  const origin = req.headers.origin;

  if (configured.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  } else if (origin && configured.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (configured[0]) {
    res.setHeader("Access-Control-Allow-Origin", configured[0]);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.WHATSAPP_PROXY_SECRET;
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!secret || token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { to, message, templateParams } = req.body || {};

  if (!to || (!message && !process.env.WHATSAPP_TEMPLATE_NAME)) {
    return res.status(400).json({ error: "Missing to or message/template config" });
  }

  try {
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "";
    const { normalizeTemplateParams } = require("../lib/sendWhatsApp");
    const safeParams = normalizeTemplateParams(templateName, templateParams);

    const result = await sendWhatsApp(to, message || "", {
      templateParams: safeParams,
      templateName,
    });
    if (!result.ok) {
      return res.status(502).json({
        sent: false,
        error: "WhatsApp provider rejected the message",
        metaError: result.metaError || "Unknown Meta error",
      });
    }
    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error("WhatsApp proxy error:", err);
    return res.status(500).json({ sent: false, error: err.message });
  }
};
