/**
 * Normalize an RFID UID to colon-separated uppercase hex: "77:A8:B1:05"
 * Accepts raw hex ("77A8B105"), partial colons, or already-normalized input.
 */
export const normalizeRfidUID = (raw) => {
  if (!raw) return "";

  const hex = raw.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (!hex) return "";

  const pairs = hex.match(/.{1,2}/g) || [];
  return pairs.join(":");
};

/** Validate normalized UID format (4-byte UID = 4 pairs). */
export const isValidRfidUID = (uid) => /^([0-9A-F]{2}:){3}[0-9A-F]{2}$/.test(uid);
