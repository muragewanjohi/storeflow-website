import { prisma } from '@/lib/prisma/client';
import type { NotificationType } from '@/lib/notifications/types';

interface PushMessagePayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

type PushPlatform = 'android' | 'ios' | 'web';

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
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    return;
  }

  await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
      priority: 'high',
    }),
  });
}

async function sendViaApns(token: string, payload: PushMessagePayload): Promise<void> {
  // This supports a relay endpoint path for APNs dispatch.
  // Set APNS_PUSH_URL to an internal service that signs and forwards APNs payloads.
  const apnsUrl = process.env.APNS_PUSH_URL;
  if (!apnsUrl) {
    return;
  }

  const authToken = process.env.APNS_AUTH_TOKEN;
  await fetch(apnsUrl, {
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
