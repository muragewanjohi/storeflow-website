export interface TumiziNormalizedWebhookPayload {
  event?: string;
  merchantExternalId?: string;
  externalReference?: string;
  status?: string;
  transactionReference?: string;
  amount?: number;
  currency?: string;
  raw: unknown;
}

const SUPPORTED_EVENTS = new Set([
  'partner.customer_payment.updated',
  'partner.withdrawal.updated',
  'partner.refund.updated',
]);

export function shouldProcessTumiziWebhookEvent(event?: string): boolean {
  if (!event) {
    return false;
  }
  return SUPPORTED_EVENTS.has(event);
}

export function mapTumiziStatusToOrderPaymentStatus(status?: string): 'paid' | 'pending' | 'failed' {
  const normalized = status?.toLowerCase();
  if (!normalized) {
    return 'pending';
  }

  if (['successful', 'success', 'completed', 'paid'].includes(normalized)) {
    return 'paid';
  }

  if (['failed', 'cancelled', 'reversed', 'declined', 'expired'].includes(normalized)) {
    return 'failed';
  }

  return 'pending';
}

export function mapTumiziEventToOrderPaymentStatus(
  event: string | undefined,
  status: string | undefined,
): 'paid' | 'pending' | 'failed' | 'refunded' {
  const normalizedEvent = event?.toLowerCase();
  if (normalizedEvent === 'partner.refund.updated') {
    const normalizedStatus = status?.toLowerCase();
    if (['successful', 'success', 'completed', 'paid', 'refunded'].includes(normalizedStatus || '')) {
      return 'refunded';
    }
    if (['failed', 'cancelled', 'reversed', 'declined', 'expired'].includes(normalizedStatus || '')) {
      return 'failed';
    }
    return 'pending';
  }

  return mapTumiziStatusToOrderPaymentStatus(status);
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readString(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function readNumber(data: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

export function normalizeTumiziEventPayload(payload: unknown): TumiziNormalizedWebhookPayload {
  const root = toObject(payload);
  const nested = toObject(root.data ?? root.payload ?? root.result);
  const source = Object.keys(nested).length > 0 ? nested : root;

  return {
    event: readString(root, 'event', 'type', 'name'),
    merchantExternalId: readString(
      source,
      'merchant_external_id',
      'merchantExternalId',
      'merchant_id',
      'merchantId',
    ),
    externalReference: readString(source, 'external_reference', 'externalReference', 'reference'),
    status: readString(source, 'status'),
    transactionReference: readString(
      source,
      'transaction_reference',
      'transactionReference',
      'payment_reference',
      'paymentReference',
    ),
    amount: readNumber(source, 'amount'),
    currency: readString(source, 'currency'),
    raw: payload,
  };
}
