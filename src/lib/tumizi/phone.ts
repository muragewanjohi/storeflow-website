/**
 * Normalize customer phone numbers for Tumizi M-Pesa customer payments (Kenya MSISDN).
 */
export function normalizeKenyaMsisdnForTumizi(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length >= 12) {
    return digits.slice(0, 12);
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }
  if (digits.length === 9 && digits.startsWith('7')) {
    return `254${digits}`;
  }
  return null;
}
