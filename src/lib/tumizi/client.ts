import { randomUUID } from 'crypto';

interface TumiziRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  correlationId?: string;
}

interface TumiziApiErrorShape {
  code?: string;
  message?: string;
  errors?: unknown;
}

export class TumiziApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'TumiziApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface TumiziMerchantPayload {
  merchant_external_id: string;
  merchant: {
    name: string;
    email?: string;
    phone?: string;
    country?: string;
    domain?: string;
    description?: string;
    status?: string;
  };
  owner?: {
    name?: string;
    email?: string;
  };
  wallet?: {
    name?: string;
    account_number?: string;
    currency?: string;
  };
  webhooks?: Array<{
    name: string;
    callback_url: string;
    events: string[];
  }>;
}

export interface TumiziCreateCustomerPaymentPayload {
  merchant_external_id: string;
  external_reference: string;
  account_reference: string;
  phone_number: string;
  amount: number;
  description?: string;
  currency?: string;
  narration?: string;
  payer?: {
    name: string;
    email?: string;
    phone_number: string;
  };
}

export interface TumiziCreateWithdrawalPayload {
  merchant_external_id: string;
  external_reference: string;
  phone_number: string;
  amount: number;
  currency?: string;
  narration?: string;
}

function getTumiziBaseUrl(): string {
  return (process.env.TUMIZI_BASE_URL || '').trim().replace(/\/$/, '');
}

function getTumiziApiKey(): string {
  return (process.env.TUMIZI_PARTNER_API_KEY || '').trim();
}

async function tumiziRequest<T>(path: string, options: TumiziRequestOptions = {}): Promise<T> {
  const baseUrl = getTumiziBaseUrl();
  const apiKey = getTumiziApiKey();

  if (!baseUrl) {
    throw new Error('TUMIZI_BASE_URL is not configured');
  }

  if (!apiKey) {
    throw new Error('TUMIZI_PARTNER_API_KEY is not configured');
  }

  const url = `${baseUrl}${path}`;
  const method = options.method || 'GET';
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-Correlation-Id': options.correlationId || `storeflow-${randomUUID()}`,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const text = await response.text();
  const parsed = text ? safeParseJson(text) : undefined;

  if (!response.ok) {
    const errorPayload = (parsed ?? {}) as TumiziApiErrorShape;
    throw new TumiziApiError(
      errorPayload.message || `Tumizi request failed with status ${response.status}`,
      response.status,
      errorPayload.code,
      errorPayload.errors ?? parsed,
    );
  }

  return (parsed ?? {}) as T;
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export const tumiziClient = {
  createMerchant(payload: TumiziMerchantPayload) {
    return tumiziRequest<Record<string, unknown>>('/api/partner/v1/merchants', {
      method: 'POST',
      body: payload,
    });
  },
  getMerchantWallet(merchantExternalId: string) {
    return tumiziRequest<Record<string, unknown>>(
      `/api/partner/v1/merchants/${encodeURIComponent(merchantExternalId)}/wallet`,
    );
  },
  createCustomerPayment(payload: TumiziCreateCustomerPaymentPayload) {
    return tumiziRequest<Record<string, unknown>>('/api/partner/v1/customer-payments', {
      method: 'POST',
      body: payload,
    });
  },
  createWithdrawal(payload: TumiziCreateWithdrawalPayload) {
    return tumiziRequest<Record<string, unknown>>('/api/partner/v1/withdrawals', {
      method: 'POST',
      body: payload,
    });
  },
};
