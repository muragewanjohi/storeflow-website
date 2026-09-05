/**
 * Ujumbe SMS (https://ujumbesms.co.ke) — server-side only.
 * Set UJUMBE_SMS_* env vars; never call from the client.
 */

export function isUjumbeSmsConfigured(): boolean {
  return Boolean(
    process.env.UJUMBE_SMS_X_AUTHORIZATION &&
      process.env.UJUMBE_SMS_EMAIL &&
      process.env.UJUMBE_SMS_SENDER
  );
}

/** Which Ujumbe env vars are missing (for logs only). */
export function getUjumbeSmsMissingEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.UJUMBE_SMS_X_AUTHORIZATION) missing.push('UJUMBE_SMS_X_AUTHORIZATION');
  if (!process.env.UJUMBE_SMS_EMAIL) missing.push('UJUMBE_SMS_EMAIL');
  if (!process.env.UJUMBE_SMS_SENDER) missing.push('UJUMBE_SMS_SENDER');
  return missing;
}

export type UjumbeSmsResult =
  | { ok: true; status: unknown }
  | { ok: false; error: string; status?: unknown };

/**
 * POST /api/messaging — one message per call (wrapped in data[] as per API).
 */
export async function sendUjumbeSms(params: {
  numbers: string;
  message: string;
  sourceId: string;
}): Promise<UjumbeSmsResult> {
  const url = process.env.UJUMBE_SMS_API_URL || 'https://ujumbesms.co.ke/api/messaging';
  const xAuth = process.env.UJUMBE_SMS_X_AUTHORIZATION;
  const email = process.env.UJUMBE_SMS_EMAIL;
  const sender = process.env.UJUMBE_SMS_SENDER;
  const deliveryUrl = process.env.UJUMBE_SMS_DELIVERY_REPORT_URL;

  if (!xAuth || !email || !sender) {
    console.warn('[SMS][Ujumbe] Skipped: missing env', getUjumbeSmsMissingEnv().join(', ') || '(unknown)');
    return { ok: false, error: 'Ujumbe SMS is not configured (missing env vars)' };
  }

  const messageBag: Record<string, string> = {
    numbers: params.numbers,
    message: params.message,
    sender,
    source_id: params.sourceId,
  };
  if (deliveryUrl) {
    messageBag.delivery_report_endpoint = deliveryUrl;
  }

  try {
    console.log('[SMS][Ujumbe] Sending', {
      url,
      sourceId: params.sourceId,
      numbersMasked: maskMsisdnForLog(params.numbers),
      messageLength: params.message.length,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-authorization': xAuth,
        email,
      },
      body: JSON.stringify({
        data: [{ message_bag: messageBag }],
      }),
    });

    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      console.error('[SMS][Ujumbe] HTTP error', { status: res.status, body: json });
      return {
        ok: false,
        error: `Ujumbe HTTP ${res.status}`,
        status: json,
      };
    }

    console.log('[SMS][Ujumbe] Response OK', {
      status: res.status,
      body: json,
    });
    return { ok: true, status: json };
  } catch (e) {
    console.error('[SMS][Ujumbe] Request threw', e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Ujumbe request failed',
    };
  }
}

function maskMsisdnForLog(numbers: string): string {
  return numbers
    .split(',')
    .map((part) => {
      const d = part.replace(/\D/g, '');
      if (d.length >= 8) return `${d.slice(0, 3)}****${d.slice(-4)}`;
      return '****';
    })
    .join(',');
}
