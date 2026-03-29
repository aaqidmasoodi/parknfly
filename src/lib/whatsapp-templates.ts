/**
 * WhatsApp URL utilities.
 * Template rendering has moved to message-store.tsx.
 * This file retains phone normalisation and wa.me URL building.
 */

/**
 * Build a wa.me click-to-chat URL from a phone number and pre-filled text.
 * Phone numbers are normalised to international format (assuming Irish +353 if no prefix).
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  // Strip non-digits
  let digits = phone.replace(/\D/g, "");

  // Irish numbers starting with 08x → +3538x
  if (digits.startsWith("08") || digits.startsWith("07")) {
    digits = "353" + digits.slice(1);
  } else if (digits.startsWith("0")) {
    digits = "353" + digits.slice(1);
  }

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}

export function normalisePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("08") || digits.startsWith("07")) {
    digits = "353" + digits.slice(1);
  } else if (digits.startsWith("0")) {
    digits = "353" + digits.slice(1);
  }
  return digits;
}
