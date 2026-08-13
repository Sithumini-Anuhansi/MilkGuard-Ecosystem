/**
 * Normalize phone to E.164-ish format for WhatsApp (+94...).
 */
export const normalizePhone = (raw) => {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("94")) return `+${digits}`;
  if (digits.startsWith("0")) return `+94${digits.slice(1)}`;
  return `+${digits}`;
};

export const isValidPhone = (phone) => /^\+94[0-9]{9}$/.test(normalizePhone(phone));
