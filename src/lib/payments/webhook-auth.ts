import type { NextRequest } from 'next/server';

function getRequiredWebhookToken(): string {
  return process.env.PAYMENT_WEBHOOK_TOKEN?.trim() || '';
}

export function buildWebhookUrlWithToken(baseUrl: string): string {
  const token = getRequiredWebhookToken();
  if (!token) {
    return baseUrl;
  }

  const url = new URL(baseUrl);
  if (!url.searchParams.has('token')) {
    url.searchParams.set('token', token);
  }
  return url.toString();
}

export function verifyPaymentWebhookRequest(request: NextRequest): {
  ok: boolean;
  status: number;
  error?: string;
} {
  const expectedToken = getRequiredWebhookToken();
  if (!expectedToken) {
    return {
      ok: false,
      status: 503,
      error: 'Payment webhook token is not configured',
    };
  }

  const queryToken = request.nextUrl.searchParams.get('token');
  const headerToken = request.headers.get('x-payment-webhook-token');
  const receivedToken = queryToken || headerToken || '';

  if (!receivedToken || receivedToken !== expectedToken) {
    return {
      ok: false,
      status: 401,
      error: 'Invalid webhook token',
    };
  }

  return { ok: true, status: 200 };
}
