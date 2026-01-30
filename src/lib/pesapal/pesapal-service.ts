/**
 * PesaPal API 3.0 (JSON) service for subscription payments
 * Handles auth, SubmitOrderRequest, GetTransactionStatus, RegisterIPN
 */

import { pesapalConfig, getPesapalIpnUrl } from './config';

let cachedToken: string | null = null;
let tokenExpiry = 0;
const TOKEN_TTL_MS = 4 * 60 * 1000; // 4 minutes (token valid ~5 min)

export interface BillingAddress {
  email_address: string;
  phone_number?: string;
  country_code?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  line_1?: string;
  line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  zip_code?: string;
}

export interface SubscriptionDetails {
  start_date: string; // dd-MM-yyyy
  end_date: string;   // dd-MM-yyyy
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
}

export interface SubmitOrderParams {
  id: string; // unique merchant reference (alphanumeric, dash, underscore, dot, colon; max 50)
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  notification_id: string;
  billing_address: BillingAddress;
  cancellation_url?: string;
  account_number?: string; // for recurring (e.g. tenant id)
  subscription_details?: SubscriptionDetails;
}

export interface SubmitOrderResult {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
  error?: unknown;
  status?: string;
  message?: string;
}

export interface TransactionStatusResult {
  payment_method?: string;
  amount?: number;
  created_date?: string;
  confirmation_code?: string;
  payment_status_description?: string; // INVALID | FAILED | COMPLETED | REVERSED
  description?: string;
  message?: string;
  status_code?: number; // 0=INVALID, 1=COMPLETED, 2=FAILED, 3=REVERSED
  merchant_reference?: string;
  currency?: string;
  subscription_transaction_info?: {
    account_reference?: string;
    amount?: number;
    first_name?: string;
    last_name?: string;
    correlation_id?: number;
  };
  error?: { error_type?: string; code?: string; message?: string };
  status?: string;
}

/**
 * Get Bearer token (cached with 4 min TTL)
 */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  const { consumerKey, consumerSecret, urls } = pesapalConfig;
  if (!consumerKey || !consumerSecret) {
    throw new Error('PesaPal: PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET must be set');
  }
  const res = await fetch(urls.auth, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });
  const raw = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`PesaPal auth failed: invalid JSON (status ${res.status}). Body: ${raw.slice(0, 200)}`);
  }
  // Token may be at top level or under data/result (docs say top-level "token")
  const token =
    (data.token as string | undefined) ??
    (data.access_token as string | undefined) ??
    ((data.Token as string | undefined)) ??
    (data.data && typeof data.data === 'object' && (data.data as Record<string, unknown>).token as string | undefined) ??
    (data.result && typeof data.result === 'object' && (data.result as Record<string, unknown>).token as string | undefined);
  if (!res.ok || !token || typeof token !== 'string') {
    const msg = (data.message as string | undefined) ?? (data.error as string | undefined) ?? res.statusText;
    const keys = Object.keys(data).length ? ` Response keys: ${Object.keys(data).join(', ')}.` : '';
    const bodyHint = raw.length > 0 && raw.length <= 300 ? ` Body: ${raw}` : raw.length > 300 ? ` Body (truncated): ${raw.slice(0, 300)}...` : '';
    throw new Error(`PesaPal auth failed: ${msg}.${keys}${bodyHint}`);
  }
  cachedToken = token;
  tokenExpiry = Date.now() + TOKEN_TTL_MS;
  return token;
}

/**
 * Register IPN URL (call once; then set PESAPAL_NOTIFICATION_ID in env)
 */
export async function registerIPN(
  url?: string,
  ipnNotificationType: 'GET' | 'POST' = 'POST'
): Promise<{ ipn_id: string; url: string }> {
  const ipnUrl = url ?? getPesapalIpnUrl();
  const token = await getAccessToken();
  const res = await fetch(pesapalConfig.urls.registerIPN, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: ipnNotificationType,
    }),
  });
  const data = (await res.json()) as {
    ipn_id?: string;
    url?: string;
    error?: unknown;
    status?: string;
  };
  if (!res.ok || !data.ipn_id) {
    throw new Error(
      `PesaPal RegisterIPN failed: ${(data as { error?: { message?: string } }).error?.message ?? res.statusText}`
    );
  }
  return { ipn_id: data.ipn_id, url: data.url ?? ipnUrl };
}

/**
 * Submit order request; returns redirect_url for customer to complete payment
 */
export async function submitOrderRequest(params: SubmitOrderParams): Promise<SubmitOrderResult> {
  const token = await getAccessToken();
  const body: Record<string, unknown> = {
    id: params.id,
    currency: params.currency,
    amount: params.amount,
    description: params.description.slice(0, 100),
    callback_url: params.callback_url,
    notification_id: params.notification_id,
    billing_address: params.billing_address,
  };
  if (params.cancellation_url) body.cancellation_url = params.cancellation_url;
  if (params.account_number) body.account_number = params.account_number;
  if (params.subscription_details) body.subscription_details = params.subscription_details;

  const res = await fetch(pesapalConfig.urls.submitOrder, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as SubmitOrderResult & { error?: unknown; message?: string };
  if (!res.ok) {
    throw new Error(
      `PesaPal SubmitOrder failed: ${data.message ?? (data as { error?: { message?: string } }).error?.message ?? res.statusText}`
    );
  }
  if (!data.redirect_url) {
    throw new Error('PesaPal SubmitOrder did not return redirect_url');
  }
  return data;
}

/**
 * Get transaction status by OrderTrackingId (required after callback/IPN)
 */
export async function getTransactionStatus(
  orderTrackingId: string
): Promise<TransactionStatusResult> {
  const token = await getAccessToken();
  const url = `${pesapalConfig.urls.getTransactionStatus}?orderTrackingId=${encodeURIComponent(orderTrackingId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await res.json()) as TransactionStatusResult;
  if (!res.ok) {
    throw new Error(
      `PesaPal GetTransactionStatus failed: ${(data as { message?: string }).message ?? res.statusText}`
    );
  }
  return data;
}

/**
 * Check if transaction status is completed (status_code 1)
 */
export function isTransactionCompleted(result: TransactionStatusResult): boolean {
  return result.status_code === 1 && result.payment_status_description === 'Completed';
}
