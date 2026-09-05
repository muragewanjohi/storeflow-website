import { prisma } from '@/lib/prisma/client';
import type { NotificationType } from '@/lib/notifications/types';
import { JWT } from 'google-auth-library';

interface PushMessagePayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

type PushPlatform = 'android' | 'ios' | 'web';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

const DEFAULT_PREFS = {
  notify_new_order: true,
  notify_pending_payment: true,
  notify_low_stock: true,
  notify_support_ticket: true,
  notify_delivery_updates: true,
};

function shouldSendByPreference(
  notificationType: NotificationType,
  device: {
    notify_new_order: boolean | null;
    notify_pending_payment: boolean | null;
    notify_low_stock: boolean | null;
    notify_support_ticket: boolean | null;
    notify_delivery_updates: boolean | null;
  },
): boolean {
  const prefs = {
    notify_new_order: device.notify_new_order ?? DEFAULT_PREFS.notify_new_order,
    notify_pending_payment: device.notify_pending_payment ?? DEFAULT_PREFS.notify_pending_payment,
    notify_low_stock: device.notify_low_stock ?? DEFAULT_PREFS.notify_low_stock,
    notify_support_ticket: device.notify_support_ticket ?? DEFAULT_PREFS.notify_support_ticket,
    notify_delivery_updates: device.notify_delivery_updates ?? DEFAULT_PREFS.notify_delivery_updates,
  };

  switch (notificationType) {
    case 'new_order':
      return prefs.notify_new_order;
    case 'pending_payment':
    case 'failed_payment':
      return prefs.notify_pending_payment;
    case 'low_stock':
      return prefs.notify_low_stock;
    case 'new_support_ticket':
    case 'support_ticket_reply':
      return prefs.notify_support_ticket;
    case 'delivery_fee_approved':
    case 'delivery_fee_rejected':
      return prefs.notify_delivery_updates;
    default:
      return true;
  }
}

async function sendViaFcm(token: string, payload: PushMessagePayload): Promise<void> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) is not configured');
  }
  if (!clientEmail || !privateKeyRaw) {
    throw new Error('FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required for FCM v1');
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  const jwtClient = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [FCM_SCOPE],
  });
  const tokenResult = await jwtClient.authorize();
  const accessToken = tokenResult.access_token;
  if (!accessToken) {
    throw new Error('Failed to obtain Firebase access token');
  }

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`FCM request failed (${response.status}): ${body}`);
  }
}

async function sendViaApns(token: string, payload: PushMessagePayload): Promise<void> {
  // This supports a relay endpoint path for APNs dispatch.
  // Set APNS_PUSH_URL to an internal service that signs and forwards APNs payloads.
  const apnsUrl = process.env.APNS_PUSH_URL;
  if (!apnsUrl) {
    throw new Error('APNS_PUSH_URL is not configured');
  }

  const authToken = process.env.APNS_AUTH_TOKEN;
  const response = await fetch(apnsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      token,
      alert: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`APNS relay request failed (${response.status}): ${body}`);
  }
}

export async function dispatchNotificationToTenantDevices(params: {
  tenantId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}): Promise<{ attempted: number; sent: number }> {
  const devices = await prisma.mobile_push_devices.findMany({
    where: {
      tenant_id: params.tenantId,
      active: true,
    },
    select: {
      id: true,
      push_token: true,
      platform: true,
      notify_new_order: true,
      notify_pending_payment: true,
      notify_low_stock: true,
      notify_support_ticket: true,
      notify_delivery_updates: true,
    },
    take: 1000,
  });

  let attempted = 0;
  let sent = 0;

  for (const device of devices) {
    if (!shouldSendByPreference(params.type, device)) {
      continue;
    }

    attempted += 1;
    const payload: PushMessagePayload = {
      title: params.title,
      body: params.message,
      data: {
        link: params.link,
        type: params.type,
      },
    };

    try {
      const platform = (device.platform as PushPlatform | string).toLowerCase() as PushPlatform;
      if (platform === 'android' || platform === 'web') {
        await sendViaFcm(device.push_token, payload);
      } else if (platform === 'ios') {
        await sendViaApns(device.push_token, payload);
      } else {
        continue;
      }

      sent += 1;
    } catch (error) {
      console.error('[Mobile Push Dispatch] Failed to send push notification', {
        deviceId: device.id,
        error,
      });
    }
  }

  return { attempted, sent };
}
