function sanitizeReferencePart(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Wallet account number Tumizi assigns when provisioning from merchant_external_id. */
export function deriveWalletAccountNumberFromMerchantExternalId(merchantExternalId: string): string {
  return sanitizeReferencePart(merchantExternalId).slice(0, 16);
}

/**
 * Build a payment-safe account reference for Tumizi/STK prompts.
 * Format intent: STORE + INVOICE/ORDER (max 12 chars, no spaces).
 */
export function buildTumiziAccountReference(storeName: string, invoiceOrOrder: string): string {
  const store = sanitizeReferencePart(storeName);
  const doc = sanitizeReferencePart(invoiceOrOrder);

  const baseStore = store || 'STORE';
  const baseDoc = doc || Date.now().toString().slice(-2);

  const fullCandidate = `${baseStore}${baseDoc}`;
  if (fullCandidate.length <= 12) {
    return fullCandidate;
  }

  // Tumizi account_reference currently validates at max 12 chars.
  // Keep store identity first, then append as much invoice/order suffix as possible.
  const docTail = baseDoc.slice(-2);
  const storeBudget = Math.max(1, 12 - docTail.length);
  return `${baseStore.slice(0, storeBudget)}${docTail}`.slice(0, 12);
}
