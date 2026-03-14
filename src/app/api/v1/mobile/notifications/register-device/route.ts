import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

const registerDeviceSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  token: z.string().min(1, 'token is required'),
  platform: z.enum(['android', 'ios', 'web']),
  appVersion: z.string().optional(),
  deviceName: z.string().optional(),
});

type RegisteredDevice = {
  userId: string;
  deviceId: string;
  token: string;
  platform: 'android' | 'ios' | 'web';
  appVersion?: string;
  deviceName?: string;
  updatedAt: string;
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = registerDeviceSchema.parse(body);

    const nextEntry: RegisteredDevice = {
      userId: user.id,
      deviceId: validated.deviceId,
      token: validated.token,
      platform: validated.platform,
      appVersion: validated.appVersion,
      deviceName: validated.deviceName,
      updatedAt: new Date().toISOString(),
    };

    await prisma.mobile_push_devices.upsert({
      where: {
        tenant_id_user_id_device_id: {
          tenant_id: user.tenant_id,
          user_id: nextEntry.userId,
          device_id: nextEntry.deviceId,
        },
      },
      create: {
        tenant_id: user.tenant_id,
        user_id: nextEntry.userId,
        device_id: nextEntry.deviceId,
        push_token: nextEntry.token,
        platform: nextEntry.platform,
        app_version: nextEntry.appVersion,
        device_name: nextEntry.deviceName,
        active: true,
        last_seen_at: new Date(nextEntry.updatedAt),
      },
      update: {
        push_token: nextEntry.token,
        platform: nextEntry.platform,
        app_version: nextEntry.appVersion,
        device_name: nextEntry.deviceName,
        active: true,
        last_seen_at: new Date(nextEntry.updatedAt),
        updated_at: new Date(nextEntry.updatedAt),
      },
    });

    return NextResponse.json(
      mobileSuccess({
        registered: true,
        deviceId: validated.deviceId,
        platform: validated.platform,
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid device registration payload',
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

    console.error('[Mobile Notifications Register Device] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to register device'),
      { status: 500 },
    );
  }
}
