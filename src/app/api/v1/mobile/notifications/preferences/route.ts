import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

const preferenceSchema = z.object({
  newOrder: z.boolean().optional(),
  pendingPayment: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  supportTicket: z.boolean().optional(),
  deliveryUpdates: z.boolean().optional(),
});

type NotificationPreferences = {
  newOrder: boolean;
  pendingPayment: boolean;
  lowStock: boolean;
  supportTicket: boolean;
  deliveryUpdates: boolean;
};

const deviceParamSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const { deviceId } = deviceParamSchema.parse({
      deviceId: searchParams.get('deviceId') ?? undefined,
    });

    const device = await prisma.mobile_push_devices.findUnique({
      where: {
        tenant_id_user_id_device_id: {
          tenant_id: user.tenant_id,
          user_id: user.id,
          device_id: deviceId,
        },
      },
      select: {
        id: true,
        active: true,
        notify_new_order: true,
        notify_pending_payment: true,
        notify_low_stock: true,
        notify_support_ticket: true,
        notify_delivery_updates: true,
      },
    });

    if (!device) {
      return NextResponse.json(
        mobileError('NOT_FOUND', 'Device not registered'),
        { status: 404 },
      );
    }

    const parsed: NotificationPreferences = {
      newOrder: device.notify_new_order ?? true,
      pendingPayment: device.notify_pending_payment ?? true,
      lowStock: device.notify_low_stock ?? true,
      supportTicket: device.notify_support_ticket ?? true,
      deliveryUpdates: device.notify_delivery_updates ?? true,
    };

    return NextResponse.json(
      mobileSuccess({
        deviceId,
        active: device.active ?? true,
        preferences: parsed,
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile Notifications Preferences GET] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch notification preferences'),
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const { deviceId } = deviceParamSchema.parse({
      deviceId: searchParams.get('deviceId') ?? undefined,
    });
    const body = await request.json();
    const patch = preferenceSchema.parse(body);

    const existing = await prisma.mobile_push_devices.findUnique({
      where: {
        tenant_id_user_id_device_id: {
          tenant_id: user.tenant_id,
          user_id: user.id,
          device_id: deviceId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        mobileError('NOT_FOUND', 'Device not registered'),
        { status: 404 },
      );
    }

    const current: NotificationPreferences = {
      newOrder: existing.notify_new_order ?? true,
      pendingPayment: existing.notify_pending_payment ?? true,
      lowStock: existing.notify_low_stock ?? true,
      supportTicket: existing.notify_support_ticket ?? true,
      deliveryUpdates: existing.notify_delivery_updates ?? true,
    };
    const next = { ...current, ...patch };

    await prisma.mobile_push_devices.update({
      where: { id: existing.id },
      data: {
        notify_new_order: next.newOrder,
        notify_pending_payment: next.pendingPayment,
        notify_low_stock: next.lowStock,
        notify_support_ticket: next.supportTicket,
        notify_delivery_updates: next.deliveryUpdates,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(
      mobileSuccess({
        deviceId,
        preferences: next,
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid preferences payload',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile Notifications Preferences PUT] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to update notification preferences'),
      { status: 500 },
    );
  }
}
