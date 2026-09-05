import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';

const TIKTOK_PIXEL_CODE =
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || 'D6N7BVBC77UE81ODK9A0';
const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;
const TIKTOK_EVENTS_API_URL =
  process.env.TIKTOK_EVENTS_API_URL ??
  'https://business-api.tiktok.com/open_api/v1.3/pixel/track/';
const TIKTOK_EVENTS_API_DEBUG = process.env.TIKTOK_EVENTS_API_DEBUG === 'true';

interface TikTokServerEventInput {
  request: NextRequest;
  event: string;
  eventId: string;
  properties?: Record<string, unknown>;
  email?: string | null;
  phoneNumber?: string | null;
  externalId?: string | null;
}

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function normalizePhone(value: string): string {
  return value.replace(/\s+/g, '');
}

function getIpAddress(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim();
  }
  return request.headers.get('x-real-ip') ?? undefined;
}

function maskToken(token: string): string {
  if (token.length <= 8) return '********';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export async function sendTikTokServerEvent({
  request,
  event,
  eventId,
  properties,
  email,
  phoneNumber,
  externalId,
}: Readonly<TikTokServerEventInput>): Promise<void> {
  if (!TIKTOK_PIXEL_CODE || !TIKTOK_ACCESS_TOKEN) {
    return;
  }

  const ip = getIpAddress(request);
  const userAgent = request.headers.get('user-agent') ?? undefined;
  const ttp = request.cookies.get('_ttp')?.value;

  const user: Record<string, string> = {};
  if (email) user.email = sha256(email);
  if (phoneNumber) user.phone_number = sha256(normalizePhone(phoneNumber));
  if (externalId) user.external_id = sha256(externalId);
  if (ttp) user.ttp = ttp;

  const payload = {
    pixel_code: TIKTOK_PIXEL_CODE,
    event,
    event_id: eventId,
    timestamp: new Date().toISOString(),
    context: {
      ip,
      user_agent: userAgent,
      user: Object.keys(user).length > 0 ? user : undefined,
      page: {
        url: request.url,
      },
    },
    properties,
  };

  try {
    if (TIKTOK_EVENTS_API_DEBUG && process.env.NODE_ENV !== 'production') {
      console.log('[TikTok Events API] Sending event', {
        endpoint: TIKTOK_EVENTS_API_URL,
        pixel_code: TIKTOK_PIXEL_CODE,
        access_token: maskToken(TIKTOK_ACCESS_TOKEN),
        event,
        event_id: eventId,
      });
    }

    const response = await fetch(TIKTOK_EVENTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': TIKTOK_ACCESS_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('[TikTok Events API] Failed to send event', {
        status: response.status,
        event,
        body,
      });
      return;
    }

    if (TIKTOK_EVENTS_API_DEBUG && process.env.NODE_ENV !== 'production') {
      const body = await response.text().catch(() => '');
      console.log('[TikTok Events API] Event accepted', {
        status: response.status,
        event,
        body,
      });
    }
  } catch (error) {
    console.error('[TikTok Events API] Error sending event:', error);
  }
}
